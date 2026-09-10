# 🚀 Fix: Email Not Sending in Vercel Production

## ❌ Problem
- ✅ Emails working on localhost
- ❌ Emails NOT working after Vercel deployment
- Contact form submissions saved but emails not delivered

## 🔍 Root Cause
SMTP environment variables are set in local `.env` file but **NOT set in Vercel dashboard**.

---

## ✅ Solution: Set Environment Variables in Vercel

### Step 1: Login to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Login with your account
3. Select your project: **adyapan-ai** (or your backend project name)

### Step 2: Navigate to Environment Variables
1. Click on **Settings** tab
2. Click on **Environment Variables** from left sidebar
3. You should see a page to add environment variables

### Step 3: Add SMTP Variables

Click **"Add New"** for each variable:

#### Variable 1: SMTP_HOST
```
Key:   SMTP_HOST
Value: smtp.gmail.com
Environment: ✅ Production ✅ Preview ✅ Development
```

#### Variable 2: SMTP_PORT
```
Key:   SMTP_PORT
Value: 465
Environment: ✅ Production ✅ Preview ✅ Development
```

#### Variable 3: SMTP_USER
```
Key:   SMTP_USER
Value: support@adyapan.com
Environment: ✅ Production ✅ Preview ✅ Development
```

#### Variable 4: SMTP_PASS (Important! 🔐)
```
Key:   SMTP_PASS
Value: [Your Gmail App Password - see below]
Environment: ✅ Production ✅ Preview ✅ Development
```

#### Variable 5: ADMIN_EMAIL
```
Key:   ADMIN_EMAIL
Value: support@adyapan.com
Environment: ✅ Production ✅ Preview ✅ Development
```

---

## 🔐 How to Get Gmail App Password

### Prerequisites
- Gmail account with 2-Step Verification enabled
- If 2-Step just enabled, wait 24 hours

### Steps:

1. **Go to Google Account**
   - Visit: https://myaccount.google.com/security
   - Login with your Gmail account

2. **Enable 2-Step Verification** (if not already)
   - Find "2-Step Verification"
   - Click "Get started"
   - Follow the setup wizard

3. **Create App Password**
   - Visit: https://myaccount.google.com/apppasswords
   - Or search "App passwords" in Google Account settings

4. **Generate Password**
   - Select app: **Mail**
   - Select device: **Other (Custom name)**
   - Enter name: "Adyapan AI Backend"
   - Click **Generate**

5. **Copy the Password**
   - You'll see a 16-character password like: `abcd efgh ijkl mnop`
   - **Remove all spaces**: `abcdefghijklmnop`
   - Copy this for SMTP_PASS

6. **Important Notes**
   - ⚠️  This password is shown only once
   - ⚠️  Save it securely (password manager)
   - ⚠️  Use this password, NOT your Gmail login password
   - ⚠️  Remove spaces when pasting in Vercel

---

## 📸 Visual Guide: Vercel Setup

### Where to Add Variables:
```
Vercel Dashboard
└── Your Project (adyapan-ai-backend)
    └── Settings
        └── Environment Variables
            └── [Add New Variable button]
```

### Example Screenshot Layout:
```
┌─────────────────────────────────────────┐
│ Environment Variables                    │
├─────────────────────────────────────────┤
│                                          │
│ [Add New] button                         │
│                                          │
│ Existing Variables:                      │
│ ┌────────────────────────────────────┐  │
│ │ DATABASE_URL        ***            │  │
│ │ JWT_SECRET          ***            │  │
│ │ SMTP_HOST          smtp.gmail.com │  │
│ │ SMTP_PORT          465            │  │
│ │ SMTP_USER          support@...    │  │
│ │ SMTP_PASS          ***            │  │
│ │ ADMIN_EMAIL        support@...    │  │
│ └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🔄 Step 4: Redeploy

After adding all environment variables:

### Option A: Automatic Redeploy
- Vercel might automatically redeploy
- Check **Deployments** tab for new build

### Option B: Manual Redeploy
1. Go to **Deployments** tab
2. Find latest deployment
3. Click **⋮** (three dots) → **Redeploy**
4. Or push any small commit to trigger deployment

### Option C: CLI Redeploy
```bash
cd backend
vercel --prod
```

---

## ✅ Step 5: Verify

### Check Deployment Logs
1. Go to **Deployments** tab in Vercel
2. Click on latest deployment
3. Click **Functions** → Select your function
4. Look for logs:
   ```
   ✅ [Mailer] Admin alert sent successfully
   ✅ [Mailer] User confirmation sent successfully
   ```

### Test Contact Form
1. Go to your production website
2. Submit contact form
3. Check:
   - Form submission successful ✅
   - Admin email received notification ✅
   - User received confirmation ✅

---

## 🐛 Troubleshooting

### Issue 1: Still Not Working After Adding Variables

**Check:**
- [ ] Did you select **Production** environment when adding variables?
- [ ] Did you redeploy after adding variables?
- [ ] Is App Password correct (16 chars, no spaces)?
- [ ] Check Vercel function logs for errors

**Solution:**
```bash
# Check if variables are accessible in production
# Add this temporarily to your code:
console.log("SMTP Config:", {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS ? "SET" : "NOT SET"
});
```

### Issue 2: Authentication Error (535-5.7.8)

**Error Message:**
```
Invalid login: 535-5.7.8 Username and Password not accepted
```

**Cause:** Wrong App Password or using regular Gmail password

**Solution:**
1. Delete old App Password in Google Account
2. Generate new App Password
3. Update `SMTP_PASS` in Vercel
4. Redeploy

### Issue 3: Connection Timeout

**Error Message:**
```
ETIMEDOUT connecting to smtp.gmail.com:465
```

**Cause:** Vercel firewall or network issue

**Solution:**
Try alternative SMTP configuration:
```
SMTP_PORT=587
# Update code to use STARTTLS instead of SSL
```

### Issue 4: Variables Not Showing in Logs

**Symptom:**
```
⚠️  [Mailer] SMTP not configured properly
SMTP_USER: NOT SET
```

**Cause:** Variables not in Production environment or typo in variable name

**Solution:**
1. Go to Vercel → Settings → Environment Variables
2. Verify each variable has **Production** checked
3. Check for typos in variable names (case-sensitive)
4. Redeploy after fixing

---

## 📋 Quick Checklist

Before contacting support, verify:

- [ ] 2-Step Verification enabled on Gmail
- [ ] Gmail App Password generated (not regular password)
- [ ] All 5 SMTP variables added in Vercel
- [ ] Variables added to **Production** environment
- [ ] App Password has no spaces
- [ ] Redeployed after adding variables
- [ ] Checked Vercel function logs for errors
- [ ] Tested with actual contact form submission

---

## 🎯 Expected Result

After completing all steps:

```
User submits contact form
        ↓
Backend receives request
        ↓
Saves to database ✅
        ↓
Sends 2 emails:
  1. Admin notification → support@adyapan.com ✅
  2. User confirmation → user@email.com ✅
        ↓
Returns success response ✅
```

---

## 📞 Still Need Help?

### Check These First:
1. **Local Test**: Run `npm run test:smtp` locally - should work ✅
2. **Env Check**: Run `npm run check:env` - should pass all checks ✅
3. **Vercel Logs**: Check function logs for detailed error messages

### Contact Information:
- Email: support@adyapan.com
- Include in your message:
  - Screenshot of Vercel environment variables (hide values)
  - Error from Vercel function logs
  - Steps already tried

---

## 📚 Related Documentation

- [DEPLOYMENT.md](./backend/DEPLOYMENT.md) - Complete deployment guide
- [Google App Passwords Guide](https://support.google.com/accounts/answer/185833)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)

---

## ✨ Summary

**Problem**: Localhost ✅ | Production ❌

**Solution**: 
1. Get Gmail App Password
2. Add 5 SMTP variables to Vercel
3. Redeploy
4. Test

**Result**: Localhost ✅ | Production ✅

---

Last Updated: January 2026
