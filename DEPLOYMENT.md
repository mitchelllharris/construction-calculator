# Deployment Guide

This guide provides step-by-step instructions for deploying the Production-Ready Boilerplate to various hosting platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Database Setup](#database-setup)
- [Backend Deployment](#backend-deployment)
- [Frontend Deployment](#frontend-deployment)
- [SSL/HTTPS Setup](#sslhttps-setup)
- [Domain Configuration](#domain-configuration)
- [Post-Deployment Checklist](#post-deployment-checklist)

## Prerequisites

- Node.js (v18 or higher) installed on your server
- MongoDB database (local or MongoDB Atlas)
- Domain name (optional but recommended)
- SSH access to your server (for VPS deployment)
- Git installed

## Environment Setup

### 1. Clone Repository

```bash
git clone <your-repo-url>
cd playground
```

### 2. Install Dependencies

**Backend:**
```bash
cd server
npm install --production
```

**Frontend:**
```bash
cd ../vite-playground
npm install
```

### 3. Configure Environment Variables

**Backend (`server/.env`):**
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
JWT_SECRET=your-strong-production-secret-min-32-chars
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com
EMAIL_SERVICE=sendgrid
EMAIL_FROM=noreply@yourdomain.com
SENDGRID_API_KEY=your-sendgrid-api-key
ADMIN_EMAIL=admin@yourdomain.com
```

**Frontend (`vite-playground/.env`):**
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

## Database Setup

### MongoDB Atlas (Recommended)

1. Create a MongoDB Atlas account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Create a database user
4. Whitelist your server IP address (or use 0.0.0.0/0 for all IPs - less secure)
5. Get your connection string and add it to `server/.env` as `MONGODB_URI`

### Local MongoDB

1. Install MongoDB on your server
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/your-database-name`

## Backend Deployment

### Option 1: VPS (DigitalOcean, AWS EC2, etc.)

1. **SSH into your server:**
   ```bash
   ssh user@your-server-ip
   ```

2. **Install Node.js:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and setup:**
   ```bash
   git clone <your-repo-url>
   cd playground/server
   npm install --production
   ```

4. **Create `.env` file with production variables**

5. **Use PM2 for process management:**
   ```bash
   npm install -g pm2
   pm2 start server.js --name "api-server"
   pm2 save
   pm2 startup
   ```

6. **Configure Nginx as reverse proxy:**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Option 2: Heroku

1. **Install Heroku CLI:**
   ```bash
   npm install -g heroku
   ```

2. **Login and create app:**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-secret
   # ... set all other variables
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

### Option 3: Railway

1. Connect your GitHub repository to Railway
2. Add environment variables in Railway dashboard
3. Railway will automatically detect and deploy Node.js apps

## Frontend Deployment

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Navigate to frontend directory:**
   ```bash
   cd vite-playground
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set environment variables in Vercel dashboard:**
   - `VITE_API_BASE_URL`

### Option 2: Netlify

1. **Build the project:**
   ```bash
   cd vite-playground
   npm run build
   ```

2. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

3. **Deploy:**
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. **Set environment variables in Netlify dashboard**

### Option 3: Static Hosting (AWS S3, Cloudflare Pages, etc.)

1. **Build the project:**
   ```bash
   cd vite-playground
   npm run build
   ```

2. **Upload `dist` folder contents to your static hosting service**

3. **Configure environment variables** (if supported by your hosting provider)

## SSL/HTTPS Setup

### Using Let's Encrypt (Free SSL)

1. **Install Certbot:**
   ```bash
   sudo apt-get update
   sudo apt-get install certbot python3-certbot-nginx
   ```

2. **Obtain certificate:**
   ```bash
   sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
   ```

3. **Auto-renewal (already configured by Certbot):**
   ```bash
   sudo certbot renew --dry-run
   ```

### Using Cloudflare

1. Add your domain to Cloudflare
2. Update nameservers
3. Enable SSL/TLS encryption mode: "Full (strict)"
4. Cloudflare provides free SSL certificates

## Domain Configuration

### DNS Records

**For Backend API:**
```
Type: A
Name: api
Value: your-server-ip
TTL: 3600
```

**For Frontend:**
```
Type: A
Name: @
Value: your-frontend-hosting-ip
TTL: 3600
```

**Or use CNAME if using hosting service:**
```
Type: CNAME
Name: @
Value: your-app.vercel.app
TTL: 3600
```

## Post-Deployment Checklist

- [ ] All environment variables are set correctly
- [ ] Database connection is working
- [ ] API endpoints are accessible
- [ ] Frontend can connect to backend API
- [ ] SSL/HTTPS is configured and working
- [ ] Email service is configured and tested
- [ ] Health check endpoint (`/api/health`) is responding
- [ ] Error logging is working
- [ ] Rate limiting is active
- [ ] CORS is configured for production domains only
- [ ] JWT_SECRET is strong and secure (32+ characters)
- [ ] `.env` files are not committed to repository
- [ ] Database backups are configured
- [ ] Monitoring is set up (optional but recommended)

## Monitoring & Maintenance

### Health Checks

Monitor the health endpoint:
```bash
curl https://api.yourdomain.com/api/health
```

### Logs

**PM2 logs:**
```bash
pm2 logs api-server
```

**Nginx logs:**
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Updates

1. Pull latest changes:
   ```bash
   git pull origin main
   ```

2. Install dependencies:
   ```bash
   npm install --production
   ```

3. Restart application:
   ```bash
   pm2 restart api-server
   ```

## Troubleshooting

### Backend won't start
- Check environment variables are set correctly
- Verify MongoDB connection string
- Check port 8080 is not in use
- Review server logs: `pm2 logs api-server`

### Frontend can't connect to API
- Verify `VITE_API_BASE_URL` is correct
- Check CORS configuration allows your frontend domain
- Ensure backend is running and accessible

### Database connection errors
- Verify MongoDB URI is correct
- Check IP whitelist (for MongoDB Atlas)
- Ensure database user has correct permissions

### SSL certificate issues
- Verify domain DNS is pointing correctly
- Check certificate hasn't expired
- Ensure port 443 is open in firewall

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong JWT secrets** (32+ random characters)
3. **Enable HTTPS** for all production traffic
4. **Restrict CORS** to only your frontend domain(s)
5. **Keep dependencies updated** regularly
6. **Use environment-specific configurations**
7. **Enable database backups**
8. **Monitor for security vulnerabilities**

## Support

For deployment issues, check:
- Server logs
- Application logs
- Database connection status
- Network/firewall configuration

---

**Note**: Always test deployments in a staging environment before deploying to production.

