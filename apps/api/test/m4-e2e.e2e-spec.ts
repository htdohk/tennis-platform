/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('M4 E2E: Core Business Modules', () => {
  let app: INestApplication;
  let customerToken: string;
  let adminToken: string;
  let venueId: string;

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

  const phone = `137${Date.now().toString().slice(-8)}`;
  const adminPhone = '13800000000';

  // ─── C端: 注册 → 登录 → 拿 token → 修改资料 ───

  it('POST /api/auth/register - registers new user (level=3.5 number)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone,
        password: 'test123',
        nickname: 'E2E测试',
        level: 3.5,
        wechatId: 'e2e_wx',
      })
      .expect(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.phone).toBe(phone);
    expect(res.body.data.nickname).toBe('E2E测试');
  });

  it('POST /api/auth/register - rejects duplicate phone', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone,
        password: 'test123',
        nickname: '重复',
        level: 3.0,
        wechatId: 'dup',
      })
      .expect(409);
  });

  it('POST /api/auth/register - rejects invalid level (3.3, not 0.5 step)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone: '13899998888',
        password: 'test123',
        nickname: '段位错',
        level: 3.3,
        wechatId: 'wx',
      })
      .expect(400);
  });

  it('POST /api/auth/register - rejects level=5.5 (out of range)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone: '13899997776',
        password: 'test123',
        nickname: '超标',
        level: 5.5,
        wechatId: 'wx',
      })
      .expect(400);
  });

  it('POST /api/auth/register - rejects level="3.5" (string not number)', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone: '13899997775',
        password: 'test123',
        nickname: '字符串段位',
        level: '3.5',
        wechatId: 'wx',
      })
      .expect(400);
  });

  it('POST /api/auth/register - rejects empty wechatId', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone: '13899997777',
        password: 'test123',
        nickname: '无微信',
        level: 3.0,
        wechatId: '',
      })
      .expect(400);
  });

  it('POST /api/auth/login - login with correct credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone, password: 'test123' })
      .expect(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.accessToken).toBeDefined();
    customerToken = res.body.data.accessToken;
  });

  // ─── Rate limit test (uses separate phone to avoid blocking subsequent tests) ───

  const rateLimitPhone = `139${Date.now().toString().slice(-8)}`;

  it('POST /api/auth/register - register rate-limit test user', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        phone: rateLimitPhone,
        password: 'rlpass',
        nickname: '限流测试',
        level: 3.0,
        wechatId: 'rl_wx',
      })
      .expect(201);
  });

  it('POST /api/auth/login - 5 wrong passwords return 401', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ phone: rateLimitPhone, password: `wrong${i}` })
        .expect(401);
    }
  });

  it('POST /api/auth/login - 6th wrong password returns 429', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ phone: rateLimitPhone, password: 'wrong6' })
      .expect(429);
  });

  it('GET /api/auth/me - returns user profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect(res.body.data.phone).toBe(phone);
    expect(res.body.data.level).toBe('3.5');
  });

  it('PATCH /api/auth/me - updates profile (level=4.0 number)', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ nickname: '已改名', level: 4.0 })
      .expect(200);
    expect(res.body.data.nickname).toBe('已改名');
    expect(res.body.data.level).toBe('4');
  });

  it('GET /api/auth/me - requires auth', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  // ─── B端: 管理员登录 → 创建场馆 → 创建场地 ───

  it('POST /admin/auth/login - admin login', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ phone: adminPhone, password: 'admin123' })
      .expect(200);
    expect(res.body.data.accessToken).toBeDefined();
    adminToken = res.body.data.accessToken;
  });

  it('POST /admin/auth/login - rejects customer role', async () => {
    await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ phone, password: 'test123' })
      .expect(401);
  });

  it('POST /admin/venues - creates venue', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/venues')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'E2E测试馆', address: '深圳市南山区' })
      .expect(201);
    expect(res.body.data.name).toBe('E2E测试馆');
    venueId = res.body.data.id;
  });

  it('GET /admin/venues - lists venues', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/venues')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /admin/venues/:id - updates venue', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/admin/venues/${venueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ intro: '详细介绍' })
      .expect(200);
    expect(res.body.data.intro).toBe('详细介绍');
  });

  it('POST /admin/courts - creates court', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        venueId,
        code: 'E2E',
        name: 'E2E测试场',
        type: 'INDOOR',
        surface: 'HARD',
      })
      .expect(201);
    expect(res.body.data.code).toBe('E2E');
  });

  it('GET /admin/courts - lists courts', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/courts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /admin/courts/:id/maintenance - adds maintenance', async () => {
    const courts = await request(app.getHttpServer())
      .get('/admin/courts')
      .set('Authorization', `Bearer ${adminToken}`);
    const courtId = courts.body.data[0].id;

    const res = await request(app.getHttpServer())
      .post(`/admin/courts/${courtId}/maintenance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        startAt: '2026-07-01T08:00:00Z',
        endAt: '2026-07-01T12:00:00Z',
        reason: '例行维护',
      })
      .expect(201);
    expect(res.body.data.reason).toBe('例行维护');
  });

  it('POST /admin/prices - creates price rule', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/prices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        venueId,
        dateType: 'WEEKDAY',
        timeSlotType: 'MORNING',
        timeStart: '08:00',
        timeEnd: '12:00',
        pricePer30min: '35',
      })
      .expect(201);
    expect(res.body.data.pricePer30min).toBe('35');
  });

  it('GET /admin/users - lists users (admin only)', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('PATCH /admin/users/:id - updates user level (4.5 number)', async () => {
    const users = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    const user = users.body.data.find(
      (u: { phone: string }) => u.phone === phone,
    );
    expect(user).toBeDefined();

    const res = await request(app.getHttpServer())
      .patch(`/admin/users/${user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ level: 4.5 })
      .expect(200);
    expect(res.body.data.level).toBe('4.5');
  });

  it('POST /admin/venues - rejects customer token', async () => {
    await request(app.getHttpServer())
      .post('/admin/venues')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: '非法', address: 'x' })
      .expect(401);
  });
});
