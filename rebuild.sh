#!/usr/bin/env bash
# =============================================================================
# VenuePlus — Rebuild for Network Access (macOS / Linux)
#
# Run this if tablets/phones on the same WiFi need to access the POS.
# Rebuilds the POS image with venueplus.local baked in as the API URL.
# Takes ~5 minutes. Run with sudo.
# =============================================================================

set -e

echo ""
echo "============================================"
echo "   VenuePlus — Network Rebuild"
echo "============================================"
echo ""
echo "This rebuilds the POS image so tablets and phones"
echo "on the same WiFi can access the POS via venueplus.local."
echo ""
echo "This will take approximately 5 minutes."
echo ""
read -p "Continue? (y/n): " confirm
if [ "$confirm" != "y" ]; then exit 0; fi

# ── Create .env.docker.local if missing ──────────────────────────────────────

if [ ! -f ".env.docker.local" ]; then
    echo ""
    echo "Creating .env.docker.local from template..."
    cp .env.docker .env.docker.local
    echo "Edit .env.docker.local with your values, then re-run rebuild.sh."
    exit 0
fi

# ── Patch API URL and CORS in .env.docker.local ──────────────────────────────

ENV_FILE=".env.docker.local"

if grep -q "NEXT_PUBLIC_API_URL" "$ENV_FILE"; then
    sed -i.bak "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://venueplus.local:4000/api/v1|" "$ENV_FILE"
else
    echo "NEXT_PUBLIC_API_URL=http://venueplus.local:4000/api/v1" >> "$ENV_FILE"
fi

if grep -q "CORS_ORIGINS" "$ENV_FILE"; then
    sed -i.bak "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3001,http://venueplus.local:3001|" "$ENV_FILE"
else
    echo "CORS_ORIGINS=http://localhost:3001,http://venueplus.local:3001" >> "$ENV_FILE"
fi

rm -f "${ENV_FILE}.bak"
echo "Updated .env.docker.local with venueplus.local URLs."

# ── Build and start ───────────────────────────────────────────────────────────

echo ""
echo "Building images (this takes a few minutes)..."

docker compose -f docker-compose.build.yml --env-file .env.docker.local up --build -d

if [ $? -eq 0 ]; then
    echo ""
    echo "============================================"
    echo "   Build complete!"
    echo "============================================"
    echo ""
    echo "   POS Terminal : http://venueplus.local:3001"
    echo ""
    echo "   Devices on the same WiFi can now access"
    echo "   the POS at http://venueplus.local:3001"
    echo ""
else
    echo "Build failed. Check the error above."
    exit 1
fi
