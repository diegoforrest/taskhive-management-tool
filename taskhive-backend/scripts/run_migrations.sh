#!/usr/bin/env bash
# Simple migration runner for Render one-off commands
# Usage: ./scripts/run_migrations.sh
set -e
if [ -z "$DB_HOST" ]; then
  echo "DB_HOST not set"
  exit 1
fi
if [ -z "$DB_USERNAME" ]; then
  echo "DB_USERNAME not set"
  exit 1
fi
if [ -z "$DB_PASSWORD" ]; then
  echo "DB_PASSWORD not set"
  exit 1
fi
if [ -z "$DB_NAME" ]; then
  echo "DB_NAME not set"
  exit 1
fi

echo "Running migrations from migration.sql against $DB_HOST:$DB_PORT/$DB_NAME"
if command -v mysql >/dev/null 2>&1; then
  # If DB_SSL is set to true and DB_SSL_CA is provided, write CA to a temp file and pass --ssl-ca
  if [ "${DB_SSL,,}" = "true" ] && [ -n "$DB_SSL_CA" ]; then
    echo "DB_SSL enabled. Writing CA cert to /tmp/db_ca.pem"
    echo "$DB_SSL_CA" > /tmp/db_ca.pem
    mysql --ssl-ca=/tmp/db_ca.pem -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" < migration.sql
    rm -f /tmp/db_ca.pem
  else
    mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_NAME" < migration.sql
  fi
  echo "Migrations applied"
else
  echo "mysql client not available in this environment. You can run the SQL manually or install mysql-client in the shell."
  exit 1
fi
