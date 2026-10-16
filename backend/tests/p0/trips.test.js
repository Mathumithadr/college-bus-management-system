// P0 Trip lifecycle tests: TRIP-01 through TRIP-10 aligned with /api/rep canonical routes

import request from 'supertest';
import app from '../../src/app.js';
import Trip from '../../src/models/Trip.js';
import {
  connectTestDB, disconnectTestDB, clearTestDB, seedFixtures, IDS,
} from '../helpers/setup.js';

let primaryRepToken, adminToken, tripId;

const login = async (email) => {
  const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
  return res.body.data?.token;
};

beforeAll(async () => {
  await connectTestDB();
  await clearTestDB();
  await seedFixtures();
  primaryRepToken = await login('primaryrep@test.com');
  adminToken = await login('admin@test.com');
});

afterAll(async () => {
  await disconnectTestDB();
});

describe('TRIP-01: Primary rep can start a trip', () => {
  test('POST /api/rep/buses/:busId/trips/start returns 201 with trip in_progress', async () => {
    const res = await request(app)
      .post('/api/rep/buses/' + IDS.BUS_ID + '/trips/start')
      .set('Authorization', 'Bearer ' + primaryRepToken)
      .set('Idempotency-Key', 'trip-start-001');
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.trip.tripStatus).toBe('in_progress');
    expect(res.body.data.trip.busId).toBe(IDS.BUS_ID);
    tripId = res.body.data.trip._id;
  });
});

describe('TRIP-02: Starting a second trip on same bus returns 409 TRIP_ALREADY_ACTIVE', () => {
  test('duplicate trip start rejected', async () => {
    const res = await request(app)
      .post('/api/rep/buses/' + IDS.BUS_ID + '/trips/start')
      .set('Authorization', 'Bearer ' + primaryRepToken)
      .set('Idempotency-Key', 'trip-start-002');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('TRIP_ALREADY_ACTIVE');
  });
});

describe('TRIP-03: Student (non-rep) cannot start a trip', () => {
  test('student without rep assignment gets 403', async () => {
    const studentToken = await login('studenta@test.com');
    const res = await request(app)
      .post('/api/rep/buses/' + IDS.BUS_ID + '/trips/start')
      .set('Authorization', 'Bearer ' + studentToken)
      .set('Idempotency-Key', 'trip-start-003');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('REPRESENTATIVE_NOT_ACTIVE');
  });
});

describe('TRIP-04: GPS ping accepted during active trip', () => {
  test('POST /api/rep/trips/:tripId/location returns 200', async () => {
    const res = await request(app)
      .post('/api/rep/trips/' + tripId + '/location')
      .set('Authorization', 'Bearer ' + primaryRepToken)
      .send({
        latitude: 13.0001,
        longitude: 80.0001,
        accuracyMeters: 20,
        recordedAt: new Date().toISOString(),
      });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.locationId).toBeDefined();
  });
});

describe('TRIP-05: GPS ping with future timestamp rejected (400)', () => {
  test('future recordedAt returns LOCATION_TIMESTAMP_INVALID', async () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const res = await request(app)
      .post('/api/rep/trips/' + tripId + '/location')
      .set('Authorization', 'Bearer ' + primaryRepToken)
      .send({ latitude: 13.0, longitude: 80.0, accuracyMeters: 20, recordedAt: future });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('LOCATION_TIMESTAMP_INVALID');
  });
});

describe('TRIP-06: Manual location requires stopId or stopName', () => {
  test('missing stopId and stopName returns error', async () => {
    const res = await request(app)
      .post('/api/rep/trips/' + tripId + '/location/manual')
      .set('Authorization', 'Bearer ' + primaryRepToken)
      .send({ latitude: 13.0, longitude: 80.0, recordedAt: new Date().toISOString() });
    expect(res.status).toBe(409);
  });

  test('with stopName accepted', async () => {
    const res = await request(app)
      .post('/api/rep/trips/' + tripId + '/location/manual')
      .set('Authorization', 'Bearer ' + primaryRepToken)
      .send({ latitude: 13.0, longitude: 80.0, recordedAt: new Date().toISOString(), stopName: 'Stop 1' });
    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('manual');
  });
});

describe('TRIP-07: Delay report updates trip delayStatus', () => {
  test('POST /api/rep/trips/:tripId/delay returns 201', async () => {
    const res = await request(app)
      .post('/api/rep/trips/' + tripId + '/delay')
      .set('Authorization', 'Bearer ' + primaryRepToken)
      .send({ updateType: 'delay', reason: 'Traffic jam', expectedDelayMinutes: 20 });
    expect(res.status).toBe(201);
    const trip = await Trip.findById(tripId);
    expect(trip.delayStatus).toBe('delayed');
  });
});

describe('TRIP-08: Rep ends active trip', () => {
  test('POST /api/rep/trips/:tripId/end returns 200 with completed status', async () => {
    const res = await request(app)
      .post('/api/rep/trips/' + tripId + '/end')
      .set('Authorization', 'Bearer ' + primaryRepToken)
      .set('Idempotency-Key', 'trip-end-001');
    expect(res.status).toBe(200);
    expect(res.body.data.trip.tripStatus).toBe('completed');
  });
});

describe('TRIP-09: Cannot end an already-completed trip', () => {
  test('ending completed trip returns 409 STATE_CONFLICT', async () => {
    const res = await request(app)
      .post('/api/rep/trips/' + tripId + '/end')
      .set('Authorization', 'Bearer ' + primaryRepToken)
      .set('Idempotency-Key', 'trip-end-002');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('STATE_CONFLICT');
  });
});

describe('TRIP-10: Admin can terminate an active trip', () => {
  test('admin terminate trip', async () => {
    const startRes = await request(app)
      .post('/api/rep/buses/' + IDS.BUS_ID + '/trips/start')
      .set('Authorization', 'Bearer ' + primaryRepToken)
      .set('Idempotency-Key', 'trip-start-004');
    const newTripId = startRes.body.data.trip._id;

    const res = await request(app)
      .post('/api/admin/trips/' + newTripId + '/terminate')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({ reason: 'Emergency' });
    expect(res.status).toBe(200);
    expect(res.body.data.trip.tripStatus).toBe('completed');
  });
});
