#!/usr/bin/env bash
# =============================================================================
# VenuePlus — First-time Setup (macOS / Linux)
# Usage: chmod +x setup.sh && sudo ./setup.sh
# =============================================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

step()  { echo -e "\n${CYAN}>>> $1${NC}"; }
ok()    { echo -e "    ${GREEN}$1${NC}"; }
warn()  { echo -e "    ${YELLOW}$1${NC}"; }
fail()  { echo -e "    ${RED}$1${NC}"; }

echo ""
echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}   VenuePlus Setup${NC}"
echo -e "${CYAN}============================================${NC}"

# ── Must run as root (needed for /etc/hosts) ──────────────────────────────────

if [ "$EUID" -ne 0 ]; then
    fail "Please run as root: sudo ./setup.sh"
    exit 1
fi

# ── 1. Check Docker ───────────────────────────────────────────────────────────

step "Checking Docker..."

if ! command -v docker &>/dev/null; then
    fail "Docker not found."
    fail "Install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &>/dev/null; then
    fail "Docker is installed but not running. Start Docker Desktop and try again."
    exit 1
fi

ok "Docker is ready."

# ── 2. Add venueplus.local to /etc/hosts ─────────────────────────────────────

step "Configuring venueplus.local hostname..."

HOSTS_FILE="/etc/hosts"

if grep -q "venueplus\.local" "$HOSTS_FILE"; then
    warn "venueplus.local already in $HOSTS_FILE — skipping."
else
    echo "127.0.0.1    venueplus.local" >> "$HOSTS_FILE"
    ok "Added venueplus.local → 127.0.0.1 to $HOSTS_FILE."
fi

# ── macOS: also set the machine's Bonjour hostname ───────────────────────────

if [[ "$OSTYPE" == "darwin"* ]]; then
    step "Setting Bonjour hostname to venueplus (for network device access)..."
    scutil --set LocalHostName "venueplus" 2>/dev/null && ok "Bonjour hostname set to venueplus.local." || warn "Could not set Bonjour hostname — set it manually in System Settings → Sharing."
fi

# ── 3. Pull latest images ─────────────────────────────────────────────────────

step "Pulling latest VenuePlus images..."
docker compose pull
ok "Images pulled."

# ── 4. Start services ─────────────────────────────────────────────────────────

step "Starting VenuePlus..."
docker compose up -d

# ── 5. Wait for API ───────────────────────────────────────────────────────────

step "Waiting for API to be ready..."
MAX=20
COUNT=0
READY=0

while [ $COUNT -lt $MAX ]; do
    sleep 3
    COUNT=$((COUNT + 1))
    if curl -sf http://localhost:4000/health &>/dev/null; then
        READY=1
        break
    fi
    printf "    Waiting... (%d/%d)\r" $COUNT $MAX
done

if [ $READY -eq 1 ]; then
    ok "API is healthy."
else
    warn "API health check timed out — it may still be starting. Check with: docker compose logs api"
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}   VenuePlus is ready!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "   POS Terminal : ${NC}http://venueplus.local:3001"
echo -e "   API          : ${NC}http://venueplus.local:4000"
echo ""
echo -e "${GRAY}   Daily use:"
echo -e "     Start  ->  ./start.sh"
echo -e "     Stop   ->  ./stop.sh"
echo -e "     Update ->  ./update.sh${NC}"
echo ""
echo -e "${YELLOW}   NOTE: For tablets/phones on the same WiFi, run rebuild.sh once (~5 min).${NC}"
echo ""
