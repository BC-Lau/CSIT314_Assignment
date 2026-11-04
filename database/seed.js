// Seed script: rebuilds database/app.db with random (but repeatable) test data.
//   npm run seed
// All seeded accounts use the password: password123
const fs = require('node:fs');
const path = require('node:path');
const { createDatabase } = require('./db');
const { hashPassword } = require('../backend/utils/password');
const presetTags = require('./presetTags');

const DB_FILE = path.join(__dirname, 'app.db');
const PASSWORD = 'password123';
const COUNTS = { designers: 40, customers: 120, managers: 5, admins: 3, idps: 150, contacts: 400 };

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

db.exec('BEGIN');

// Tags
const insertTag = db.prepare('INSERT INTO tag (name, type, keywords) VALUES (?, ?, ?)');
for (const type of ['style', 'room']) {
  for (const [name, keywords] of Object.entries(presetTags[type])) insertTag.run(name, type, JSON.stringify(keywords));
}
const tagId = Object.fromEntries(db.prepare('SELECT id, name FROM tag').all().map((t) => [t.name, t.id]));

// Accounts (fixed demo accounts first, then random ones)
const insertUser = db.prepare('INSERT INTO user_account (username, password_hash, email, profile_id, created_at) VALUES (?, ?, ?, ?, ?)');
const users = { 'User Admin': [], 'Interior Designer': [], 'Customer': [], 'Platform Manager': [] };
function addUser(username, profile) {
  const id = Number(insertUser.run(username, hashPassword(PASSWORD), `${username}@example.com`, profileId(profile), daysAgo(400)).lastInsertRowid);
  users[profile].push(id);
}
addUser('admin', 'User Admin');
addUser('designer1', 'Interior Designer');
addUser('customer1', 'Customer');
addUser('manager1', 'Platform Manager');
const used = new Set(['admin', 'designer1', 'customer1', 'manager1']);
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

// IDPs: description mentions keywords of its own style / rooms, so #23 keyword matching has something to find
const insertIDP = db.prepare(`INSERT INTO idp (designer_id, title, description, budget, house_size, duration, visibility, created_at)
                              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
const linkTag = db.prepare('INSERT INTO idp_tag (idp_id, tag_id) VALUES (?, ?)');
const styles = Object.keys(presetTags.style);
const rooms = Object.keys(presetTags.room);
const idps = [];
for (let i = 0; i < COUNTS.idps; i++) {
  const style = pick(styles);
  const roomList = pickSome(rooms, int(1, 4));
  const home = pick(HOMES);
  const area = pick(AREAS);
  const title = `${style} ${home} in ${area}`;
  const description =
    `A ${pick(presetTags.style[style])} makeover for a ${home} in ${area}. ` +
    `We redesigned the ${roomList.map((r) => pick(presetTags.room[r])).join(', ')} ` +
    `with ${pick(['plenty of storage', 'better lighting', 'an open layout', 'natural materials', 'a calm colour palette'])}.`;
  const createdAt = daysAgo(365);
  const id = Number(insertIDP.run(
    pick(users['Interior Designer']), title, description,
    int(15, 250) * 1000, int(400, 3000), `${int(4, 20)} weeks`,
    rand() < 0.8 ? 'public' : 'private', createdAt
  ).lastInsertRowid);
  linkTag.run(id, tagId[style]);
  for (const r of roomList) linkTag.run(id, tagId[r]);
  idps.push(id);
}

// Contact requests (#25): spread over the last 90 days
const insertContact = db.prepare('INSERT INTO contact_request (customer_id, designer_id, idp_id, message, created_at) VALUES (?, ?, ?, ?, ?)');
const idpOwner = db.prepare('SELECT designer_id FROM idp WHERE id = ?');
for (let i = 0; i < COUNTS.contacts; i++) {
  const idpId = pick(idps);
  insertContact.run(pick(users.Customer), idpOwner.get(idpId).designer_id, idpId,
    pick(['Hi, can I get a quote?', 'Love this design!', 'Are you available next month?', 'Please contact me.']), daysAgo(90));
}

// Favourites (#1): customer1 always has some favourites 
// and the other customers save 0 to 8 IDPs each.
const insertFavourite = db.prepare('INSERT OR IGNORE INTO favourite (user_id, idp_id, saved_at) VALUES (?, ?, ?)');
users.Customer.forEach((customerId, index) => {
  const howMany = index === 0 ? 6 : int(0, 8);
  for (const idpId of pickSome(idps, howMany)) insertFavourite.run(customerId, idpId, daysAgo(60));
});

db.exec('COMMIT');

const count = (t) => db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
console.log(`Seeded database/app.db
  user_account    ${count('user_account')}
  tag             ${count('tag')}
  idp             ${count('idp')}
  idp_tag         ${count('idp_tag')}
  contact_request ${count('contact_request')}
  favourite       ${count('favourite')}
Demo logins (password: ${PASSWORD}): admin, designer1, customer1, manager1`);
db.close();
