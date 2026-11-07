// Seed script: rebuilds database/app.db with random (but repeatable) test data.
//   npm run seed
// All seeded accounts use the password: password123
const fs = require('node:fs');
const path = require('node:path');
const { createDatabase } = require('./db');
const { hashPassword } = require('../backend/utils/password');
const { loadPresetTags } = require('./presetTags');

const DB_FILE = path.join(__dirname, 'app.db');
const PASSWORD = 'password123';
const COUNTS = { designers: 40, customers: 120, managers: 5, admins: 3, idps: 150, contacts: 2000 };

// ---------- repeatable random numbers (same data every run) ----------
let seed = 314;
function rand() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (list) => list[int(0, list.length - 1)];
const pickSome = (list, n) => [...list].sort(() => rand() - 0.5).slice(0, n);
const daysAgo = (maxDays) => {
  const d = new Date(Date.now() - rand() * maxDays * 86400000);
  return d.toISOString().replace('T', ' ').slice(0, 19);
};

const FIRST = ['alex', 'ben', 'chloe', 'daniel', 'emma', 'farah', 'grace', 'hui', 'ivan', 'jia', 'kai', 'liam',
  'mei', 'nur', 'oliver', 'priya', 'qing', 'rachel', 'sean', 'tan', 'uma', 'victor', 'wei', 'xin', 'yuki', 'zara'];
const HOMES = ['4-room HDB', '5-room HDB', '3-room HDB', 'condo', 'landed terrace', 'executive maisonette', 'studio apartment'];
const AREAS = ['Tampines', 'Punggol', 'Bishan', 'Jurong East', 'Toa Payoh', 'Sengkang', 'Clementi', 'Woodlands', 'Bukit Timah', 'Queenstown'];

// ---------- rebuild ----------
if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
const db = createDatabase(DB_FILE);
const profileId = (name) => db.prepare('SELECT id FROM user_profile WHERE name = ?').get(name).id;

const presetTags = loadPresetTags();

db.exec('BEGIN');

// Accounts (fixed demo accounts first, then random ones)
const insertUser = db.prepare('INSERT INTO user_account (username, password_hash, email, profile_id, created_at) VALUES (?, ?, ?, ?, ?)');
const users = { 'User Admin': [], 'Interior Designer': [], 'Customer': [], 'Platform Manager': [] };
function addUser(username, profile) {
  const id = Number(insertUser.run(username, hashPassword(PASSWORD), `${username}@example.com`, profileId(profile), daysAgo(2000)).lastInsertRowid);
  users[profile].push(id);
}
addUser('admin', 'User Admin');
addUser('designer1', 'Interior Designer');
addUser('customer1', 'Customer');
addUser('customer2', 'Customer');
addUser('manager1', 'Platform Manager');
const used = new Set(['admin', 'designer1', 'customer1', 'customer2', 'manager1']);
function uniqueName(prefix) {
  let name;
  do { name = `${pick(FIRST)}_${prefix}${int(10, 999)}`; } while (used.has(name));
  used.add(name);
  return name;
}
for (let i = 0; i < COUNTS.admins - 1; i++) addUser(uniqueName('admin'), 'User Admin');
for (let i = 0; i < COUNTS.designers - 1; i++) addUser(uniqueName('design'), 'Interior Designer');
for (let i = 0; i < COUNTS.customers - 1; i++) addUser(uniqueName('cust'), 'Customer');
for (let i = 0; i < COUNTS.managers - 1; i++) addUser(uniqueName('pm'), 'Platform Manager');

// IDPs: description mentions keywords of its own style / types, so #23 keyword matching has something to find
const insertIDP = db.prepare(`INSERT INTO idp (designer_id, title, description, budget, house_size, duration, visibility, style, type, created_at)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const styles = Object.keys(presetTags.style);
const types = Object.keys(presetTags.type);
const idps = [];
for (let i = 0; i < COUNTS.idps; i++) {
  const style = pick(styles);
  const typeList = pickSome(types, int(1, 4));
  const home = pick(HOMES);
  const area = pick(AREAS);
  const title = `${style} ${home} in ${area}`;
  const description =
    `A ${pick([style.toLowerCase(), ...presetTags.style[style]])} makeover for a ${home} in ${area}. ` +
    `We redesigned the ${typeList.map((t) => pick([t.toLowerCase(), ...presetTags.type[t]])).join(', ')} ` +
    `with ${pick(['plenty of storage', 'better lighting', 'an open layout', 'natural materials', 'a calm colour palette'])}.`;
  const createdAt = daysAgo(1825); // last 5 years (for the #25 trend chart)
  const id = Number(insertIDP.run(
    pick(users['Interior Designer']), title, description,
    int(15, 250) * 1000, int(400, 3000), `${int(4, 20)} weeks`,
    rand() < 0.8 ? 'public' : 'private', style, JSON.stringify(typeList), createdAt
  ).lastInsertRowid);
  idps.push(id);
}

// Contact requests (#25): any day between the IDP being posted and today,
// so newer months have more contacts (more IDPs online)
const insertContact = db.prepare('INSERT INTO contact_request (customer_id, designer_id, idp_id, message, created_at) VALUES (?, ?, ?, ?, ?)');
const idpInfo = db.prepare('SELECT designer_id, created_at FROM idp WHERE id = ?');
for (let i = 0; i < COUNTS.contacts; i++) {
  const idpId = pick(idps);
  const idp = idpInfo.get(idpId);
  const idpAgeDays = (Date.now() - Date.parse(`${idp.created_at.replace(' ', 'T')}Z`)) / 86400000;
  insertContact.run(pick(users.Customer), idp.designer_id, idpId,
    pick(['Hi, can I get a quote?', 'Love this design!', 'Are you available next month?', 'Please contact me.']), daysAgo(idpAgeDays));
}

// Favourites (#1): customer1 always has some favourites, 
// customer2 has none (to demo #6 saving from scratch),
// and the other customers save 0 to 8 IDPs each.
const insertFavourite = db.prepare('INSERT OR IGNORE INTO favourite (user_id, idp_id, saved_at) VALUES (?, ?, ?)');
users.Customer.forEach((customerId, index) => {
  const howMany = index === 0 ? 6 : index === 1 ? 0 : int(0, 8);
  for (const idpId of pickSome(idps, howMany)) insertFavourite.run(customerId, idpId, daysAgo(60));
});

const { seedMedia } = require('./seedMedia');
const seededMedia = seedMedia(db);
console.log('Seeded demo media:', seededMedia);

db.exec('COMMIT');

const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log(`Seeded database/app.db
  user_account    ${count('user_account')}
  idp             ${count('idp')}
  contact_request ${count('contact_request')}
  favourite       ${count('favourite')}
Demo logins (password: ${PASSWORD}): admin, designer1, customer1, customer2, manager1`);
db.close();
