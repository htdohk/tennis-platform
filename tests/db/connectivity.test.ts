import "dotenv/config";
import { describe, it, expect, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Database Connectivity", () => {
  it("should connect to database", async () => {
    const result = await prisma.$queryRawUnsafe<[{ "?column?": number }]>(
      "SELECT 1"
    );
    expect(result[0]["?column?"]).toBe(1);
  });
});

describe("Seed Data Verification", () => {
  it("should have seed venue", async () => {
    const venue = await prisma.venue.findFirst({
      where: { name: "测试网球馆" },
    });
    expect(venue).not.toBeNull();
    expect(venue!.address).toBe("广东省深圳市南山区科技园南路1号");
  });

  it("should have 4 courts", async () => {
    const count = await prisma.court.count();
    expect(count).toBe(4);
  });

  it("should have 2 indoor and 2 outdoor courts", async () => {
    const indoor = await prisma.court.count({
      where: { type: "INDOOR" },
    });
    const outdoor = await prisma.court.count({
      where: { type: "OUTDOOR" },
    });
    expect(indoor).toBe(2);
    expect(outdoor).toBe(2);
  });

  it("should have 9 price rules", async () => {
    const count = await prisma.priceRule.count();
    expect(count).toBe(9);
  });

  it("should have boss account", async () => {
    const boss = await prisma.user.findUnique({
      where: { phone: "13800000000" },
    });
    expect(boss).not.toBeNull();
    expect(boss!.role).toBe("BOSS");
    expect(boss!.nickname).toBe("管理员");
  });

  it("boss password should be hashed (bcrypt)", async () => {
    const boss = await prisma.user.findUniqueOrThrow({
      where: { phone: "13800000000" },
    });
    expect(boss.passwordHash).not.toBe("admin123");
    expect(boss.passwordHash).toMatch(/^\$2[aby]\$\d+\$/);
  });
});
