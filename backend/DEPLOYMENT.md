# 🚀 Deployment Guide - Adyapan AI Backend

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Setup

All these environment variables must be set in your deployment platform (Vercel/Railway/etc.)

#### ✅ Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | `your-secure-random-string-here` |
| `FRONTEND_URL` | Production frontend URL | `https://ai.adyapan.com` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `465` |
| `SMTP_USER` | Email address for sending | `support@adyapan.com` |
| `SMTP_PASS` | Gmail App Password (16 chars) | `abcd efgh ijkl mnop` |
| `ADMIN_EMAIL` | Admin email for notifications | `support@adyapan.com` |

#### 🔐 OAuth (Optional but Recommended)

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GOOGLE_CALLBACK_URL` | Google OAuth callback URL |
| `GITHUB_CLIENT_ID` | GitHub OAuth Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth Client Secret |
| `GITHUB_CALLBACK_URL` | GitHub OAuth callback URL |

#### 🤖 AI Services (Optional)

| Variable | Description |
|----------|-------------|
| `GROQ_API_KEY` | Groq API key for LLM |
| `GEMINI_API_KEY` | Google Gemini API key |
| `OPENROUTER_API_KEY` | OpenRouter API key |
| `NVIDIA_API_KEY` | NVIDIA API key for embeddings |

---

## 📧 SMTP Configuration Guide

### Problem: Emails not sending in production

**Common Causes:**
1. ❌ SMTP environment variables not set in deployment platform
2. ❌ Using placeholder password (`your_gmail_app_password_here`)
3. ❌ Using regular Gmail password instead of App Password
4. ❌ Gmail App Password not generated

### Solution: Setup Gmail App Password

#### Step 1: Enable 2-Step Verification
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Wait 24 hours if just enabled (Google security requirement)

#### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Enter "Adyapan AI Backend"
4. Click **Generate**
5. Copy the **16-character password** (format: `xxxx xxxx xxxx xxxx`)

#### Step 3: Set in Deployment Platform

##### For Vercel:
```bash
# Go to your project dashboard
# Settings → Environment Variables → Add New

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=support@adyapan.com
SMTP_PASS=abcdefghijklmnop  # Remove spaces from App Password
ADMIN_EMAIL=support@adyapan.com
```

##### For Railway:
```bash
# Go to your project
# Variables tab → Add Variable

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=support@adyapan.com
SMTP_PASS=abcdefghijklmnop
ADMIN_EMAIL=support@adyapan.com
```

#### Step 4: Redeploy
After adding environment variables, trigger a new deployment or redeploy the application.

---

## 🧪 Testing SMTP Configuration

### Local Testing
```bash
cd backend
npm run test:smtp
# or
npx tsx test-smtp.ts
```

### Check Environment Variables
```bash
npm run check:env
# or
npx tsx check-env.ts
```

---

## 🔍 Debugging Email Issues

### Check Application Logs

#### Vercel:
1. Go to your project dashboard
2. Click on **Deployments**
3. Click on the latest deployment
4. Check **Functions** logs

Look for these messages:
- ✅ `[Mailer] Admin alert sent successfully`
- ✅ `[Mailer] User confirmation sent successfully`
- ❌ `[Mailer] Cannot send admin alert - SMTP not configured`
- ❌ `[Contact] Email send error: Invalid login`

#### Common Error Messages:

| Error | Cause | Solution |
|-------|-------|----------|
| `Invalid login: 535-5.7.8 Username and Password not accepted` | Wrong App Password | Regenerate App Password |
| `SMTP not configured properly` | Missing env variables | Add SMTP_* variables |
| `ETIMEDOUT` or `ECONNECTION` | Network/Firewall issue | Check deployment platform allows port 465 |
| `Missing credentials` | SMTP_USER or SMTP_PASS not set | Set environment variables |

---

## 📝 Environment Variable Setup Commands

### Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Set environment variables
vercel env add SMTP_HOST production
vercel env add SMTP_PORT production
vercel env add SMTP_USER production
vercel env add SMTP_PASS production
vercel env add ADMIN_EMAIL production

# Pull environment variables to local
vercel env pull
```

### Railway CLI
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Set environment variables
railway variables set SMTP_HOST=smtp.gmail.com
railway variables set SMTP_PORT=465
railway variables set SMTP_USER=support@adyapan.com
railway variables set SMTP_PASS=your-app-password
railway variables set ADMIN_EMAIL=support@adyapan.com
```

---

## 🔧 Troubleshooting

### Issue: Email works locally but not in production

**Checklist:**
- [ ] All SMTP environment variables are set in deployment platform
- [ ] App Password is correct (16 chars, no spaces)
- [ ] Variables are set for **Production** environment (not Preview)
- [ ] Application has been redeployed after setting variables
- [ ] Check deployment logs for SMTP errors
- [ ] Verify 2-Step Verification is enabled on Google Account

### Issue: Authentication errors (535-5.7.8)

**Solution:**
1. Delete old App Password in Google Account
2. Generate new App Password
3. Update `SMTP_PASS` in deployment
4. Redeploy

### Issue: Connection timeout

**Possible Causes:**
- Deployment platform firewall blocking port 465
- Wrong SMTP host/port combination

**Solution:**
- Try port 587 with TLS instead:
  ```
  SMTP_PORT=587
  # Update mailer.ts: secure: false
  ```

---

## 🎯 Quick Fix Checklist

When emails aren't sending in production:

1. ✅ Run `npx tsx check-env.ts` to verify local config
2. ✅ Check Vercel Environment Variables are set
3. ✅ Verify App Password is correct (not regular password)
4. ✅ Check deployment logs for error messages
5. ✅ Ensure variables are in **Production** scope
6. ✅ Trigger new deployment after variable changes
7. ✅ Test contact form after deployment
8. ✅ Check admin email inbox for test message

---

## 📞 Support

If issues persist:
1. Check deployment platform logs
2. Verify SMTP configuration with `test-smtp.ts`
3. Contact support@adyapan.com with:
   - Error logs from deployment
   - Environment variable names (not values)
   - Deployment platform name

---

## 🔒 Security Notes

- ⚠️  Never commit `.env` file to Git
- ⚠️  Use App Passwords, never regular Gmail password
- ⚠️  Rotate secrets regularly
- ⚠️  Use environment-specific credentials
- ⚠️  Enable 2FA on all service accounts
