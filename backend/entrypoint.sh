#!/bin/sh
set -e

echo "Pushing Prisma schema to database..."
npx prisma db push --skip-generate

echo "Starting backend..."
exec node dist/main
