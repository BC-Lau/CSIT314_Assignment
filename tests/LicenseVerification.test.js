const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../backend/app');
const UserAccount = require('../backend/entity/UserAccount');
const VerificationApp = require('../backend/entity/VerificationApp');
const { createTestDatabase, profileId } = require('./helpers');

async function setup(t) {
  const db = createTestDatabase();
  const accounts = new UserAccount(db);
  const addUser = (username, profile) => accounts.createUserAccount({
    username,
    password: 'pass1234',
    profileId: profileId(db, profile)
  });
  const designerId = addUser('designer', 'Interior Designer');
  const secondDesignerId = addUser('designer2', 'Interior Designer');
  const adminId = addUser('admin', 'User Admin');
  const customerId = addUser('customer', 'Customer');
  const server = createApp(db).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, method = 'GET', userId, body) => {
    const headers = {};
    if (userId) headers['X-User-Id'] = String(userId);
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (/^https?:\/\//i.test(body?.documentUrl ?? '')) {
      body = {
        companyName: body.companyName,
        uen: body.uen,
        licenseNumber: body.licenseNumber,
        licenseFile: {
          name: 'license.pdf',
          mimeType: 'application/pdf',
          data: Buffer.from('%PDF-1.4\nlicense test file\n%%EOF').toString('base64')
        }
      };
    }
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    return { status: response.status, body: await response.json() };
  };
  return { db, designerId, secondDesignerId, adminId, customerId, request };
}

test('designer submits license, admin approves, and IDP publishing unlocks', async (t) => {
  const { db, designerId, adminId, customerId, request } = await setup(t);
  t.after(() => db.close());

  const tags = await request('/api/idps/tag-options');
  const idpData = {
    title: 'Verified studio project',
    description: 'A completed verified project',
    style: tags.body.styles[0],
    type: [tags.body.types[0]]
  };
  const blocked = await request('/api/idps', 'POST', designerId, idpData);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.message, 'Only verified Interior Designers can interact with customers or publish IDPs.');

  const initialStatus = await request('/api/designer/verification', 'GET', designerId);
  assert.equal(initialStatus.body.status, 'Unverified');
  const submitted = await request('/api/designer/verification/submit', 'POST', designerId, {
    companyName: 'North Studio',
    uen: '202400001A',
    licenseNumber: 'ID-12345',
    documentUrl: 'https://example.test/license.pdf'
  });
  assert.equal(submitted.status, 201);
  assert.equal(submitted.body.status, 'Pending Review');

  const pendingAsDesigner = await request('/api/admin/verifications/pending', 'GET', designerId);
  const pendingAsCustomer = await request('/api/admin/verifications/pending', 'GET', customerId);
  const pendingUnauthenticated = await request('/api/admin/verifications/pending');
  assert.equal(pendingAsDesigner.status, 403);
  assert.equal(pendingAsCustomer.status, 403);
  assert.equal(pendingUnauthenticated.status, 401);

  const pending = await request('/api/admin/verifications/pending', 'GET', adminId);
  assert.equal(pending.status, 200);
  assert.equal(pending.body.applications[0].licenseNumber, 'ID-12345');
  assert.equal(pending.body.applications[0].uen, '202400001A');
  const appId = pending.body.applications[0].appId;
  assert.equal((await request(`/api/admin/verifications/${appId}`, 'GET', customerId)).status, 403);
  assert.equal((await request(`/api/admin/verifications/${appId}/approve`, 'POST', designerId)).status, 403);
  assert.equal((await request(`/api/admin/verifications/${appId}/reject`, 'POST', customerId, { reason: 'No' })).status, 403);
  const approved = await request(`/api/admin/verifications/${appId}/approve`, 'POST', adminId);
  assert.equal(approved.status, 200);

  const verifiedStatus = await request('/api/designer/verification', 'GET', designerId);
  assert.equal(verifiedStatus.body.status, 'Verified');
  assert.equal(db.prepare('SELECT is_verified, has_verified_badge FROM user_account WHERE id = ?').get(designerId).is_verified, 1);
  const published = await request('/api/idps', 'POST', designerId, idpData);
  assert.equal(published.status, 201);
  assert.equal(published.body.success, true);
});

test('admin rejection reason is retained and designer can resubmit', async (t) => {
  const { db, secondDesignerId, adminId, request } = await setup(t);
  t.after(() => db.close());

  const submitted = await request('/api/designer/verification/submit', 'POST', secondDesignerId, {
    companyName: 'South Studio',
    uen: '202400002B',
    licenseNumber: 'ID-67890',
    documentUrl: 'https://example.test/license-2.pdf'
  });
  assert.equal(submitted.status, 201);
  const appId = submitted.body.application.appId;
  const rejected = await request(`/api/admin/verifications/${appId}/reject`, 'POST', adminId, { reason: 'The submitted document has expired.' });
  assert.equal(rejected.status, 200);

  const status = await request('/api/designer/verification', 'GET', secondDesignerId);
  assert.equal(status.body.status, 'Rejected');
  assert.equal(status.body.application.rejectionReason, 'The submitted document has expired.');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM notification WHERE recipient_id = ?').get(secondDesignerId).count, 1);

  const resubmitted = await request('/api/designer/verification/submit', 'POST', secondDesignerId, {
    companyName: 'South Studio',
    uen: '202400002B',
    licenseNumber: 'ID-67890-NEW',
    documentUrl: 'https://example.test/renewed-license.pdf'
  });
  assert.equal(resubmitted.status, 201);
  assert.equal(resubmitted.body.application.appId, appId);
  assert.equal(resubmitted.body.application.status, 'Pending');
  assert.equal(resubmitted.body.application.rejectionReason, null);
});

test('license submission requires a designer account and valid required fields', async (t) => {
  const { db, designerId, customerId, request } = await setup(t);
  t.after(() => db.close());

  const forbidden = await request('/api/designer/verification/submit', 'POST', customerId, {});
  assert.equal(forbidden.status, 403);
  const unauthenticated = await request('/api/designer/verification/submit', 'POST', customerId + 999, {});
  assert.equal(unauthenticated.status, 401);
  const missingFields = await request('/api/designer/verification/submit', 'POST', designerId, {});
  assert.equal(missingFields.status, 400);
  const invalidUrl = await request('/api/designer/verification/submit', 'POST', designerId, {
    companyName: 'North Studio',
    uen: '202400001A',
    licenseNumber: 'ID-12345',
    documentUrl: 'javascript:alert(1)'
  });
  assert.equal(invalidUrl.status, 400);
});

test('existing verification tables gain rejection reason storage', (t) => {
  const db = createTestDatabase();
  t.after(() => db.close());
  db.exec(`CREATE TABLE verification_application (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    designer_id INTEGER NOT NULL REFERENCES user_account(id),
    company_name TEXT NOT NULL,
    uen TEXT NOT NULL,
    license_number TEXT NOT NULL,
    document_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    submitted_date TEXT NOT NULL
  )`);

  VerificationApp.createTableIfNeeded(db);
  const columns = db.prepare('PRAGMA table_info(verification_application)').all().map((column) => column.name);
  assert.ok(columns.includes('rejection_reason'));
});
