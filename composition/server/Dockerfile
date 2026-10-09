# LPMS composition backend.
#
# One Node process, one SQLite file. There is no database service to wire up:
# config/config.json points Sequelize at data/lpms_composition.sqlite, and
# models/index.js resolves that path against this directory, so the only thing
# Compose has to provide is storage for /app/data.
#
# The database lives in a named volume, not in a bind mount. WAL mode needs a
# shared-memory sidecar next to the database file, and the sidecar written by a
# Windows process on the host cannot be reused inside a Linux container — the
# server dies on startup with SQLITE_IOERR_SHMOPEN. docker-entrypoint.sh copies
# the worktree's database into the volume the first time the volume is empty.
#
# better-sqlite3 and sqlite3 are native modules. Both ship prebuilt binaries for
# the Node version below, but the toolchain is kept in the install stage so the
# build still succeeds if a prebuild is missing for a future release.
FROM node:22-bookworm-slim AS deps

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

# Install scripts have to run: the SQLite drivers unpack or compile their
# binding during `npm ci`.
RUN npm ci --omit=dev


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=5000 \
    LPMS_DATA_DIR=/app/data \
    LPMS_SEED_DIR=/app/seed-data \
    NPM_CONFIG_UPDATE_NOTIFIER=false

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Keep a pristine copy of the database for the entrypoint to seed the volume
# from, then empty /app/data so the volume it backs starts out empty.
# The -shm sidecars are deliberately not carried over: they are process-local
# derived state, and a stale one is exactly what breaks WAL mode.
#
# /app/data is created first because a fresh git clone has no database (they are git-ignored): the
# image then has an empty seed, the volume starts empty, and the entrypoint's migrations build the
# schema from scratch. Create the first user with create-superuser.js.
RUN mkdir -p /app/data /app/seed-data \
    && find /app/data -maxdepth 1 -type f -name '*.sqlite*' ! -name '*-shm' \
        -exec cp -p {} /app/seed-data/ \; \
    && find /app/data -mindepth 1 -delete \
    && chown -R node:node /app/data \
    && chmod -R a-w /app/seed-data \
    && chmod +x /app/docker-entrypoint.sh

# The image itself runs as root so the entrypoint can fix the ownership of a
# freshly created volume, then it drops to the `node` user before starting the
# server. The process that answers requests is unprivileged.

EXPOSE 5000

HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/auth/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
