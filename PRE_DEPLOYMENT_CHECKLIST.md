# Pre-Deployment Checklist

Complete this checklist before deploying Conference Master to production.

## ✅ Prerequisites

### 1. Repository Ready
- [ ] All code committed to Git
- [ ] Latest changes pushed to GitHub/remote
- [ ] No uncommitted `.env` files (security risk!)
- [ ] `.gitignore` includes `.env`, `.env.local`, `node_modules/`

### 2. Dependencies Verified
- [ ] Run `cd server && npm install` (no errors)
- [ ] Run `cd client && npm install` (no errors)
- [ ] Run `cd server && npx prisma generate` (generates Prisma client)

### 3. Local Build Test
- [ ] Server builds: `cd server && npm run build` (creates `dist/` folder)
- [ ] Client builds: `cd client && npm run build` (creates `.next/` folder)
- [ ] No TypeScript or build errors

---

## 🗄️ Part 1: Database (Neon PostgreSQL)

### Setup
- [ ] Created Neon account at https://neon.tech
- [ ] Created new project: `conference-master-prod`
- [ ] Selected appropriate region (closest to users)
- [ ] Enabled connection pooling (recommended)

### Credentials
- [ ] Copied **pooled** connection string (has `-pooler` in URL)
- [ ] Connection string format: `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require`
- [ ] Saved connection string securely (needed for Railway)

---

## 🔐 Part 2: AWS Cognito Authentication

### User Pool Created
- [ ] Created Cognito User Pool
- [ ] Sign-in configured: Email only
- [ ] Self-service sign-up: Enabled
- [ ] Email verification: Enabled

### App Client Configured
- [ ] App client created: `conference-master-web`
- [ ] Authentication flows enabled:
  - [ ] ALLOW_USER_PASSWORD_AUTH
  - [ ] ALLOW_REFRESH_TOKEN_AUTH
- [ ] OAuth 2.0 flows enabled:
  - [ ] Authorization code grant
  - [ ] Implicit grant

### User Groups Created
- [ ] Group: `user` (default role)
- [ ] Group: `organizer` (conference creators)
- [ ] Group: `admin` (system administrators)

### Credentials Collected
- [ ] User Pool ID: `us-east-1_XXXXXXXXX`
- [ ] App Client ID: `xxxxxxxxxxxxxxxxxxxxxxxx`
- [ ] Region: `us-east-1` (or your chosen region)

### Callback URLs (Placeholder - Update After Vercel Deployment)
- [ ] Noted to update after frontend deployment
- [ ] Format: `https://your-app.vercel.app/api/auth/callback`

---

## 🚂 Part 3: Backend Deployment (Railway)

### Railway Project Setup
- [ ] Created Railway account at https://railway.app
- [ ] Connected GitHub repository
- [ ] Created new project from GitHub repo

### Service Configuration
- [ ] Root Directory: `/server`
- [ ] Build Command: `npm install && npx prisma generate && npm run build`
- [ ] Start Command: `node dist/index.js`
- [ ] Watch Paths: `/server/**`

### Environment Variables Set
Copy-paste this checklist and fill in values:

```bash
# Database
DATABASE_URL=postgresql://...  # ← FROM NEON (pooled connection)

# Server
PORT=3001                      # ← DEFAULT (Railway auto-assigns external port)
NODE_ENV=production

# Frontend URL (UPDATE AFTER VERCEL DEPLOYMENT)
FRONTEND_URL=                  # ← PLACEHOLDER - update after Step 4

# AWS Cognito
AWS_REGION=                    # ← FROM COGNITO (e.g., us-east-1)
AWS_COGNITO_USER_POOL_ID=      # ← FROM COGNITO
AWS_COGNITO_USER_POOL_CLIENT_ID=  # ← FROM COGNITO

# File Storage
STORAGE_DRIVER=local           # ← WARNING: Railway ephemeral storage!
# For production: use R2 (see guide) or add Railway volume
```

**Environment Variables Checklist:**
- [ ] `DATABASE_URL` - Neon pooled connection string
- [ ] `PORT` - Set to 3001
- [ ] `NODE_ENV` - Set to `production`
- [ ] `AWS_REGION` - Cognito region
- [ ] `AWS_COGNITO_USER_POOL_ID` - From Cognito
- [ ] `AWS_COGNITO_USER_POOL_CLIENT_ID` - From Cognito
- [ ] `STORAGE_DRIVER` - Set to `local` (or configure R2)
- [ ] `FRONTEND_URL` - **SKIP FOR NOW** (update after Vercel)

### Database Migrations
- [ ] Deployment succeeded (check Railway logs)
- [ ] Ran: `npx prisma migrate deploy` in Railway terminal
- [ ] No migration errors in logs

### Backend URL
- [ ] Copied Railway URL: `https://conference-master-backend-production-xxxx.up.railway.app`
- [ ] Tested root endpoint (should see "This is home route")
- [ ] Tested: `/api/public/conferences` (should return JSON array)

---

## 🌐 Part 4: Frontend Deployment (Vercel)

### Vercel Project Setup
- [ ] Created Vercel account at https://vercel.com
- [ ] Connected GitHub repository
- [ ] Imported project

### Project Configuration
- [ ] Framework Preset: Next.js (auto-detected)
- [ ] Root Directory: `client`
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`
- [ ] Install Command: `npm install`

### Environment Variables Set
```bash
# API Backend (FROM RAILWAY - Step 3)
NEXT_PUBLIC_API_BASE_URL=      # ← Railway backend URL

# AWS Cognito (SAME AS BACKEND)
NEXT_PUBLIC_AWS_COGNITO_REGION=           # ← Same as AWS_REGION
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=     # ← Same as backend
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID=  # ← Same as backend
```

**Environment Variables Checklist:**
- [ ] `NEXT_PUBLIC_API_BASE_URL` - Railway backend URL (NO trailing slash)
- [ ] `NEXT_PUBLIC_AWS_COGNITO_REGION` - Same as backend `AWS_REGION`
- [ ] `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID` - Same as backend
- [ ] `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID` - Same as backend

### Deployment
- [ ] Clicked "Deploy"
- [ ] Build succeeded (check Vercel logs)
- [ ] Frontend accessible at: `https://your-project.vercel.app`

---

## 🔗 Part 5: Final Configuration

### Update Backend CORS
- [ ] Went to Railway → Backend service → Variables
- [ ] Added/Updated: `FRONTEND_URL=https://your-project.vercel.app`
- [ ] Redeployed backend (Settings → Deploy → Redeploy)
- [ ] Verified backend restarted successfully

### Update Cognito Callback URLs
- [ ] AWS Cognito → App integration → App clients → Edit
- [ ] Added Callback URL: `https://your-project.vercel.app/api/auth/callback`
- [ ] Added Sign-out URL: `https://your-project.vercel.app`
- [ ] Saved changes

### Seed Test Data
- [ ] Railway → Backend service → "⋮" → Run command
- [ ] Executed: `npm run seed:full` (or `npm run seed`)
- [ ] Check logs for successful seed completion

### Create Test Users
- [ ] AWS Cognito → Users → Create user

**Test User:**
- [ ] Email: `test.user@conference-master.dev`
- [ ] Password: `TempPass2026!`
- [ ] Added to group: `user`

**Test Organizer:**
- [ ] Email: `test.organizer@conference-master.dev`
- [ ] Password: `TempPass2026!`
- [ ] Added to group: `organizer`

**Test Admin:**
- [ ] Email: `test.admin@conference-master.dev`
- [ ] Password: `TempPass2026!`
- [ ] Added to group: `admin`

---

## ✅ Part 6: Verification

### Public Access
- [ ] Visited: `https://your-project.vercel.app`
- [ ] Home page loads
- [ ] Can see conferences list
- [ ] Can click and view conference details
- [ ] Can view published program/schedule

### Authentication
- [ ] Clicked "Sign In"
- [ ] Logged in with test user
- [ ] Redirected to dashboard after login
- [ ] Dashboard shows user name/email

### Organizer Features
- [ ] Logged in as test organizer
- [ ] Can access organizer console
- [ ] Can view/create conferences
- [ ] Can manage submissions (if any exist)

### Admin Features
- [ ] Logged in as test admin
- [ ] Can access admin dashboard
- [ ] Can view all users
- [ ] Can view audit logs

### API Health
- [ ] Backend root: `https://your-railway-url.up.railway.app/`
- [ ] Public API: `https://your-railway-url.up.railway.app/api/public/conferences`
- [ ] Returns valid JSON
- [ ] No CORS errors in browser console

---

## 📝 Part 7: Documentation Updates

### Thesis Appendix C.1
- [ ] Updated with production URLs:
  - Frontend: `https://your-project.vercel.app`
  - Backend: `https://your-railway-backend.up.railway.app`
- [ ] Added test credentials table
- [ ] Documented any known limitations

---

## 🚨 Common Issues Checklist

### If Frontend Can't Reach Backend
- [ ] `NEXT_PUBLIC_API_BASE_URL` has NO trailing slash
- [ ] Backend `FRONTEND_URL` matches Vercel URL exactly
- [ ] Backend is running (check Railway logs)
- [ ] CORS configured correctly (check browser console)

### If Authentication Fails
- [ ] Cognito callback URLs include Vercel URL
- [ ] All Cognito env vars match between backend/frontend
- [ ] Variables use correct prefixes:
  - Backend: `AWS_COGNITO_*` and `AWS_REGION`
  - Frontend: `NEXT_PUBLIC_AWS_COGNITO_*` and `NEXT_PUBLIC_AWS_COGNITO_REGION`
- [ ] Test users assigned to correct groups

### If Database Connection Fails
- [ ] Connection string includes `?sslmode=require`
- [ ] Using pooled connection string (recommended)
- [ ] Neon project is active (not paused)
- [ ] Prisma migrations ran successfully

### If File Uploads Fail
- [ ] `STORAGE_DRIVER=local` set in Railway
- [ ] **Warning**: Local uploads lost on Railway redeploy!
- [ ] For production: configure R2 or add Railway volume

---

## 🎯 Success Criteria

Your deployment is complete when ALL of these work:

- ✅ Frontend loads and displays conferences
- ✅ Users can sign up and log in
- ✅ Authenticated users can access dashboards
- ✅ Organizers can create and manage conferences
- ✅ Admins can view users and audit logs
- ✅ API returns data (no CORS or auth errors)
- ✅ Test credentials work for all three roles

---

## 📦 URLs Reference Card

Fill this out as you deploy:

| Service | URL | Status |
|---------|-----|--------|
| **Frontend (Vercel)** | `https://________________.vercel.app` | ⬜ |
| **Backend (Railway)** | `https://________________.up.railway.app` | ⬜ |
| **Database (Neon)** | `ep-__________.neon.tech` | ⬜ |
| **Cognito User Pool** | `us-east-1_________` | ⬜ |

---

## 📞 Need Help?

1. Check `DEPLOYMENT_GUIDE.md` troubleshooting section
2. Review Railway/Vercel logs for errors
3. Test each service independently:
   - Database: Can you connect with psql?
   - Backend: Does `/api/public/conferences` return JSON?
   - Frontend: Does home page load without errors?
   - Auth: Can you sign in to Cognito hosted UI?

Good luck! 🚀
