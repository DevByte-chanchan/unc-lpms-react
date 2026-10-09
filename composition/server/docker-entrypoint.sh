#!/bin/sh
# Prepare the database directory, then hand over to the server.
#
# The SQLite file cannot be bind-mounted from the Windows worktree: WAL mode
# needs a shared-memory sidecar next to the database, and a sidecar written by
# the host's own Node process cannot be reused inside a Linux container (the
# server dies at startup with SQLITE_IOERR_SHMOPEN). So the database lives in a
# named volume, and this script fills that volume from the pristine copy baked
# into the image the first time the volume is empty.
#
# A named volume starts out owned by root even when the directory in the image
# belongs to the app user, so ownership is corrected here. The server itself is
# then started as the unprivileged app user.
set -e

DATA_DIR=${LPMS_DATA_DIR:-/app/data}
SEED_DIR=${LPMS_SEED_DIR:-/app/seed-data}
APP_USER=${LPMS_APP_USER:-node}
SIGNATURE_DIR=${LPMS_SIGNATURE_DIR:-/app/storage/signatures}

seed_if_empty() {
    if [ -z "$(ls -A "$DATA_DIR" 2>/dev/null)" ] && [ -n "$(ls -A "$SEED_DIR" 2>/dev/null)" ]; then
        echo "Empty data volume: seeding it from the database bundled in this image."
        cp -p "$SEED_DIR"/* "$DATA_DIR"/
        # The seed directory is read-only in the image, so the copies inherit a
        # read-only mode. SQLite needs to write the database and its WAL.
        chmod u+rw "$DATA_DIR"/*
        echo "Seeded: $(ls -1 "$DATA_DIR" | tr '\n' ' ')"
    fi
}

# Bring the database schema up to the code in this image before the server starts, so a rebuild can
# never leave the schema behind. migrate.js records what it has applied, so running it on every start
# is safe: with nothing pending it changes nothing. If a migration fails (its message says why and
# what to do) the container stops rather than serving a schema the code does not expect.
# Set LPMS_SKIP_MIGRATIONS=1 to start without migrating (for example to inspect a database by hand).
migrate_or_stop() {
    if [ "${LPMS_SKIP_MIGRATIONS:-}" = "1" ]; then
        echo "LPMS_SKIP_MIGRATIONS=1: not running database migrations."
        return 0
    fi
    echo "Applying database migrations (none pending is normal)..."
    if ! "$@" node migrate.js; then
        echo "Database migration FAILED. The server was not started. Read the message above, fix the data it names," >&2
        echo "then restart the container (the migration is safe to run again)." >&2
        exit 1
    fi
}

if [ "$(id -u)" = "0" ]; then
    mkdir -p "$DATA_DIR"
    seed_if_empty
    chown -R "$APP_USER":"$APP_USER" "$DATA_DIR"
    # A named volume starts out owned by root; the signature folder has to be writable by the app user.
    mkdir -p "$SIGNATURE_DIR"
    chown -R "$APP_USER":"$APP_USER" "$SIGNATURE_DIR"
    # As the app user, so the database and its WAL files stay owned by it.
    migrate_or_stop setpriv --reuid="$APP_USER" --regid="$APP_USER" --init-groups --
    exec setpriv --reuid="$APP_USER" --regid="$APP_USER" --init-groups -- "$@"
fi

# Already unprivileged, e.g. `docker run --user node`.
seed_if_empty
migrate_or_stop
exec "$@"
