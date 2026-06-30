#!/bin/sh
set -e

echo "Pushing Prisma schema to database..."
npx prisma db push

echo "Starting backend..."
exec node dist/src/main
