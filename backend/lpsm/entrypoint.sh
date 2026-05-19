#!/bin/sh
set -e

echo "Waiting for database to be ready..."
for i in $(seq 1 30); do
  if nc -z db_lpsm 3306; then
    echo "Database is ready!"
    break
  fi
  echo "Waiting... attempt $i/30"
  sleep 1
done

echo "Running migrations..."
npx sequelize-cli db:migrate --config src/config/config.js

echo "Running seeders..."
npx sequelize-cli db:seed:all --config src/config/config.js

echo "Starting application..."
exec node src/app.js
