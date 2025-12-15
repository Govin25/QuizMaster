# Quainy Security Quick Reference

## 🚨 Before Production Deployment

### 1. Generate Strong JWT Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and add to `.env`:
```
JWT_SECRET=<your_generated_secret>
```

### 2. Update Environment Variables
```bash
# .env file
NODE_ENV=production
CLIENT_URL=https://yourdomain.com
JWT_SECRET=<strong_secret_from_step_1>
```

### 3. Enable HTTPS
- Use SSL certificate (Let's Encrypt recommended)
- Redirect all HTTP to HTTPS

## 🔒 Security Features Enabled

- ✅ Helmet security headers
- ✅ Rate limiting (auth: 5/15min, uploads: 10/hour, API: 100/15min)
- ✅ Input validation on all endpoints
- ✅ SQL injection protection
- ✅ XSS protection
- ✅ File upload security (MIME + extension validation)
- ✅ Authorization checks
- ✅ Security monitoring & logging

## 📊 Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Auth (login/signup) | 5 requests | 15 minutes |
| File uploads | 10 uploads | 1 hour |
| Quiz creation | 20 quizzes | 1 hour |
| General API | 100 requests | 15 minutes |

## 🔐 Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number

## 📝 Monitoring

Check logs for:
- `🚨 Suspicious request detected` - Potential attacks
- `⚠️ Slow request` - Performance issues
- `⚠️ WARNING: Using default JWT_SECRET` - Security misconfiguration

## 🛠️ Troubleshooting

### Rate Limit Errors (429)
- Wait for the time window to expire
- Adjust limits in `rateLimiter.js` if needed

### Validation Errors (400)
- Check error response for specific field issues
- Ensure data meets validation requirements

### Authorization Errors (403)
- User attempting to access resources they don't own
- Check user role and permissions
