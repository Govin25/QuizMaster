# Vercel Deployment Guide

## Recommended Approach: Split Deployment

Since this app uses Socket.IO and SQLite, the best approach is to deploy frontend and backend separately.

### Option 1: Frontend on Vercel (Recommended)

**1. Deploy Frontend to Vercel:**
- The `vercel.json` is configured for frontend-only deployment
- Vercel will build the React app from the `client` directory

**2. Deploy Backend Separately:**
- Use Railway, Render, or Heroku for the backend
- These platforms support WebSockets and persistent databases better

**3. Environment Variables in Vercel:**
- `VITE_API_URL` = `https://your-backend-url.railway.app` (or your backend URL)

### Option 2: Full Stack on Railway/Render

Deploy the entire monorepo to Railway or Render for better Socket.IO support.

## Vercel Setup (Frontend Only)

### Step 1: Prepare Backend
Deploy your backend to Railway/Render first:
1. Create new project on Railway/Render
2. Connect your GitHub repo
3. Set root directory to `server`
4. Add environment variables:
   - `PORT` (Railway/Render will provide)
   - `JWT_SECRET` = `your-production-secret`
   - `CLIENT_URL` = `https://your-app.vercel.app`

### Step 2: Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Import your repository
3. Vercel will auto-detect the configuration from `vercel.json`
4. Add environment variable:
   - `VITE_API_URL` = `https://your-backend-url.railway.app`
5. Deploy!

## Environment Variables Summary

### Backend (Railway/Render):
```env
PORT=3001
JWT_SECRET=your-production-secret-key-here
CLIENT_URL=https://your-app.vercel.app
```

### Frontend (Vercel):
```env
VITE_API_URL=https://your-backend-url.railway.app
```

## Database Migration

⚠️ **Important:** SQLite won't work in production. Migrate to PostgreSQL:

1. **Railway Postgres** (easiest):
   - Add PostgreSQL plugin in Railway
   - Update `server/src/db.js` to use PostgreSQL
   - Install `pg` package: `npm install pg`

2. **Update db.js** to use PostgreSQL instead of SQLite

## Testing Locally with Production URLs

```bash
# In server/.env
CLIENT_URL=http://localhost:5173

# In client/.env  
VITE_API_URL=http://localhost:3001

# Run both
npm run dev
```
