# Deployment Environment Variables Quick Reference

## 🚂 Backend (Railway) - `/server`

```bash
# ========================================
# DATABASE
# ========================================
DATABASE_URL="postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require"
# ↑ Get from Neon (use POOLED connection string)

# ========================================
# SERVER CONFIGURATION
# ========================================
PORT=3001
# ↑ Default port (Railway assigns external port automatically)

NODE_ENV=production
# ↑ Required for production mode

# ========================================
# CORS - FRONTEND URL
# ========================================
FRONTEND_URL="https://your-app.vercel.app"
# ↑ UPDATE AFTER deploying frontend to Vercel
# ⚠️  NO trailing slash!

# ========================================
# AWS COGNITO AUTHENTICATION
# ========================================
AWS_REGION=us-east-1
# ↑ Cognito region (e.g., us-east-1, eu-west-1)

AWS_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
# ↑ From AWS Cognito → User pools → Your pool → Pool ID

AWS_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
# ↑ From AWS Cognito → App integration → App clients → Client ID

# ========================================
# FILE STORAGE
# ========================================
STORAGE_DRIVER=local
# ↑ Options: "local" or "r2"
# ⚠️  WARNING: Railway ephemeral storage! Uploads lost on redeploy.
# For production: use "r2" or add Railway persistent volume

# --- OPTIONAL: Cloudflare R2 Configuration ---
# Only needed if STORAGE_DRIVER=r2
# R2_ACCOUNT_ID=your_cloudflare_account_id
# R2_ACCESS_KEY_ID=your_r2_access_key
# R2_SECRET_ACCESS_KEY=your_r2_secret_key
# R2_BUCKET_NAME=conference-uploads
# R2_PUBLIC_URL=https://pub-xxxxxxx.r2.dev
```

---

## 🌐 Frontend (Vercel) - `/client`

```bash
# ========================================
# BACKEND API URL
# ========================================
NEXT_PUBLIC_API_BASE_URL=https://your-backend.up.railway.app
# ↑ Railway backend URL from Part 3
# ⚠️  NO trailing slash!
# ⚠️  Must have NEXT_PUBLIC_ prefix (client-side variable)

# ========================================
# AWS COGNITO AUTHENTICATION
# ========================================
NEXT_PUBLIC_AWS_COGNITO_REGION=us-east-1
# ↑ SAME as backend AWS_REGION
# ⚠️  Must have NEXT_PUBLIC_ prefix

NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
# ↑ SAME as backend AWS_COGNITO_USER_POOL_ID
# ⚠️  Must have NEXT_PUBLIC_ prefix

NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
# ↑ SAME as backend AWS_COGNITO_USER_POOL_CLIENT_ID
# ⚠️  Must have NEXT_PUBLIC_ prefix
```

---

## 🔑 How to Get Each Value

| Variable | Where to Find It | Notes |
|----------|------------------|-------|
| `DATABASE_URL` | Neon dashboard → Connection Details | Use **pooled** connection (has `-pooler`) |
| `PORT` | Default: `3001` | Backend listens on this internally |
| `NODE_ENV` | Set to `production` | Enables optimizations |
| `FRONTEND_URL` | Vercel deployment URL | Update AFTER frontend deployed |
| `AWS_REGION` | Cognito User Pool ID prefix | Example: `us-east-1` from `us-east-1_ABC123` |
| `AWS_COGNITO_USER_POOL_ID` | AWS Cognito → User pools → Your pool | Format: `region_XXXXXXX` |
| `AWS_COGNITO_USER_POOL_CLIENT_ID` | Cognito → App integration → App clients | Long alphanumeric string |
| `NEXT_PUBLIC_API_BASE_URL` | Railway backend URL | From Railway deployment |
| `STORAGE_DRIVER` | `local` or `r2` | Start with `local` for simplicity |
| R2 credentials | Cloudflare dashboard → R2 → API Tokens | Only if using R2 storage |

---

## ⚠️ Common Mistakes

### Backend Environment Variables
❌ `FRONTEND_URL` with trailing slash → `https://app.vercel.app/`  
✅ Correct: `https://app.vercel.app`

❌ Wrong variable name: `AWS_COGNITO_REGION`  
✅ Correct: `AWS_REGION`

❌ Missing Neon SSL mode → `?ssl=true`  
✅ Correct: `?sslmode=require`

### Frontend Environment Variables
❌ Missing `NEXT_PUBLIC_` prefix → `API_BASE_URL`  
✅ Correct: `NEXT_PUBLIC_API_BASE_URL`

❌ Backend URL with trailing slash  
✅ No trailing slash: `https://backend.railway.app`

❌ Different Cognito credentials than backend  
✅ Must match backend exactly (same Pool ID, Client ID, Region)

---

## 🔍 Validation Commands

### Verify Backend Environment (Railway Terminal)
```bash
# Check environment variables are set
echo $DATABASE_URL
echo $AWS_COGNITO_USER_POOL_ID
echo $FRONTEND_URL

# Test database connection
npx prisma db pull --force

# Test backend is running
curl http://localhost:$PORT/
```

### Verify Frontend Environment (Vercel Build Logs)
Look for these in build output:
```
✓ Collecting environment variables
  - NEXT_PUBLIC_API_BASE_URL: https://...
  - NEXT_PUBLIC_AWS_COGNITO_REGION: us-east-1
  - NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID: us-east-1_...
```

### Test Integration (Browser Console)
```javascript
// Should match your Railway URL
console.log(process.env.NEXT_PUBLIC_API_BASE_URL);

// Test API call
fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/public/conferences`)
  .then(r => r.json())
  .then(console.log);
```

---

## 📋 Copy-Paste Templates

### Railway Backend Variables (Fill in blanks)
```
DATABASE_URL=postgresql://__________@ep-__________-pooler.________.aws.neon.tech/neondb?sslmode=require
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://__________.vercel.app
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=us-east-1___________
AWS_COGNITO_USER_POOL_CLIENT_ID=__________________________
STORAGE_DRIVER=local
```

### Vercel Frontend Variables (Fill in blanks)
```
NEXT_PUBLIC_API_BASE_URL=https://__________.up.railway.app
NEXT_PUBLIC_AWS_COGNITO_REGION=us-east-1
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=us-east-1___________
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID=__________________________
```

---

## 🚨 Emergency Troubleshooting

### "Frontend can't reach backend"
1. Check `NEXT_PUBLIC_API_BASE_URL` (no trailing slash?)
2. Check `FRONTEND_URL` in backend (matches Vercel exactly?)
3. Check CORS errors in browser console
4. Test backend directly: `curl https://your-backend.railway.app/api/public/conferences`

### "Authentication not working"
1. Verify Cognito credentials match between frontend/backend
2. Check Cognito callback URLs include Vercel URL
3. Verify users are in correct Cognito groups (`user`, `organizer`, `admin`)
4. Check browser console for Cognito errors

### "Database connection failed"
1. Verify `?sslmode=require` at end of DATABASE_URL
2. Use pooled connection string (has `-pooler`)
3. Check Neon project is active (not suspended)
4. Run `npx prisma migrate deploy` in Railway

---

## 📦 Full Example (Real Values Masked)

```bash
# Backend (Railway)
DATABASE_URL=postgresql://neondb_owner:abc123@ep-cool-sunset-123456-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://conference-master.vercel.app
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=us-east-1_AbCdEf123
AWS_COGNITO_USER_POOL_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
STORAGE_DRIVER=local

# Frontend (Vercel)
NEXT_PUBLIC_API_BASE_URL=https://conference-master-backend-production.up.railway.app
NEXT_PUBLIC_AWS_COGNITO_REGION=us-east-1
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=us-east-1_AbCdEf123
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
```

This exact configuration would allow:
- Frontend at `https://conference-master.vercel.app`
- Backend at `https://conference-master-backend-production.up.railway.app`
- Database at Neon with connection pooling
- Auth via AWS Cognito in `us-east-1`
- File uploads stored locally (ephemeral on Railway)
