// Fixed test data for #2 (filter) and #1 (recommend). Same data in every test, so expected results can be worked out by hand.
// IDP ids are 1..6 because every test starts with a fresh in-memory database.
//
//   IDP  budget  size  duration   style         rooms
//   1    20000    800   3 months   Modern        Kitchen, Living Room
//   2    35000   1100   6 months   Scandinavian  Bedroom, Living Room
//   3    50000   1500   6 months   Modern        Kitchen, Bathroom
//   4    15000    600   2 months   Industrial    Bedroom
//   5    80000   2200   12 months  Scandinavian  Kitchen, Bedroom, Living Room
//   6    25000    900   4 months   Minimalism    Balcony
const IDP = require('../backend/entity/IDP');
const Tag = require('../backend/entity/Tag');
const UserAccount = require('../backend/entity/UserAccount');
const { createTestDatabase, profileId } = require('./helpers');

const TAGS = [
  ['Modern', 'style'], ['Scandinavian', 'style'], ['Industrial', 'style'], ['Minimalism', 'style'],
  ['Kitchen', 'room'], ['Bedroom', 'room'], ['Living Room', 'room'], ['Bathroom', 'room'], ['Balcony', 'room'],
];

const IDPS = [
  { budget: 20000, houseSize: 800, duration: '3 months', style: 'Modern', rooms: ['Kitchen', 'Living Room'] },
  { budget: 35000, houseSize: 1100, duration: '6 months', style: 'Scandinavian', rooms: ['Bedroom', 'Living Room'] },
  { budget: 50000, houseSize: 1500, duration: '6 months', style: 'Modern', rooms: ['Kitchen', 'Bathroom'] },
  { budget: 15000, houseSize: 600, duration: '2 months', style: 'Industrial', rooms: ['Bedroom'] },
  { budget: 80000, houseSize: 2200, duration: '12 months', style: 'Scandinavian', rooms: ['Kitchen', 'Bedroom', 'Living Room'] },
  { budget: 25000, houseSize: 900, duration: '4 months', style: 'Minimalism', rooms: ['Balcony'] },
];

/** Builds the database with 9 tags, 6 IDPs, 1 designer and 3 customers (no favourites yet). */
function buildTestData() {
  const db = createTestDatabase();
  const insertTag = db.prepare('INSERT INTO tag (name, type) VALUES (?, ?)');
  for (const [name, type] of TAGS) insertTag.run(name, type);

  const userAccount = new UserAccount(db);
  const designerId = userAccount.createUserAccount({
    username: 'designer1', password: 'pass1234', profileId: profileId(db, 'Interior Designer'),
  });
  const customers = {};
  for (const name of ['c1', 'c2', 'c3']) {
    customers[name] = userAccount.createUserAccount({
      username: name, password: 'pass1234', profileId: profileId(db, 'Customer'),
    });
  }

  const idp = new IDP(db);
  const tag = new Tag(db);
  IDPS.forEach((data, i) => {
    const tags = tag.findByNames([data.style, ...data.rooms]);
    idp.createIDP(designerId, { title: `IDP ${i + 1}`, description: `Test IDP ${i + 1}`, ...data }, tags);
  });
  return { db, designerId, customers };
}

/** Test setup only: the "save to favourites" feature is not part of #1, so insert the rows directly. */
function addFavourite(db, userId, idpId) {
  db.prepare('INSERT INTO favourite (user_id, idp_id) VALUES (?, ?)').run(userId, idpId);
}

/** ids of a list of IDP objects, sorted, so tests do not depend on the order. */
const sortedIds = (idps) => idps.map((i) => i.id).sort((a, b) => a - b);

module.exports = { buildTestData, addFavourite, sortedIds };
