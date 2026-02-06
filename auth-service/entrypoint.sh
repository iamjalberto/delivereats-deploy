#!/bin/sh
set -e

# Initialize PostgreSQL data directory if needed
if [ ! -s /var/lib/postgresql/data/PG_VERSION ]; then
  echo "[entrypoint] Initializing PostgreSQL data directory..."
  mkdir -p /var/lib/postgresql/data
  chown postgres:postgres /var/lib/postgresql/data
  su postgres -c "initdb -D /var/lib/postgresql/data"
fi

# Start PostgreSQL in background
echo "[entrypoint] Starting PostgreSQL..."
su postgres -c "pg_ctl -D /var/lib/postgresql/data -l /var/lib/postgresql/logfile start -w"

# Create database if it doesn't exist
su postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'\" | grep -q 1 || psql -c \"CREATE DATABASE ${DB_NAME};\""

echo "[entrypoint] PostgreSQL ready. Starting Node.js app..."
exec node src/index.js
