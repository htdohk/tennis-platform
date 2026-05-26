/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('M6 E2E: Recruit Posts & Reverse Matching', () => {
  let app: INestApplication;
  let user1Token: string;
  let user2Token: string;
  let adminToken: string;
  let courtId: string;
  let recruitPostId: string;
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

  const phone1 = `130${Date.now().toString().slice(-8)}`;
  const phone2 = `131${Date.now().toString().slice(-8)}`;
  const adminPhone = '13800000000';
  const testDate = new Date(Date.now() + 86400000 * 14)
    .toISOString()
    .split('T')[0];

  // ─── Setup ───

  it('setup: register user1 (level=3.5)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone: phone1,
        password: 'test123',
        nickname: '发起者',
        level: 3.5,
        wechatId: 'wx_user1',
      })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone: phone1, password: 'test123' });
    user1Token = res.body.data.accessToken;
  });

  it('setup: register user2 (level=4.0)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone: phone2,
        password: 'test123',
        nickname: '加入者',
        level: 4.0,
        wechatId: 'wx_user2',
      })
      .expect(201);
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone: phone2, password: 'test123' });
    user2Token = res.body.data.accessToken;
  });

  it('setup: admin login', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ phone: adminPhone, password: 'admin123' });
    adminToken = res.body.data.accessToken;
  });

  it('setup: get court', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/courts')
      .set('Authorization', `Bearer ${adminToken}`);
    courtId = res.body.data[0].id;
  });

  // ─── A. Create recruit ───

  it('A. POST /api/recruits - create recruit (201)', async () => {
    const deadline = new Date(Date.now() + 3600000).toISOString();
    const res = await request(app.getHttpServer())
      .post('/api/recruits')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        courtId,
        startAt: `${testDate}T14:00:00Z`,
        endAt: `${testDate}T16:00:00Z`,
        targetLevel: 3.5,
        levelTolerance: 0.5,
        maxParticipants: 1,
        deadline,
        notes: '周末约球',
      })
      .expect(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.order.type).toBe('RECRUIT');
    expect(res.body.data.order.status).toBe('RECRUITING');
    recruitPostId = res.body.data.id;
    orderId = res.body.data.order.id;
  });

  // ─── B. Recruit plaza ───

  it('B. GET /api/recruits - shows the recruit', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/recruits')
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    const found = res.body.data.find(
      (r: { id: string }) => r.id === recruitPostId,
    );
    expect(found).toBeDefined();
  });

  // ─── C. previewMatches (matching) ───

  it('C. POST /api/recruits/preview-matches - finds matching recruit', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/recruits/preview-matches')
      .send({
        date: testDate,
        startAt: `${testDate}T14:00:00Z`,
        endAt: `${testDate}T16:00:00Z`,
        level: 4.0,
        tolerance: 0.5,
      })
      .expect(201);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].nickname).toBe('发起者');
    expect(res.body.data[0].targetLevel).toBe('3.5');
  });

  // ─── D. previewMatches (non-matching level) ───

  it('D. POST /api/recruits/preview-matches - empty for non-matching level', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/recruits/preview-matches')
      .send({
        date: testDate,
        startAt: `${testDate}T14:00:00Z`,
        endAt: `${testDate}T16:00:00Z`,
        level: 1.5,
        tolerance: 0.5,
      })
      .expect(201);
    expect(res.body.data.length).toBe(0);
  });

  // ─── E. Join recruit ───

  it('E. POST /api/recruits/:id/join - user2 joins successfully', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/recruits/${recruitPostId}/join`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(201);
    expect(res.body.data.joined).toBe(true);
    expect(res.body.data.isFull).toBe(true);
  });

  // ─── F. Join with wrong level ───

  it('F. POST /api/recruits/:id/join - rejects wrong level user', async () => {
    // Register a new user with wrong level
    const phone3 = `132${Date.now().toString().slice(-8)}`;
    await request(app.getHttpServer()).post('/api/auth/register').send({
      phone: phone3,
      password: 'test123',
      nickname: '段位不符',
      level: 1.5,
      wechatId: 'wx_low',
    });
    const login3 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone: phone3, password: 'test123' });
    const token3 = login3.body.data.accessToken;

    await request(app.getHttpServer())
      .post(`/api/recruits/${recruitPostId}/join`)
      .set('Authorization', `Bearer ${token3}`)
      .expect(400);
  });

  // ─── G. Full → CONFIRMED ───

  it('G. After full, Order status is CONFIRMED', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  // ─── Additional: convertToNormal / abandon ───

  it('convertToNormal rejected when not RECRUITING_EXPIRED', async () => {
    // Our existing recruit is already CONFIRMED (full), so convertToNormal should fail
    await request(app.getHttpServer())
      .patch(`/api/recruits/${recruitPostId}/convert-to-normal`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(400);
  });

  it('admin lists recruits', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/recruits')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('admin cancels a recruit', async () => {
    // Create a new recruit to cancel
    const deadline = new Date(Date.now() + 3600000).toISOString();
    const newRecruit = await request(app.getHttpServer())
      .post('/api/recruits')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        courtId,
        startAt: `${testDate}T17:00:00Z`,
        endAt: `${testDate}T18:00:00Z`,
        targetLevel: 3.5,
        levelTolerance: 0.5,
        maxParticipants: 3,
        deadline,
      })
      .expect(201);
    const newRecruitId = newRecruit.body.data.id;

    const cancelRes = await request(app.getHttpServer())
      .patch(`/admin/recruits/${newRecruitId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(cancelRes.body.data.status).toBe('CANCELLED');
  });
});
