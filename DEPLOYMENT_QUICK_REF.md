# Deployment Quick Reference

## Environment Variables

### Backend (Railway)
```bash
DATABASE_URL=postgresql://neondb_owner:xxx@ep-xxx.neon.tech/neondb?sslmode=require
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app

AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
AWS_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx

STORAGE_DRIVER=local
```

### Frontend (Vercel)
```bash
NEXT_PUBLIC_API_BASE_URL=https://your-backend.railway.app
NEXT_PUBLIC_AWS_COGNITO_REGION=us-east-1
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
```

## Railway Configuration

**Root Directory**: `/server`  
**Build Command**: `npm install && npx prisma generate && npm run build`  
**Start Command**: `node dist/index.js`  
**Watch Paths**: `/server/**`

## Vercel Configuration

**Framework**: Next.js (auto-detected)  
**Root Directory**: `/client`  
**Build Command**: `npm run build` (uses cross-env NEXT_DISABLE_TURBOPACK=1)  
**Install Command**: `npm install`

## Post-Deployment Commands

### Run Migrations (Railway Terminal)
```bash
npx prisma migrate deploy
```

### Seed Database (Railway Terminal)
```bash
npm run seed              # Basic seed
npm run seed:full         # Full dataset
npm run seed:manual-test  # Test scenarios
```

## Test Endpoints

### Backend
- Root: `https://your-backend.railway.app/`
- Public API: `https://your-backend.railway.app/api/public/conferences`

### Frontend
- Home: `https://your-app.vercel.app`
- Browse: `https://your-app.vercel.app/browse`

## Test Credentials (Create in Cognito)

| Role | Email | Password | Group |
|------|-------|----------|-------|
| User | test.user@conference-master.dev | TestUser2026! | user |
| Organizer | test.organizer@conference-master.dev | TestOrganizer2026! | organizer |
| Admin | test.admin@conference-master.dev | TestAdmin2026! | admin |

## Cognito Callback URLs

```
https://your-app.vercel.app/api/auth/callback
```

## Common Issues

### CORS errors
→ Verify `FRONTEND_URL` is set in Railway backend

### 404 on API calls
→ Check `NEXT_PUBLIC_API_BASE_URL` in Vercel (no trailing slash)

### Auth not working
→ Ensure Cognito users are in correct groups (`user`, `organizer`, `admin`)
