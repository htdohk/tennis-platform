import { PrismaClient, CourtType, CourtSurface, DateType, TimeSlotType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.recruitParticipant.deleteMany();
  await prisma.recruitPost.deleteMany();
  await prisma.order.deleteMany();
  await prisma.courtMaintenance.deleteMany();
  await prisma.priceRule.deleteMany();
  await prisma.court.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.mcpApiKey.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();

  // ── Venue ──────────────────────────────────────
  const venue = await prisma.venue.create({
    data: {
      name: "测试网球馆",
      address: "广东省深圳市南山区科技园南路1号",
      intro: "专业网球训练基地,拥有多片室内外场地",
      defaultBusinessHours: {
        weekday: { open: "07:00", close: "22:00" },
        weekend: { open: "06:00", close: "23:00" },
      },
      contact: "13800138000",
    },
  });
  console.log(`  Venue: ${venue.name}`);

  // ── Courts ─────────────────────────────────────
  const courtsData = [
    { code: "A1", name: "室内硬地1号场", type: CourtType.INDOOR, surface: CourtSurface.HARD },
    { code: "A2", name: "室内硬地2号场", type: CourtType.INDOOR, surface: CourtSurface.HARD },
    { code: "B1", name: "室外硬地1号场", type: CourtType.OUTDOOR, surface: CourtSurface.HARD },
    { code: "B2", name: "室外硬地2号场", type: CourtType.OUTDOOR, surface: CourtSurface.HARD },
  ];

  for (const c of courtsData) {
    await prisma.court.create({
      data: { ...c, venueId: venue.id },
    });
  }
  console.log(`  Courts: ${courtsData.length} created`);

  // ── Price Rules ────────────────────────────────
  const priceRules = [
    { dateType: DateType.WEEKDAY, timeSlotType: TimeSlotType.MORNING, timeStart: "07:00", timeEnd: "12:00", price: 30 },
    { dateType: DateType.WEEKDAY, timeSlotType: TimeSlotType.DAY, timeStart: "12:00", timeEnd: "18:00", price: 50 },
    { dateType: DateType.WEEKDAY, timeSlotType: TimeSlotType.EVENING, timeStart: "18:00", timeEnd: "22:00", price: 80 },
    { dateType: DateType.WEEKEND, timeSlotType: TimeSlotType.MORNING, timeStart: "06:00", timeEnd: "12:00", price: 50 },
    { dateType: DateType.WEEKEND, timeSlotType: TimeSlotType.DAY, timeStart: "12:00", timeEnd: "18:00", price: 80 },
    { dateType: DateType.WEEKEND, timeSlotType: TimeSlotType.EVENING, timeStart: "18:00", timeEnd: "23:00", price: 100 },
    { dateType: DateType.HOLIDAY, timeSlotType: TimeSlotType.MORNING, timeStart: "06:00", timeEnd: "12:00", price: 60 },
    { dateType: DateType.HOLIDAY, timeSlotType: TimeSlotType.DAY, timeStart: "12:00", timeEnd: "18:00", price: 90 },
    { dateType: DateType.HOLIDAY, timeSlotType: TimeSlotType.EVENING, timeStart: "18:00", timeEnd: "23:00", price: 120 },
  ];

  for (const r of priceRules) {
    await prisma.priceRule.create({
      data: {
        venueId: venue.id,
        dateType: r.dateType,
        timeSlotType: r.timeSlotType,
        timeStart: r.timeStart,
        timeEnd: r.timeEnd,
        pricePer30min: r.price,
      },
    });
  }
  console.log(`  Price rules: ${priceRules.length} created`);

  // ── Boss account ───────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 10);
  const boss = await prisma.user.create({
    data: {
      phone: "13800000000",
      passwordHash,
      nickname: "管理员",
      level: 3.0,
      wechatId: "boss_wechat",
      gender: null,
      role: "BOSS",
    },
  });
  console.log(`  Boss: ${boss.nickname} (phone: ${boss.phone})`);

  // ── System config defaults ─────────────────────
  await prisma.systemConfig.createMany({
    data: [
      { key: "default_level_tolerance", value: "0.5", description: "招募局默认段位浮动范围" },
      { key: "slot_granularity_minutes", value: "30", description: "时段颗粒度(分钟)" },
      { key: "max_booking_days_ahead", value: "14", description: "最多提前预订天数" },
    ],
  });

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
