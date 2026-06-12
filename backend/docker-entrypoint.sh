#!/bin/sh
# Tolongin entrypoint: wait for DB, run migrations, then exec the main command.
set -e

echo "🔧 Tolongin backend starting..."
echo "   NODE_ENV=$NODE_ENV"
echo "   PORT=$PORT"

# Wait for the database to be reachable (up to ~60s)
if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Waiting for database to accept connections..."
  i=0
  until npx --no-install prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; do
    i=$((i + 1))
    if [ $i -ge 30 ]; then
      echo "❌ Database not reachable after 60s, aborting." >&2
      exit 1
    fi
    sleep 2
  done
  echo "✅ Database is ready."
fi

# Apply pending migrations (idempotent in production)
echo "📦 Running prisma migrate deploy..."
npx prisma migrate deploy || {
  echo "⚠️  migrate deploy failed; attempting db push as fallback..." >&2
  npx prisma db push --skip-generate
}

# Optional one-shot seed when SEED_ON_BOOT=true (default: false in production)
if [ "$SEED_ON_BOOT" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || echo "⚠️  Seed step failed (continuing)"
fi

echo "🚀 Launching server..."
exec "$@"
