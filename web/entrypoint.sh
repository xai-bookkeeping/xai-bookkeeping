#!/bin/sh
set -e

# DB_MIGRATE_STRATEGY controls how the schema is applied on startup.
#   deploy -> prisma migrate deploy   (safe; used for prod/Neon)
#   push   -> prisma db push          (default; dev/qa containers)
if [ "$DB_MIGRATE_STRATEGY" = "deploy" ]; then
  node node_modules/prisma/build/index.js migrate deploy
else
  node node_modules/prisma/build/index.js db push --accept-data-loss
fi

exec node server.js
