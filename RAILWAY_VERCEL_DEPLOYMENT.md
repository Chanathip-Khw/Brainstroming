# 🚀 Railway + Vercel Deployment Guide

Quick deployment guide for your collaborative brainstorming app using Railway (backend + database) and Vercel (frontend).

## 🎯 Step-by-Step Deployment

### Part 1: Backend + Database on Railway

1. **Sign up at Railway**
   - Go to [railway.app](https://railway.app)
   - Sign up with your GitHub account

2. **Deploy Backend**
   - Click "Deploy from GitHub repo"
   - Select your repository
   - Choose `backend` as the root directory
   - Railway will automatically detect Node.js and deploy

3. **Add PostgreSQL Database**
   - In your Railway project, click "New"
   - Select "Database" → "PostgreSQL"
   - Railway will automatically create and connect the database

4. **Set Environment Variables**
   - Go to your backend service → "Variables"
   - Add these environment variables:
   ```
   NODE_ENV=production
   JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
   NEXTAUTH_SECRET=your-nextauth-secret-also-32-characters-minimum
   FRONTEND_URL=https://your-app-name.vercel.app
   ```
   
   **Note:** Railway automatically provides:
   - `DATABASE_URL` (from your PostgreSQL service)
   - `PORT` (automatically assigned)

5. **Run Database Migration**
   - Go to your backend service → "Deployments"
   - Click on the latest deployment → "View Logs"
   - If migrations didn't run automatically, use Railway CLI:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and run migration
   railway login
   railway link [your-project-id]
   railway run npx prisma migrate deploy
   ```

6. **Get Your Backend URL**
   - In Railway, go to your backend service → "Settings" → "Domains"
   - Copy the generated URL (e.g., `https://backend-production-xxxx.railway.app`)

### Part 2: Frontend on Vercel

1. **Sign up at Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository
   - **Important:** Set "Root Directory" to `frontend`

3. **Configure Build Settings**
   - Framework Preset: Next.js (auto-detected)
   - Build Command: `npm run build` (default)
   - Output Directory: Leave empty (default)
   - Install Command: `npm install` (default)

4. **Set Environment Variables**
   - Go to "Environment Variables" section
   - Add these variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-railway-backend-url.railway.app
   NEXTAUTH_URL=https://your-vercel-app.vercel.app
   NEXTAUTH_SECRET=same-secret-as-backend
   ```

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your frontend

6. **Get Your Frontend URL**
   - After deployment, copy your Vercel URL
   - Go back to Railway and update the `FRONTEND_URL` variable

## 🔧 Environment Variables Summary

### Railway (Backend)
```env
NODE_ENV=production
JWT_SECRET=your-32-character-minimum-secret
NEXTAUTH_SECRET=your-32-character-minimum-secret
FRONTEND_URL=https://your-app.vercel.app
# DATABASE_URL - Auto-provided by Railway
# PORT - Auto-provided by Railway
```

### Vercel (Frontend)
```env
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=same-as-backend-secret
```

## 🎉 Post-Deployment Steps

1. **Test Your App**
   - Visit your Vercel URL
   - Test user registration/login
   - Test real-time collaboration features
   - Check if backend API calls work

2. **Update CORS (if needed)**
   - If you get CORS errors, update your backend CORS settings
   - Add your Vercel domain to allowed origins

3. **Set up Auto-Deployment**
   - Both Railway and Vercel auto-deploy on git push
   - Push changes to your main branch to trigger deployments

## 🚨 Common Issues & Solutions

### Backend Not Starting
- Check Railway deployment logs
- Ensure all environment variables are set
- Verify database connection

### Frontend Can't Connect to Backend
- Check `NEXT_PUBLIC_API_URL` in Vercel
- Ensure Railway backend is running
- Check for CORS issues

### Database Connection Issues
- Ensure Prisma migrations ran successfully
- Check Railway database service is running
- Verify DATABASE_URL is correctly set

### Authentication Issues
- Ensure `NEXTAUTH_SECRET` is the same on both platforms
- Verify `NEXTAUTH_URL` matches your Vercel domain
- Check JWT_SECRET is properly set

## 💰 Free Tier Limits

### Railway
- $5/month in free credits
- ~500 hours of usage (about 20 days)
- 1GB RAM, 1 vCPU per service
- 100GB outbound bandwidth

### Vercel
- Unlimited static site deployments
- 100GB bandwidth per month
- 1000 serverless function executions per day
- 10GB storage

## 🔄 Making Changes

1. **Code Changes:**
   - Push to your GitHub repository
   - Railway and Vercel will auto-deploy

2. **Database Changes:**
   - Create new Prisma migration locally
   - Push to GitHub
   - Run migration on Railway:
     ```bash
     railway run npx prisma migrate deploy
     ```

3. **Environment Variables:**
   - Update in Railway/Vercel dashboards
   - Redeploy if needed

## 🆘 Need Help?

- **Railway Issues:** Check [Railway Docs](https://docs.railway.app/)
- **Vercel Issues:** Check [Vercel Docs](https://vercel.com/docs)
- **Database Issues:** Check Railway PostgreSQL logs
- **Build Failures:** Check deployment logs in respective platforms

---

**Total Deployment Time:** ~15-20 minutes
**Monthly Cost:** $0 (within free tiers)
**Maintenance:** Minimal (auto-deployments) 