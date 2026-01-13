# Conference Master Deployment Guide

This guide provides step-by-step instructions for deploying Conference Master to production.

## Recommended Architecture

- **Frontend**: Vercel (Next.js)
- **Backend**: Railway (Express API)
- **Database**: Neon (Serverless PostgreSQL)
- **Authentication**: AWS Cognito
- **File Storage**: AWS S3

---

## Part 1: Database Setup (Neon PostgreSQL)

### Step 1: Create Neon Account and Project

1. Go to https://neon.tech
2. Sign up with GitHub or email
3. Click "Create a project"
4. Project settings:
   - Name: `conference-master-prod`
   - Region: Choose closest to your users (e.g., US East, EU West)
   - PostgreSQL version: 16 (latest stable)
5. Click "Create project"

### Step 2: Get Database Connection String

After project creation, Neon will show your connection string:

```
postgresql://[user]:[password]@[endpoint]/[database]?sslmode=require
```

**Important**: Copy this connection string - you'll need it for backend deployment.

Example format:
```
postgresql://neondb_owner:AbCdEf123456@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
```

### Step 3: Configure Connection Pooling (Recommended)

1. In Neon dashboard, go to "Connection Details"
2. Enable "Connection pooling"
3. Copy the pooled connection string (has `-pooler` in the endpoint)
4. Use this for your production DATABASE_URL

---

## Part 2: AWS Cognito Setup

### Step 1: Create User Pool

1. Go to AWS Console → Cognito
2. Click "Create user pool"
3. Configuration:
   - **Sign-in options**: Email
   - **Password policy**: Default
   - **MFA**: Optional (OFF for easier testing, ON for production)
   - **User account recovery**: Email only
   - **Self-service sign-up**: Enabled
   - **Attribute verification**: Email required

4. Configure app client:
   - **App type**: Public client
   - **App client name**: `conference-master-web`
   - **Authentication flows**: 
     - ✓ ALLOW_USER_PASSWORD_AUTH
     - ✓ ALLOW_REFRESH_TOKEN_AUTH
   - **OAuth 2.0 flows**:
     - ✓ Authorization code grant
     - ✓ Implicit grant
   - **Callback URLs**: (add your Vercel URL after deployment)
     ```
     http://localhost:3000/api/auth/callback
     https://your-app.vercel.app/api/auth/callback
     ```
   - **Sign-out URLs**:
     ```
     http://localhost:3000
     https://your-app.vercel.app
     ```

5. Click "Create user pool"

### Step 2: Configure User Groups (Roles)

1. In your user pool, go to "Groups"
2. Create three groups:
   - Group name: `user` (default role)
   - Group name: `organizer` (conference creators)
   - Group name: `admin` (system administrators)

### Step 3: Copy Configuration Values

From your Cognito User Pool, note these values:
- **User Pool ID**: `us-east-1_AbCdEf123` (found in "User pool overview")
- **App Client ID**: `1a2b3c4d5e6f7g8h9i0j` (found in "App integration" → "App clients")
- **Region**: `us-east-1` (from User Pool ID)
- **Issuer**: `https://cognito-idp.{region}.amazonaws.com/{UserPoolId}`

---

## Part 3: Backend Deployment (Railway)

### Step 1: Prepare Backend for Deployment

1. Your `server/package.json` already has the correct scripts:

```json
{
  "scripts": {
    "build": "rimraf dist && npx tsc",
    "start": "npm run build && node dist/index.js"
  }
}
```

**Note**: The backend entry point is `src/index.ts` (compiles to `dist/index.js`), not `server.ts`.

2. Your `server/tsconfig.json` uses ES modules:

```json
{
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "es2016"
  }
}
```

### Step 2: Deploy to Railway

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your `Conference-Master-Web-App` repository
5. Railway will detect it's a monorepo - configure for backend:
   - **Root Directory**: `/server`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `node dist/index.js`
   - **Watch Paths**: `/server/**`

### Step 3: Configure Environment Variables

In Railway project settings → Variables, add:

```bash
### Step 3: Configure Environment Variables

In Railway project settings → Variables, add:

```bash
# Database (from Neon)
DATABASE_URL=postgresql://neondb_owner:...@ep-....neon.tech/neondb?sslmode=require

# Server (PORT defaults to 3001 if not specified, but you can override)
PORT=3001
NODE_ENV=production

# Frontend URL for CORS (add after Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app

# AWS Cognito (from Part 2)
AWS_REGION=us-east-1
AWS_COGNITO_USER_POOL_ID=us-east-1_AbCdEf123
AWS_COGNITO_USER_POOL_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j

# Storage for file uploads
# IMPORTANT: Railway ephemeral filesystem means local uploads are LOST on redeploy!
# For production, use R2 or add Railway volume (see troubleshooting)
STORAGE_DRIVER=local

# Cloudflare R2 configuration (recommended for production):
# Sign up at https://cloudflare.com → R2 → Create bucket
# R2_ACCOUNT_ID=your_cloudflare_account_id
# R2_ACCESS_KEY_ID=your_r2_access_key
# R2_SECRET_ACCESS_KEY=your_r2_secret_key
# R2_BUCKET_NAME=conference-uploads
# R2_PUBLIC_URL=https://your-bucket.r2.dev
```

**Note**: The backend uses `FRONTEND_URL` for CORS configuration. Add it after you deploy the frontend to Vercel.

### Step 4: Run Database Migrations

1. In Railway, open your service
2. Click "Settings" → "Deploy"
3. After deployment, click "⋮" → "Run command"
4. Execute: `npx prisma migrate deploy`

### Step 5: Get Backend URL

Railway will assign a URL like: `https://conference-master-backend-production.up.railway.app`

**Note**: Your backend doesn't have a `/health` endpoint. Test the root endpoint or an API route like `/api/public/conferences` instead.

---

## Part 4: Frontend Deployment (Vercel)

### Step 1: Prepare Frontend for Deployment

Your `client/package.json` has the correct Next.js scripts:

```json
{
  "scripts": {
    "dev": "cross-env NEXT_DISABLE_TURBOPACK=1 next dev",
    "build": "cross-env NEXT_DISABLE_TURBOPACK=1 next build",
    "start": "next start"
  }
}
```

**Note**: Turbopack is disabled intentionally. Your Next.js config already has proper image and redirect configuration.

### Step 2: Deploy to Vercel

1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "Add New..." → "Project"
4. Import your `Conference-Master-Web-App` repository
5. Configure project:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install`

### Step 3: Configure Environment Variables

In Vercel project settings → Environment Variables, add:

```bash
# API Backend URL (from Railway deployment in Part 3)
NEXT_PUBLIC_API_BASE_URL=https://your-railway-backend.up.railway.app

# AWS Cognito (must match backend configuration exactly)
NEXT_PUBLIC_AWS_COGNITO_REGION=us-east-1
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID=us-east-1_AbCdEf123
NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID=1a2b3c4d5e6f7g8h9i0j
```

**Important**: Use `NEXT_PUBLIC_AWS_COGNITO_REGION` (not just `COGNITO_REGION`) - Next.js requires `NEXT_PUBLIC_` prefix for client-side variables.

### Step 4: Deploy

Click "Deploy" - Vercel will build and deploy your frontend.

Your app will be available at: `https://your-project.vercel.app`

---

## Part 5: Final Configuration

### Step 1: Update Backend CORS Configuration

1. Go back to Railway → your backend service → Variables
2. Add or update `FRONTEND_URL` with your Vercel URL:
   ```
   FRONTEND_URL=https://your-project.vercel.app
   ```
3. Redeploy backend: Settings → Deploy → "Redeploy"

**Why**: The backend's CORS middleware uses `FRONTEND_URL` to allow cross-origin requests from your frontend.

### Step 2: Update Cognito Callback URLs

1. Go to AWS Cognito → Your User Pool → App integration → App clients
2. Edit your app client
3. Update Callback URLs to include your Vercel URL:
   ```
   https://your-project.vercel.app/api/auth/callback
   ```
4. Update Sign-out URLs:
   ```
   https://your-project.vercel.app
   ```

### Step 3: Seed Test Data

1. In Railway, click "⋮" → "Run command"
2. Run one of these seed scripts based on your needs:

```bash
# Basic seed with essential data
npm run seed

# Full seed with comprehensive sample data
npm run seed:full

# Manual test seed (for specific test scenarios)
npm run seed:manual-test
```

**Available seed scripts** (from `server/package.json`):
- `seed` - Basic seed for development
- `seed:full` - Complete dataset with multiple conferences and submissions
- `seed:manual-test` - Specific test scenarios
- `seed:manual-test-main` - Alternative test configuration

### Step 4: Create Test Users in Cognito

1. Go to AWS Cognito → Users → Create user
2. Create three users:

**Test User:**
- Email: `test.user@conference-master.dev`
- Temporary password: `TempPass2026!`
- Group: `user`

**Test Organizer:**
- Email: `test.organizer@conference-master.dev`
- Temporary password: `TempPass2026!`
- Group: `organizer`

**Test Admin:**
- Email: `test.admin@conference-master.dev`
- Temporary password: `TempPass2026!`
- Group: `admin`

---

## Part 6: Verification

### Test Public Access
1. Visit: `https://your-project.vercel.app`
2. Should see: Home page with conferences list
3. Browse: Click on a published conference

### Test Authentication
1. Click "Sign In"
2. Use test user credentials
3. Should redirect to dashboard after login

### Test Backend Health

Your backend doesn't have a dedicated `/health` endpoint. Test these instead:

1. **Root endpoint**: `https://your-railway-url.up.railway.app/`
   - May return 404 or Express default response (this is normal)

2. **Public API**: `https://your-railway-url.up.railway.app/api/public/conferences`
   - Should return: Array of published conferences (JSON)

3. **Check Railway logs** for startup messages confirming Express is running on the configured port.

---

## Part 7: Update Thesis Appendix C

Update `THESIS_OFFICIAL.md` Appendix C.1 with your actual URLs:

```markdown
**Frontend Application:** https://your-project.vercel.app
**Backend API:** https://conference-master-api.up.railway.app

**Test Credentials:**

| Role | Email | Password | Capabilities |
|------|-------|----------|--------------|
| User | test.user@conference-master.dev | TestUser2026! | Submit to conferences, register, favorites |
| Organizer | test.organizer@conference-master.dev | TestOrganizer2026! | Create conferences, manage submissions, build schedules |
| Admin | test.admin@conference-master.dev | TestAdmin2026! | System oversight, user management |
```

---

## Cost Breakdown (All Free Tier)

- **Neon PostgreSQL**: Free tier (0.5 GB storage, ~100 hours compute/month)
- **Railway**: Free tier ($5 credit/month, enough for small API)
- **Vercel**: Free tier (100 GB bandwidth, unlimited deployments)
- **AWS Cognito**: Free tier (50,000 MAU)
- **Total**: $0/month for thesis evaluation period

---

## Alternative: All-Railway Setup (Simpler)

If you prefer a single platform:

1. Deploy backend to Railway (as above)
2. Add PostgreSQL directly in Railway:
   - In Railway project, click "+ New"
   - Select "Database" → "PostgreSQL"
   - Railway auto-configures DATABASE_URL
3. Deploy frontend to Railway instead of Vercel:
   - Add another service in same project
   - Root Directory: `/client`
   - Build: `npm run build`
   - Start: `npm start`

**Pros**: Everything in one dashboard, simpler networking
**Cons**: Railway frontend not as optimized as Vercel for Next.js

---

## Troubleshooting

### Backend won't start
- Check Railway logs for errors
- Verify DATABASE_URL is correct
- Ensure Prisma migrations ran: `npx prisma migrate deploy`

### Frontend can't reach backend
- Verify `NEXT_PUBLIC_API_BASE_URL` (not `NEXT_PUBLIC_API_URL`) is set correctly in Vercel
- Backend URL should NOT have trailing slash
- Check Railway backend logs to see if requests are arriving
- Test backend API endpoint directly in browser: `/api/public/conferences`

### Database connection errors
- Check Neon project is active (doesn't auto-suspend on free tier)
- Verify connection string includes `?sslmode=require`
- Use pooled connection string for better performance

### Authentication not working
- Verify Cognito callback URLs match your Vercel URL exactly (including `/api/auth/callback`)
- Check that environment variables use correct naming:
  - Backend: `AWS_COGNITO_USER_POOL_ID`, `AWS_COGNITO_USER_POOL_CLIENT_ID`, `AWS_REGION`
  - Frontend: `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_ID`, `NEXT_PUBLIC_AWS_COGNITO_USER_POOL_CLIENT_ID`, `NEXT_PUBLIC_AWS_COGNITO_REGION`
- Ensure users are added to appropriate Cognito groups (`user`, `organizer`, `admin`)
- Ensure users are assigned to correct groups (user/organizer/admin)

---

## Next Steps After Deployment

1. ✅ Update thesis Appendix C.1 with live URLs
2. ✅ Test all workflows with thesis evaluators
3. ✅ Monitor Railway logs for any runtime errors
4. ✅ Set up custom domain (optional): 
   - Vercel: Project settings → Domains
   - Railway: Service settings → Networking → Custom domain

---

## Production Recommendations (Beyond Thesis)

For production use beyond thesis evaluation:

- **Database**: Upgrade Neon to paid tier or use AWS RDS for guaranteed uptime
- **Backend**: Use Railway Pro ($5/month) or AWS ECS for better performance
- **File Storage**: Implement S3 presigned uploads (already in code, just needs AWS credentials)
- **Monitoring**: Add error tracking (Sentry, LogRocket)
- **Email**: Integrate AWS SES for transactional emails
- **Custom Domain**: conference-master.com via Vercel/Railway

Good luck with deployment! Let me know if you hit any issues.
