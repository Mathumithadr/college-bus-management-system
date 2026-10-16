// P0 Admin CRUD tests: ADMIN-01 through ADMIN-06

import request from 'supertest';
import app from '../../src/app.js';
import {
  connectTestDB, disconnectTestDB, clearTestDB, seedFixtures, IDS,
} from '../helpers/setup.js';

let adminToken, studentAToken;

const login = async (email) => {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
  return res.body.data?.token;
};

beforeAll(async () => {
  await connectTestDB();
  await clearTestDB();
  await seedFixtures();
  adminToken = await login('admin@test.com');
  studentAToken = await login('studenta@test.com');
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('ADMIN-01: Admin creates a bus', () => {
  test('POST /api/admin/buses returns 201', async () => {
    const res = await request(app)
      .post('/api/admin/buses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ busNumber: 'BUS-02', registrationNumber: 'TN02CD5678', capacity: 50 });
    expect(res.status).toBe(201);
    expect(res.body.data.bus.busNumber).toBe('BUS-02');
  });
});

describe('ADMIN-02: Admin lists buses', () => {
  test('GET /api/admin/buses returns paginated list', async () => {
    const res = await request(app)
      .get('/api/admin/buses')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });
});

describe('ADMIN-03: Non-admin cannot create buses', () => {
  test('student gets 403 ROLE_FORBIDDEN', async () => {
    const res = await request(app)
      .post('/api/admin/buses')
      .set('Authorization', `Bearer ${studentAToken}`)
      .send({ busNumber: 'BUS-99', registrationNumber: 'TN99ZZ9999', capacity: 30 });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ROLE_FORBIDDEN');
  });
});

describe('ADMIN-04: Admin creates a user', () => {
  test('POST /api/admin/users returns 201 without passwordHash', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'New Student', email: 'newstudent@test.com', password: 'Password123!', role: 'student' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.email).toBe('newstudent@test.com');
  });
});

describe('ADMIN-05: Admin lists users', () => {
  test('GET /api/admin/users returns paginated list', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe('ADMIN-06: Admin gets specific bus', () => {
  test('GET /api/admin/buses/:id returns 200', async () => {
    const res = await request(app)
      .get(`/api/admin/buses/${IDS.BUS_ID}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.bus._id).toBeDefined();
  });

  test('non-existent bus returns 404', async () => {
    const res = await request(app)
      .get('/api/admin/buses/65f1a2b3c4d5e6f7a8b9c999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
  });
});
