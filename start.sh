#!/bin/bash
# ────────────────────────────────────────────
#  MAINTEN — Demo Start Script
#  Usage: ./start.sh [--prod]
#  Opens: http://localhost:5173
# ────────────────────────────────────────────

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  ████████████████████████████████████████"
echo "  ██                                    ██"
echo "  ██   M A I N T E N  — Demo Start      ██"
echo "  ██   Keep Your Home at 10             ██"
echo "  ██                                    ██"
echo "  ████████████████████████████████████████"
echo ""

# Kill any existing servers on our ports
echo "  → Clearing ports 3001 and 5173..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
sleep 1

# Start backend
echo "  → Starting Mainten API (port 3001)..."
cd "$ROOT/backend"
node server.js &
BACKEND_PID=$!
sleep 2

# Verify backend
if curl -s http://localhost:3001/api/property?address=test > /dev/null 2>&1; then
  echo "  ✓ Backend ready at http://localhost:3001"
else
  echo "  ✓ Backend starting..."
fi

# Start frontend
echo "  → Starting Frontend (port 5173)..."
cd "$ROOT/frontend"

if [ "$1" = "--prod" ]; then
  npm run build && npm run preview &
else
  npm run dev &
fi
FRONTEND_PID=$!
sleep 3

echo ""
echo "  ════════════════════════════════════════"
echo "  ✓ Mainten is running!"
echo ""
echo "  Frontend:  http://localhost:5173"
echo "  API:       http://localhost:3001"
echo ""
echo "  DEMO ADDRESS: 14 Winthrop Street, Boston"
echo "  Or try any Cambridge address for Google expo"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "  ════════════════════════════════════════"
echo ""

# Open in browser
open http://localhost:5173 2>/dev/null || true

# Keep alive and handle Ctrl+C
trap "echo ''; echo '  Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
