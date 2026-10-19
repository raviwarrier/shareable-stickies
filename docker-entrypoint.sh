#!/bin/sh
set -e

# Target data and upload directories (from env or defaults)
DATA_DIRECTORY="${DATA_DIR:-/app/data}"
UPLOADS_DIRECTORY="${UPLOAD_DIR:-/app/uploads}"

echo "[Entrypoint] Starting Shareable Stickies container (UID: $(id -u), GID: $(id -g))..."

# Ensure data and uploads directories exist
mkdir -p "$DATA_DIRECTORY" "$UPLOADS_DIRECTORY" 2>/dev/null || true

# If running as root, fix volume permissions and drop privileges to nodejs
if [ "$(id -u)" = "0" ]; then
    echo "[Entrypoint] Configuring volume permissions for nodejs user..."
    # Ensure ownership belongs to nodejs user
    chown -R nodejs:nodejs "$DATA_DIRECTORY" "$UPLOADS_DIRECTORY" 2>/dev/null || true
    chmod -R 775 "$DATA_DIRECTORY" "$UPLOADS_DIRECTORY" 2>/dev/null || true

    # Ensure existing stickies.json is read/writable
    if [ -f "$DATA_DIRECTORY/stickies.json" ]; then
        chown nodejs:nodejs "$DATA_DIRECTORY/stickies.json" 2>/dev/null || true
        chmod 664 "$DATA_DIRECTORY/stickies.json" 2>/dev/null || true
    fi

    echo "[Entrypoint] Dropping privileges to nodejs user and launching application..."
    # Execute command as nodejs user with all environment variables preserved
    exec su-exec nodejs "$@"
fi

# If already non-root, execute command directly
echo "[Entrypoint] Running as non-root user, launching application..."
exec "$@"
