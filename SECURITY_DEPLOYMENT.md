# Security Deployment Guide

This guide provides step-by-step instructions for securely deploying the QuizMaster application to production with HTTPS/SSL enabled.

## Prerequisites

- Domain name pointing to your server
- Server with root/sudo access (Ubuntu/Debian recommended)
- Basic knowledge of web server configuration

## Quick Checklist

Before deploying to production, ensure:

- [ ] SSL/TLS certificate obtained
- [ ] Web server (Nginx/Apache) configured for HTTPS
- [ ] Environment variables set correctly
- [ ] `NODE_ENV=production` enabled
- [ ] Strong `JWT_SECRET` generated
- [ ] Client and server URLs use HTTPS
- [ ] Firewall configured (ports 80, 443)
- [ ] Security headers tested

---

## Step 1: Obtain SSL/TLS Certificate

### Option A: Let's Encrypt (Recommended - Free)

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (for Nginx)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal with:
sudo certbot renew --dry-run
```

### Option B: CloudFlare (Free with CDN)

1. Add your domain to CloudFlare
2. Update nameservers at your domain registrar
3. Enable "Full (strict)" SSL/TLS mode
4. CloudFlare handles certificates automatically

### Option C: Commercial Certificate

Purchase from providers like DigiCert, Comodo, or your hosting provider.

---

## Step 2: Configure Web Server

### Nginx Configuration

Create `/etc/nginx/sites-available/quizmaster`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server Block
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Certificate (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration (Mozilla Intermediate)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # HSTS (handled by app, but can add here too)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend (React app)
    location / {
        root /var/www/quizmaster/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/quizmaster /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache Configuration

Create `/etc/apache2/sites-available/quizmaster.conf`:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/yourdomain.com/privkey.pem

    # Security Headers
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"

    DocumentRoot /var/www/quizmaster/client/dist

    <Directory /var/www/quizmaster/client/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://localhost:3001/api
    ProxyPassReverse /api http://localhost:3001/api
    ProxyPass /socket.io http://localhost:3001/socket.io
    ProxyPassReverse /socket.io http://localhost:3001/socket.io
</VirtualHost>
```

Enable modules and site:

```bash
sudo a2enmod ssl proxy proxy_http headers rewrite
sudo a2ensite quizmaster
sudo apache2ctl configtest
sudo systemctl reload apache2
```

---

## Step 3: Configure Environment Variables

### Server Environment

Create `/var/www/quizmaster/server/.env`:

```bash
# CRITICAL: Generate a strong secret
JWT_SECRET=$(openssl rand -base64 32)

# Set production environment
NODE_ENV=production

# Your Gemini API key
GEMINI_API_KEY=your_actual_gemini_api_key

# Client URL (HTTPS)
CLIENT_URL=https://yourdomain.com

# Optional
LOG_LEVEL=info
PORT=3001
```

### Client Environment

Create `/var/www/quizmaster/client/.env.production`:

```bash
VITE_API_URL=https://yourdomain.com
```

Build the client:

```bash
cd /var/www/quizmaster/client
npm run build
```

---

## Step 4: Start Application

### Using PM2 (Recommended)

```bash
# Install PM2
sudo npm install -g pm2

# Start server
cd /var/www/quizmaster/server
pm2 start src/index.js --name quizmaster-server

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using systemd

Create `/etc/systemd/system/quizmaster.service`:

```ini
[Unit]
Description=QuizMaster Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/quizmaster/server
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable quizmaster
sudo systemctl start quizmaster
sudo systemctl status quizmaster
```

---

## Step 5: Configure Firewall

```bash
# Allow SSH (if not already)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

## Step 6: Verify Security

### Test SSL Configuration

Visit [SSL Labs Server Test](https://www.ssllabs.com/ssltest/):
- Enter your domain
- Aim for A+ rating

### Test Security Headers

Visit [Security Headers](https://securityheaders.com/):
- Enter your domain
- Check for HSTS, CSP, X-Frame-Options

### Manual Verification

```bash
# Test HTTPS redirect
curl -I http://yourdomain.com
# Should return 301 redirect to https://

# Test HSTS header
curl -I https://yourdomain.com
# Should include: Strict-Transport-Security

# Test authentication
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' \
  -c cookies.txt -v
# Check for Set-Cookie with httpOnly and secure flags
```

### Browser DevTools Check

1. Open your site in Chrome/Firefox
2. Open DevTools (F12)
3. Go to Application → Cookies
4. Verify `auth_token` has:
   - ✅ HttpOnly flag
   - ✅ Secure flag (in production)
   - ✅ SameSite: Strict

---

## Step 7: Monitoring & Maintenance

### Log Monitoring

```bash
# Server logs
pm2 logs quizmaster-server

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Certificate Renewal

Let's Encrypt certificates expire every 90 days:

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-renewal is configured via cron/systemd timer
# Check with:
sudo systemctl status certbot.timer
```

### Security Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies
cd /var/www/quizmaster/server
npm audit
npm audit fix

# Restart application
pm2 restart quizmaster-server
```

---

## Troubleshooting

### Issue: Mixed Content Warnings

**Symptom:** Browser console shows "Mixed Content" errors

**Solution:**
- Ensure all API calls use HTTPS URLs
- Check `VITE_API_URL` is set to HTTPS
- Verify CSP headers include `upgrade-insecure-requests`

### Issue: Cookies Not Being Set

**Symptom:** Authentication fails, no cookies in browser

**Solution:**
- Verify `NODE_ENV=production` is set
- Check `CLIENT_URL` matches your frontend domain
- Ensure CORS is configured correctly
- Verify `credentials: 'include'` in fetch calls

### Issue: HTTPS Redirect Loop

**Symptom:** Page keeps redirecting

**Solution:**
- Check `X-Forwarded-Proto` header in Nginx/Apache config
- Ensure proxy is passing protocol correctly
- Verify app's HTTPS redirect middleware logic

### Issue: WebSocket Connection Failed

**Symptom:** Real-time features not working

**Solution:**
- Verify WebSocket proxy configuration in Nginx/Apache
- Check firewall allows WebSocket connections
- Ensure `Upgrade` and `Connection` headers are set

---

## Performance Optimization

### Enable Gzip Compression (Nginx)

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;
```

### Enable Caching

```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Security Best Practices

1. **Regular Updates:** Keep Node.js, npm packages, and system packages updated
2. **Backup Strategy:** Regular database and file backups
3. **Rate Limiting:** Already implemented in the app
4. **DDoS Protection:** Consider CloudFlare or similar CDN
5. **Monitoring:** Set up uptime monitoring (UptimeRobot, Pingdom)
6. **Logging:** Centralized logging (Papertrail, Loggly)
7. **Secrets Management:** Use environment variables, never commit secrets
8. **Database Security:** Regular backups, encryption at rest

---

## Additional Resources

- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Security Guide](https://nginx.org/en/docs/http/ngx_http_ssl_module.html)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## Support

For issues or questions:
- Check server logs: `pm2 logs`
- Review Nginx/Apache error logs
- Verify environment variables are set correctly
- Test with curl commands to isolate issues
