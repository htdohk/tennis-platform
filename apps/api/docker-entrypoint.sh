#!/bin/sh
set -e

cd /app

echo "Running database migrations..."
npx prisma migrate deploy --schema=prisma/schema.prisma

echo "Starting API server..."
exec node apps/api/dist/main.js
