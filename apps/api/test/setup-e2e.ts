/**
 * E2E test setup - runs before each test suite.
 *
 * Provides DB cleanup helpers to avoid test residue accumulation.
 * Each spec should call cleanupCreatedIds() in afterAll to remove
 * data created during the test.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Track IDs created during a test for cleanup
const createdIds = {
  orderIds: [] as string[],
  recruitPostIds: [] as string[],
  userIds: [] as string[],
  maintenanceIds: [] as string[],
};

export function trackCreated(type: keyof typeof createdIds, id: string) {
  createdIds[type].push(id);
}

export async function cleanupCreatedIds() {
  if (createdIds.recruitPostIds.length > 0) {
    await prisma.recruitParticipant.deleteMany({
      where: { recruitPostId: { in: createdIds.recruitPostIds } },
    });
    await prisma.recruitPost.deleteMany({
      where: { id: { in: createdIds.recruitPostIds } },
    });
  }
  if (createdIds.orderIds.length > 0) {
    await prisma.order.deleteMany({
      where: { id: { in: createdIds.orderIds } },
    });
  }
  if (createdIds.maintenanceIds.length > 0) {
    await prisma.courtMaintenance.deleteMany({
      where: { id: { in: createdIds.maintenanceIds } },
    });
  }
  if (createdIds.userIds.length > 0) {
    // Clean up related data first
    await prisma.order.deleteMany({
      where: { userId: { in: createdIds.userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: createdIds.userIds } },
    });
  }

  // Reset tracking
  for (const key of Object.keys(createdIds) as (keyof typeof createdIds)[]) {
    createdIds[key] = [];
  }
}

// Global teardown - disconnect Prisma
export async function disconnectPrisma() {
  await prisma.$disconnect();
}
