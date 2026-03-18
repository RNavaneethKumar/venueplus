#!/usr/bin/env bash
# VenuePlus — Stop
# Usage: ./stop.sh

echo ""
echo "Stopping VenuePlus..."
docker compose down

if [ $? -eq 0 ]; then
    echo "Stopped."
    echo ""
fi
