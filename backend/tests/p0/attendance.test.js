// P0 Attendance tests: ATT-01 through ATT-08

import request from 'supertest';
import app from '../../src/app.js';
import {
  connectTestDB, disconnectTestDB, clearTestDB, seedFixtures, IDS,
} from '../helpers/setup.js';

let studentAToken, staffToken, primaryRepToken, tripId;

const login = async (email) => {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
  return res.body.data?.token;
};

beforeAll(async () => {
  await connectTestDB();
  await clearTestDB();
  await seedFixtures();
  studentAToken = await login('studenta@test.com');
  staffToken = await login('staff@test.com');
  primaryRepToken = await login('primaryrep@test.com');
});

afterAll(async () => {
  await disconnectTestDB();
});

const validAttendancePayload = () => ({
  date: '2026-10-16',
  classHour: 2,
  course: 'Computer Science 101',
  facultyId: IDS.STAFF_ID,
  reason: 'Bus was delayed by 30 minutes',
});

describe('ATT-01: Student submits attendance request', () => {
  test('POST /api/student/attendance returns 201', async () => {
    const res = await request(app)
      .post('/api/student/attendance')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send(validAttendancePayload());
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.attendance.status).toBe('pending');
  });
});

describe('ATT-02: Duplicate attendance rejected with 409 DUPLICATE_REQUEST', () => {
  test('same date + classHour returns 409', async () => {
    const res = await request(app)
      .post('/api/student/attendance')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send(validAttendancePayload());
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DUPLICATE_REQUEST');
  });
});

describe('ATT-03: Missing required fields returns 400', () => {
  test('missing course returns 400', async () => {
    const { course, ...rest } = validAttendancePayload();
    const res = await request(app)
      .post('/api/student/attendance')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({ ...rest, date: '2026-10-17' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });
});

describe('ATT-04: Student can list their attendance requests', () => {
  test('GET /api/student/attendance returns paginated list', async () => {
    const res = await request(app)
      .get('/api/student/attendance')
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});

describe('ATT-05: Student can cancel a pending request', () => {
  test('PUT /api/student/attendance/:id/cancel returns 200', async () => {
    // Create a fresh request
    const createRes = await request(app)
      .post('/api/student/attendance')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({ ...validAttendancePayload(), date: '2026-10-18', classHour: 3 });
    const id = createRes.body.data.attendance._id;

    const res = await request(app)
      .put(`/api/student/attendance/${id}/cancel`)
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.attendance.status).toBe('cancelled');
  });
});

describe('ATT-06: Staff can approve a pending request', () => {
  test('PUT /api/staff/attendance/:id/review with approve', async () => {
    // Create a request first
    const createRes = await request(app)
      .post('/api/student/attendance')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({ ...validAttendancePayload(), date: '2026-10-19', classHour: 4 });
    const id = createRes.body.data.attendance._id;

    const res = await request(app)
      .put(`/api/staff/attendance/${id}/review`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ action: 'approve', remarks: 'Verified' });
    expect(res.status).toBe(200);
    expect(res.body.data.attendance.status).toBe('approved');
  });
});

describe('ATT-07: Staff can reject a pending request', () => {
  test('PUT /api/staff/attendance/:id/review with reject', async () => {
    const createRes = await request(app)
      .post('/api/student/attendance')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({ ...validAttendancePayload(), date: '2026-10-20', classHour: 5 });
    const id = createRes.body.data.attendance._id;

    const res = await request(app)
      .put(`/api/staff/attendance/${id}/review`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ action: 'reject', remarks: 'No delay recorded' });
    expect(res.status).toBe(200);
    expect(res.body.data.attendance.status).toBe('rejected');
  });
});

describe('ATT-08: Cannot cancel an approved request', () => {
  test('cancel on approved returns 409 STATE_CONFLICT', async () => {
    // Create and approve
    const createRes = await request(app)
      .post('/api/student/attendance')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({ ...validAttendancePayload(), date: '2026-10-21', classHour: 6 });
    const id = createRes.body.data.attendance._id;
    await request(app)
      .put(`/api/staff/attendance/${id}/review`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ action: 'approve' });

    // Try cancel
    const res = await request(app)
      .put(`/api/student/attendance/${id}/cancel`)
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STATE_CONFLICT');
  });
});
