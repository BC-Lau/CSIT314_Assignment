// Test data for user stories #1, #2 and #6

//   IDP  budget  size  duration   style         types
//   1    20000    800   3 months   Modern        Kitchen, Living Room
//   2    35000   1100   6 months   Scandinavian  Bedroom, Living Room
//   3    50000   1500   6 months   Modern        Kitchen, Bathroom
//   4    15000    600   2 months   Industrial    Bedroom
//   5    80000   2200   12 months  Scandinavian  Kitchen, Bedroom, Living Room
//   6    25000    900   4 months   Minimalism    Balcony
const IDP = require('../backend/entity/IDP');
const UserAccount = require('../backend/entity/UserAccount');
const { createTestDatabase, profileId } = require('./helpers');

const IDPS = [
  { budget: 20000, houseSize: 800, duration: '3 months', style: 'Modern', type: ['Kitchen', 'Living Room'] },
  { budget: 35000, houseSize: 1100, duration: '6 months', style: 'Scandinavian', type: ['Bedroom', 'Living Room'] },
  { budget: 50000, houseSize: 1500, duration: '6 months', style: 'Modern', type: ['Kitchen', 'Bathroom'] },
  { budget: 15000, houseSize: 600, duration: '2 months', style: 'Industrial', type: ['Bedroom'] },
  { budget: 80000, houseSize: 2200, duration: '12 months', style: 'Scandinavian', type: ['Kitchen', 'Bedroom', 'Living Room'] },
  { budget: 25000, houseSize: 900, duration: '4 months', style: 'Minimalism', type: ['Balcony'] },
];

// Builds the database with 6 IDPs, 1 designer and 3 customers, no favourites yet
function buildTestData() {
  const db = createTestDatabase();

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
  IDPS.forEach((data, i) => {
    idp.createIDP(designerId, { title: `IDP ${i + 1}`, description: `Test IDP ${i + 1}`, visibility: 'public', ...data });
  });
  return { db, designerId, customers };
}

// Test setup: inserts a favourite directly, so tests for #1 do not depend on the #6 save code
function addFavourite(db, userId, idpId) {
  db.prepare('INSERT INTO favourite (user_id, idp_id) VALUES (?, ?)').run(userId, idpId);
}

const sortedIds = (idps) => idps.map((i) => i.id).sort((a, b) => a - b);
const userOf = (db, userId) => new UserAccount(db).findById(userId);

module.exports = { buildTestData, addFavourite, sortedIds, userOf };