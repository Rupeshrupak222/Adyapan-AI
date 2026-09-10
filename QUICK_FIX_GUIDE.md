# ⚡ Quick Fix Guide - Email Not Sending in Production

## 🎯 Problem
✅ Localhost works | ❌ Production doesn't

## 🔧 Quick Fix (5 Minutes)

### Step 1: Get Gmail App Password (2 min)
1. Go to: https://myaccount.google.com/apppasswords
2. Click "Generate"
3. Copy 16-character password (remove spaces)
4. Example: `abcdefghijklmnop`

### Step 2: Add to Vercel (2 min)
1. Go to: Vercel Dashboard → Your Project
2. Click: **Settings** → **Environment Variables**
3. Add these 5 variables:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=support@adyapan.com
SMTP_PASS=your-app-password-here
ADMIN_EMAIL=support@adyapan.com
```

✅ Check: Production, Preview, Development

### Step 3: Redeploy (1 min)
1. Go to: **Deployments** tab
2. Click: Latest deployment → **⋮** → **Redeploy**
3. Wait for build to complete

### Step 4: Test
1. Go to your production website
2. Submit contact form
3. Check email inbox

---

## 🚀 Done!

✅ Localhost working
✅ Production working

---

## 📚 Detailed Guides

- **Step-by-step**: `VERCEL_SMTP_SETUP.md`
- **Technical details**: `DEPLOYMENT.md`
- **All changes**: `EMAIL_FIX_SUMMARY.md`

---

## 🆘 Still Not Working?

Run locally:
```bash
cd backend
npm run check:env
npm run test:smtp
```

Check Vercel logs for error messages.

---

**That's it! 🎉**
