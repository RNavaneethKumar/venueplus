#!/usr/bin/env bash
# VenuePlus — Start
# Usage: ./start.sh

echo ""
echo "Starting VenuePlus..."
docker compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "Running at http://venueplus.local:3001"
    echo ""
else
    echo "Failed to start. Run 'docker compose logs' for details."
fi
