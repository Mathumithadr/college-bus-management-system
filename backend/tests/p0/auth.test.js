// P0 Auth tests: AUTH-01 through AUTH-10

import request from 'supertest';
import app from '../../src/app.js';
import {
  connectTestDB, disconnectTestDB, clearTestDB, seedFixtures, IDS,
} from '../helpers/setup.js';

let adminToken, staffToken, primaryRepToken, studentAToken;

beforeAll(async () => {
  await connectTestDB();
  await clearTestDB();
  await seedFixtures();
});

afterAll(async () => {
  await disconnectTestDB();
});

// Helper to login and extract token
const login = async (email, password = 'Password123!') => {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data?.token;
};

describe('AUTH-01: Valid login returns 200 + token', () => {
  test('admin login', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
    adminToken = res.body.data.token;
  });

  test('staff login', async () => {
    staffToken = await login('staff@test.com');
    expect(staffToken).toBeDefined();
  });

  test('primary rep login', async () => {
    primaryRepToken = await login('primaryrep@test.com');
    expect(primaryRepToken).toBeDefined();
  });

  test('student A login', async () => {
    studentAToken = await login('studenta@test.com');
    expect(studentAToken).toBeDefined();
  });
});

describe('AUTH-02: Wrong password returns 401 TOKEN_INVALID', () => {
  test('wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'WrongPassword!' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });
});

describe('AUTH-03: Missing email/password returns 400 VALIDATION_FAILED', () => {
  test('missing password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  test('missing email', async () => {
    const res = await request(app).post('/api/auth/login').send({ password: 'Password123!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });

  test('invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: 'Password123!' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });
});

describe('AUTH-04: GET /me returns user profile', () => {
  test('authenticated user sees their profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('admin@test.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  test('unauthenticated returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });
});

describe('AUTH-05: Logout is idempotent', () => {
  test('first logout returns 200', async () => {
    const token = await login('studentb@test.com');
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('AUTH-06: Revoked token is rejected on next use', () => {
  test('using revoked token returns 401', async () => {
    const token = await login('staff@test.com');
    // Logout to revoke
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);
    // Try using the revoked token
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});

describe('AUTH-07: Non-existent email returns 401', () => {
  test('unknown email returns 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'Password123!' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_INVALID');
  });
});

describe('AUTH-08: Health check returns flat JSON', () => {
  test('GET /api/health returns 200 with flat shape', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(res.body.serverTime).toBeDefined();
    // Must NOT have success field (flat JSON)
    expect(res.body.success).toBeUndefined();
  });
});

describe('AUTH-09: Role mismatch returns 403 ROLE_FORBIDDEN', () => {
  test('student cannot access admin endpoint', async () => {
    const res = await request(app)
      .get('/api/admin/buses')
      .set('Authorization', `Bearer ${studentAToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ROLE_FORBIDDEN');
  });
});

describe('AUTH-10: 404 for non-existent route', () => {
  test('unknown route returns 404 RESOURCE_NOT_FOUND', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('RESOURCE_NOT_FOUND');
    expect(res.body.success).toBe(false);
  });
});

export { adminToken, staffToken, primaryRepToken, studentAToken };
