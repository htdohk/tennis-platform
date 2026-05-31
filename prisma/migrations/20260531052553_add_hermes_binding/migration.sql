-- CreateTable
CREATE TABLE "hermes_bindings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hermes_id" TEXT NOT NULL,
    "group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hermes_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bind_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bind_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hermes_bindings_hermes_id_group_id_key" ON "hermes_bindings"("hermes_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "bind_codes_code_key" ON "bind_codes"("code");

-- AddForeignKey
ALTER TABLE "hermes_bindings" ADD CONSTRAINT "hermes_bindings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bind_codes" ADD CONSTRAINT "bind_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
