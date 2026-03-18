#!/usr/bin/env bash
# VenuePlus — Update to latest images
# Usage: ./update.sh

echo ""
echo "Updating VenuePlus..."

docker compose pull
if [ $? -ne 0 ]; then
    echo "Failed to pull images. Check your internet connection."
    exit 1
fi

docker compose up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "Updated and running at http://venueplus.local:3001"
    echo ""
else
    echo "Failed to restart. Run 'docker compose logs' for details."
fi
