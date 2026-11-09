const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDatabase } = require('../database/db');
const { createApp } = require('../backend/app');

test('Platform Managers can generate daily, weekly, monthly and yearly activity reports', async () => {
  const db = createDatabase(':memory:');
  const app = createApp(db);
  const profileId = (name) =>
    db.prepare('SELECT id FROM user_profile WHERE name = ?').get(name).id;
  const addUser = (username, profile, createdAt) =>
    Number(db.prepare(`
      INSERT INTO user_account (username, password_hash, profile_id, created_at)
      VALUES (?, 'test', ?, ?)
    `).run(username, profileId(profile), createdAt).lastInsertRowid);

  const managerId = addUser('report_manager', 'Platform Manager', '2026-01-01 00:00:00');
  const customerId = addUser('report_customer', 'Customer', '2026-03-30 10:00:00');
  const designerId = addUser('report_designer', 'Interior Designer', '2026-03-30 11:00:00');
  const outsideCustomerId = addUser('outside_customer', 'Customer', '2026-04-06 00:00:00');
  const idpId = Number(db.prepare(`
    INSERT INTO idp (designer_id, title, description, style, type, created_at)
    VALUES (?, 'Report project', 'A test project', 'Modern', '["Kitchen"]', '2026-04-01 09:00:00')
  `).run(designerId).lastInsertRowid);
  db.prepare(`
    INSERT INTO contact_request (customer_id, designer_id, idp_id, message, created_at)
    VALUES (?, ?, ?, 'Discuss renovation', '2026-04-05 09:00:00')
  `).run(customerId, designerId, idpId);
  db.prepare(`
    INSERT INTO contact_request (customer_id, designer_id, message, created_at)
    VALUES (?, ?, 'Outside the week', '2026-04-06 09:00:00')
  `).run(outsideCustomerId, designerId);

  const scheduleId = Number(db.prepare(
    'INSERT INTO availability_schedule (designer_id) VALUES (?)'
  ).run(designerId).lastInsertRowid);
  const slotId = Number(db.prepare(`
    INSERT INTO consultation_slot (schedule_id, start_time, end_time, status)
    VALUES (?, '2026-04-20T10:00:00.000Z', '2026-04-20T11:00:00.000Z', 'booked')
  `).run(scheduleId).lastInsertRowid);
  db.prepare(`
    INSERT INTO consultation_request (slot_id, customer_id, message, status, created_at, cancelled_at)
    VALUES (?, ?, 'Initial booking', 'cancelled', '2026-03-31 08:00:00', '2026-04-02 12:00:00')
  `).run(slotId, customerId);

  const interaction = db.prepare(`
    INSERT INTO interaction_log (customer_id, idp_id, interaction_type, timestamp)
    VALUES (?, ?, ?, ?)
  `);
  interaction.run(customerId, idpId, 'view', '2026-04-03 10:00:00');
  interaction.run(customerId, idpId, 'favourite', '2026-04-04 10:00:00');
  interaction.run(outsideCustomerId, idpId, 'view', '2026-04-06 10:00:00');

  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const baseURL = `http://127.0.0.1:${server.address().port}/api/metrics/reports`;
    async function request(period, date, userId = managerId) {
      const response = await fetch(
        `${baseURL}?period=${encodeURIComponent(period)}&date=${encodeURIComponent(date)}`,
        { headers: userId ? { 'X-User-Id': String(userId) } : {} }
      );
      return { status: response.status, data: await response.json() };
    }

    const week = await request('weekly', '2026-04-01');
    assert.equal(week.status, 200);
    assert.equal(week.data.report.startDate, '2026-03-30');
    assert.equal(week.data.report.endDate, '2026-04-05');
    const weekMetrics = Object.fromEntries(week.data.report.metrics.map(({ key, count }) => [key, count]));
    assert.deepEqual(weekMetrics, {
      newAccounts: 2,
      newCustomers: 1,
      newDesigners: 1,
      newIDPs: 1,
      customerContacts: 1,
      consultationsBooked: 1,
      consultationsCancelled: 1,
      idpViews: 1,
      idpFavourites: 1
    });

    const daily = await request('daily', '2026-04-02');
    assert.equal(daily.status, 200);
    assert.equal(daily.data.report.startDate, '2026-04-02');
    assert.equal(daily.data.report.endDate, '2026-04-02');
    assert.equal(daily.data.report.metrics.find((metric) => metric.key === 'consultationsCancelled').count, 1);
    assert.equal(daily.data.report.metrics.find((metric) => metric.key === 'newIDPs').count, 0);

    const month = await request('monthly', '2026-04-15');
    assert.equal(month.status, 200);
    assert.equal(month.data.report.startDate, '2026-04-01');
    assert.equal(month.data.report.endDate, '2026-04-30');
    assert.equal(month.data.report.metrics.find((metric) => metric.key === 'newAccounts').count, 1);
    assert.equal(month.data.report.metrics.find((metric) => metric.key === 'newCustomers').count, 1);
    assert.equal(month.data.report.metrics.find((metric) => metric.key === 'customerContacts').count, 2);

    const year = await request('yearly', '2026-04-15');
    assert.equal(year.status, 200);
    assert.equal(year.data.report.startDate, '2026-01-01');
    assert.equal(year.data.report.endDate, '2026-12-31');
    assert.equal(year.data.report.metrics.find((metric) => metric.key === 'newAccounts').count, 4);
    assert.equal(year.data.report.metrics.find((metric) => metric.key === 'customerContacts').count, 2);

    const leapYear = await request('yearly', '2024-02-29');
    assert.equal(leapYear.status, 200);
    assert.equal(leapYear.data.report.startDate, '2024-01-01');
    assert.equal(leapYear.data.report.endDate, '2024-12-31');

    assert.equal((await request('daily', '2026-04-02', null)).status, 401);
    assert.equal((await request('daily', '2026-04-02', customerId)).status, 403);
    assert.equal((await request('hourly', '2026-04-02')).status, 400);
    assert.equal((await request('daily', '2026-02-30')).status, 400);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    db.close();
  }
});
