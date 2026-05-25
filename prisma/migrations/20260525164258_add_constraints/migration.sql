-- User level range 1.0 - 5.0, step 0.5
ALTER TABLE "users" ADD CONSTRAINT "check_user_level_range" CHECK ("level" >= 1.0 AND "level" <= 5.0);
ALTER TABLE "users" ADD CONSTRAINT "check_user_level_step" CHECK (("level" * 10) % 5 = 0);

-- Order time slot alignment: 30-min boundaries
ALTER TABLE "orders" ADD CONSTRAINT "check_order_start_aligned" CHECK (
  EXTRACT(MINUTE FROM "start_at") % 30 = 0 AND EXTRACT(SECOND FROM "start_at") = 0
);
ALTER TABLE "orders" ADD CONSTRAINT "check_order_end_aligned" CHECK (
  EXTRACT(MINUTE FROM "end_at") % 30 = 0 AND EXTRACT(SECOND FROM "end_at") = 0
);
ALTER TABLE "orders" ADD CONSTRAINT "check_order_duration_positive" CHECK ("start_at" < "end_at");

-- Partial unique index: same court, same time slot, only one active order
CREATE UNIQUE INDEX "idx_unique_active_booking" ON "orders" ("court_id", "start_at", "end_at")
WHERE "status" IN ('PENDING_CONFIRM', 'CONFIRMED', 'RECRUITING');
