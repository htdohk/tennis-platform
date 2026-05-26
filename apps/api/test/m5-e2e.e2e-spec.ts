/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('M5 E2E: Orders & Booking', () => {
  let app: INestApplication;
  let customerToken: string;
  let adminToken: string;
  let courtId: string;
  let orderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const phone = `136${Date.now().toString().slice(-8)}`;
  const adminPhone = '13800000000';
  const testDate = new Date(Date.now() + 86400000 * 7)
    .toISOString()
    .split('T')[0]; // Monday (WEEKDAY)

  // ─── Setup: register + login + get court ───

  it('setup: register customer', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone,
        password: 'test123',
        nickname: 'M5测试',
        level: 3.0,
        wechatId: 'm5_wx',
      })
      .expect(201);
  });

  it('setup: customer login', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone, password: 'test123' })
      .expect(200);
    customerToken = res.body.data.accessToken;
  });

  it('setup: admin login', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ phone: adminPhone, password: 'admin123' })
      .expect(200);
    adminToken = res.body.data.accessToken;
  });

  it('setup: get first available court', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    courtId = res.body.data[0].id;
  });

  // ─── Availability ───

  it('GET /api/courts/:id/availability - returns slots', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/courts/${courtId}/availability?date=${testDate}`)
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    // All slots within business hours should be available initially
    const available = res.body.data.filter(
      (s: { available: boolean }) => s.available,
    );
    expect(available.length).toBeGreaterThan(0);
  });

  // ─── Create order (positive case) ───

  it('POST /api/orders - creates booking (201)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        courtId,
        startAt: `${testDate}T10:00:00Z`,
        endAt: `${testDate}T11:30:00Z`,
      })
      .expect(201);

    expect(res.body.code).toBe(0);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('PENDING_CONFIRM');
    // Should have calculated price (3 slots × weekday morning price = 3 × 30 = 90)
    expect(res.body.data.totalPrice).toBeDefined();
    orderId = res.body.data.id;
  });

  // ─── Price calculation verification ───

  it('price calculation: weekday morning 1.5h (3 slots × 30)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        courtId,
        startAt: `${testDate}T08:00:00Z`,
        endAt: `${testDate}T09:30:00Z`,
      })
      .expect(201);
    // Seed data: WEEKDAY MORNING (07:00-12:00) = 30 per 30min
    // 1.5h = 3 slots × 30 = 90
    expect(res.body.data.totalPrice).toBe('90');
  });

  it('price calculation: weekday evening 2h (4 slots × 80)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        courtId,
        startAt: `${testDate}T18:00:00Z`,
        endAt: `${testDate}T20:00:00Z`,
      })
      .expect(201);
    // Seed data: WEEKDAY EVENING (18:00-22:00) = 80 per 30min
    // 2h = 4 slots × 80 = 320
    expect(res.body.data.totalPrice).toBe('320');
  });

  // ─── Conflict detection ───

  it('POST /api/orders - rejects overlapping booking (409)', async () => {
    // First create a booking
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        courtId,
        startAt: `${testDate}T14:00:00Z`,
        endAt: `${testDate}T15:00:00Z`,
      })
      .expect(201);

    // Try to create overlapping
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        courtId,
        startAt: `${testDate}T14:30:00Z`,
        endAt: `${testDate}T15:30:00Z`,
      })
      .expect(409);
  });

  // ─── Concurrent booking (Promise.all) ───

  it('concurrent: 5 same-time bookings → only 1 succeeds', async () => {
    const slot = `${testDate}T16:00:00Z`;
    const slotEnd = `${testDate}T17:00:00Z`;

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/api/orders')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ courtId, startAt: slot, endAt: slotEnd }),
      ),
    );

    const succeeded = results.filter(
      (r) =>
        r.status === 'fulfilled' &&
        (r as PromiseFulfilledResult<any>).value.status === 201,
    );
    const conflicted = results.filter(
      (r) =>
        r.status === 'fulfilled' &&
        (r as PromiseFulfilledResult<any>).value.status === 409,
    );

    expect(succeeded.length).toBe(1);
    expect(conflicted.length).toBe(4);
  });

  // ─── Time alignment validation ───

  it('POST /api/orders - rejects non-aligned time (19:15)', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        courtId,
        startAt: `${testDate}T19:15:00Z`,
        endAt: `${testDate}T20:00:00Z`,
      })
      .expect(400);
  });

  // ─── Admin order management ───

  it('PATCH /admin/orders/:id/confirm - admin confirms order', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/orders/${orderId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  it('GET /api/orders/me - lists customer orders', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/orders/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /admin/orders/:id/cancel - admin cancels order, slot becomes available', async () => {
    // Create a new order at a specific slot
    const newOrder = await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        courtId,
        startAt: `${testDate}T12:00:00Z`,
        endAt: `${testDate}T12:30:00Z`,
      })
      .expect(201);
    const newOrderId = newOrder.body.data.id;

    // Cancel it
    const cancelRes = await request(app.getHttpServer())
      .patch(`/admin/orders/${newOrderId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');

    // Verify slot is now available
    const avail = await request(app.getHttpServer())
      .get(`/api/courts/${courtId}/availability?date=${testDate}`)
      .expect(200);
    const slot12 = avail.body.data.find(
      (s: { time: string }) => s.time === '12:00',
    );
    expect(slot12.available).toBe(true);
  });

  it('GET /api/orders/:id - order detail', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(res.body.data.id).toBe(orderId);
    expect(res.body.data.court).toBeDefined();
  });

  it('GET /admin/orders - admin lists all orders', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /admin/orders/:id/mark-paid - marks as paid', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/orders/${orderId}/mark-paid`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.paidStatus).toBe('PAID');
  });

  it('PATCH /admin/orders/:id/complete - completes order', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/orders/${orderId}/complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.status).toBe('COMPLETED');
  });

  it('PATCH /admin/orders/:id/cancel - rejects cancel on completed order', async () => {
    await request(app.getHttpServer())
      .patch(`/admin/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(500); // State machine throws Error → 500 Internal
  });
});
