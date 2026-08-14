#!/bin/bash
set -e

echo "Starting Piston API in background to install packages..."
node /piston/api/src/index.js &
API_PID=$!

echo "Waiting for Piston API to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:2000/api/v2/runtimes > /dev/null 2>&1; then
    echo "Piston API is ready!"
    break
  fi
  sleep 1
done

echo "Installing language runtimes..."
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"python","version":"3.10.0"}'
echo ""
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"node","version":"18.15.0"}'
echo ""
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"gcc","version":"10.2.0"}'
echo ""
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"java","version":"15.0.2"}'
echo ""

echo "All packages installed. Stopping temporary API..."
kill $API_PID 2>/dev/null || true
wait $API_PID 2>/dev/null || true

echo "Starting Piston API (final)..."
exec node /piston/api/src/index.js
