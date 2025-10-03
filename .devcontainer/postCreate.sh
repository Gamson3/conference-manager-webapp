#!/bin/bash
set -e

echo "=== Setting up environment variables ==="

# 1. DATABASE_URL from Codespaces Secret
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set in Codespaces Secrets!"
  exit 1
fi

# 2. Dynamically derive CLIENT_ORIGIN (frontend URL)
if [ -n "$CODESPACE_NAME" ] && [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
  CLIENT_ORIGIN="https://3000-${CODESPACE_NAME}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
else
  CLIENT_ORIGIN="http://localhost:3000"
fi

# 3. Dynamically derive NEXT_PUBLIC_API_URL (backend URL)
if [ -n "$CODESPACE_NAME" ] && [ -n "$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN" ]; then
  NEXT_PUBLIC_API_URL="https://4000-${CODESPACE_NAME}.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
else
  NEXT_PUBLIC_API_URL="http://localhost:4000"
fi

echo "CLIENT_ORIGIN=$CLIENT_ORIGIN"
echo "NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL"

# -----------------------------------------------
echo "=== Setting up server ==="
cd server
# Create server/.env
cat > .env <<EOL
DATABASE_URL=${DATABASE_URL}
PORT=4000
CLIENT_ORIGIN=${CLIENT_ORIGIN}
EOL

# Install dependencies and prepare Prisma
npm install
npm run prisma:generate
npx prisma migrate deploy

echo "=== Setting up client ==="
cd ../client
# Create client/.env
cat > .env <<EOL
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
EOL

npm install
cd ..

echo "=== Setup complete! ==="
echo "Open two terminals to run the servers:"
echo " - Server: cd server && npm run dev"
echo " - Client: cd client && npm run dev"
echo "Forward ports 3000 (frontend) and 4000 (backend) as Public."
