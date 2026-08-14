#!/bin/bash
echo "=== Adyapan AI - Piston Code Engine Setup ==="
echo ""

echo "[1/4] Starting Piston container..."
cd "$(dirname "$0")"
docker compose up -d

echo "[2/4] Waiting for Piston API to be ready..."
for i in $(seq 1 60); do
  if curl -s http://localhost:2000/api/v2/runtimes > /dev/null 2>&1; then
    echo "  API is ready!"
    break
  fi
  if [ $i -eq 60 ]; then
    echo "  ERROR: Piston API failed to start. Check: docker logs piston"
    exit 1
  fi
  sleep 2
done

echo "[3/4] Installing language runtimes..."
echo "  Installing Python 3.10.0..."
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"python","version":"3.10.0"}' > /dev/null

echo "  Installing Node.js 18.15.0..."
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"node","version":"18.15.0"}' > /dev/null

echo "  Installing C++ 10.2.0..."
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"gcc","version":"10.2.0"}' > /dev/null

echo "  Installing Java 15.0.2..."
curl -s -X POST http://localhost:2000/api/v2/packages -H "Content-Type: application/json" -d '{"language":"java","version":"15.0.2"}' > /dev/null

echo "[4/4] Verifying installed runtimes..."
RUNTIMES=$(curl -s http://localhost:2000/api/v2/runtimes)
echo "$RUNTIMES" | python3 -m json.tool 2>/dev/null || echo "$RUNTIMES"

echo ""
echo "=== Piston is running at http://localhost:2000 ==="
echo "=== PISTON_URL in backend/.env should be: http://localhost:2000 ==="
