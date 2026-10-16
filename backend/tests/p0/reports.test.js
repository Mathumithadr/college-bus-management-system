// P0 Reports tests: RPT-01 through RPT-08

import request from 'supertest';
import app from '../../src/app.js';
import {
  connectTestDB, disconnectTestDB, clearTestDB, seedFixtures, IDS,
} from '../helpers/setup.js';

let studentAToken, adminToken, reportId;

const login = async (email) => {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
  return res.body.data?.token;
};

beforeAll(async () => {
  await connectTestDB();
  await clearTestDB();
  await seedFixtures();
  studentAToken = await login('studenta@test.com');
  adminToken = await login('admin@test.com');
});

afterAll(async () => {
  await disconnectTestDB();
});

const validReportPayload = () => ({
  category: 'bus_delay',
  subject: 'Bus was 45 minutes late',
  description: 'The bus arrived much later than the scheduled time causing me to miss my class.',
  busId: IDS.BUS_ID,
});

describe('RPT-01: Student submits a report', () => {
  test('POST /api/student/reports returns 201 with ticketId', async () => {
    const res = await request(app)
      .post('/api/student/reports')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send(validReportPayload());
    expect(res.status).toBe(201);
    expect(res.body.data.report.ticketId).toMatch(/^TICK-\d{4}-\d{4}$/);
    expect(res.body.data.report.status).toBe('submitted');
    reportId = res.body.data.report._id;
  });
});

describe('RPT-02: Invalid category returns 400', () => {
  test('invalid category rejects with VALIDATION_FAILED', async () => {
    const res = await request(app)
      .post('/api/student/reports')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({ ...validReportPayload(), category: 'invalid_category' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });
});

describe('RPT-03: Student can list their reports', () => {
  test('GET /api/student/reports returns paginated list', async () => {
    const res = await request(app)
      .get('/api/student/reports')
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });
});

describe('RPT-04: Student can view their report', () => {
  test('GET /api/student/reports/:id returns the report', async () => {
    const res = await request(app)
      .get(`/api/student/reports/${reportId}`)
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.report._id).toBe(reportId);
  });
});

describe('RPT-05: Admin can list all reports', () => {
  test('GET /api/admin/reports returns all reports', async () => {
    const res = await request(app)
      .get('/api/admin/reports')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('RPT-06: Admin transitions report through state machine', () => {
  test('submitted → under_review returns 200', async () => {
    const res = await request(app)
      .put(`/api/admin/reports/${reportId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'under_review', note: 'Reviewing the complaint' });
    expect(res.status).toBe(200);
    expect(res.body.data.report.status).toBe('under_review');
  });

  test('under_review → resolved returns 200', async () => {
    const res = await request(app)
      .put(`/api/admin/reports/${reportId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'resolved', note: 'Issue resolved' });
    expect(res.status).toBe(200);
    expect(res.body.data.report.status).toBe('resolved');
  });
});

describe('RPT-07: Invalid transition returns 409 STATE_CONFLICT', () => {
  test('resolved → under_review rejected', async () => {
    const res = await request(app)
      .put(`/api/admin/reports/${reportId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'under_review' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STATE_CONFLICT');
  });
});

describe('RPT-08: Student closes own report when resolved', () => {
  test('PUT /api/student/reports/:id/close returns 200', async () => {
    const res = await request(app)
      .put(`/api/student/reports/${reportId}/close`)
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.report.status).toBe('closed');
  });
});
