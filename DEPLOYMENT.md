# Deployment Guide - DigitalOcean App Platform

This guide walks you through deploying the OM Dayal CRM Server to DigitalOcean using App Platform.

**Two deployment methods available:**
1. **App Spec YAML** (Recommended - Infrastructure as Code) → See [YAML Deployment](#yaml-deployment-recommended)
2. **Dashboard UI** (Manual configuration) → See [Dashboard Deployment](#dashboard-deployment-manual)

## Prerequisites

- DigitalOcean account ([Sign up here](https://www.digitalocean.com/))
- GitHub repository with your code pushed
- Cloudinary account for file uploads
- **MongoDB database** (MongoDB Atlas, your own server, or any MongoDB provider)

---

# YAML Deployment (Recommended)

Deploy using Infrastructure as Code with App Spec YAML files. This method is:
- ✅ **Version controlled** - All configuration in Git
- ✅ **Repeatable** - Deploy staging/production with same process
- ✅ **Automated** - Use CI/CD or doctl CLI
- ✅ **Team-friendly** - Easy to review and collaborate

## Step 1: Install doctl CLI

```bash
# Ubuntu/Debian (Dev Container)
snap install doctl

# macOS
brew install doctl

# Or download binary
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.104.0/doctl-1.104.0-linux-amd64.tar.gz
tar xf doctl-*.tar.gz
sudo mv doctl /usr/local/bin

# Verify installation
doctl version
```

## Step 2: Authenticate doctl

```bash
# Initialize authentication
doctl auth init

# Paste your DigitalOcean API token when prompted
# Get token from: https://cloud.digitalocean.com/account/api/tokens

# Verify authentication
doctl account get
```

## Step 3: Configure App Spec YAML

The repository includes pre-configured App Spec files in `.do/`:
- `.do/app.yaml` - Development/testing (with inline secrets)
- `.do/app.staging.yaml` - Staging environment
- `.do/app.production.yaml` - Production environment (2 instances, high availability)

**Edit the appropriate file:**

```bash
# For production deployment
nano .do/app.production.yaml
```

**Update these values:**

```yaml
# Line 8: Region (blr1=Bangalore, nyc=New York, sfo=San Francisco)
region: blr1

# Line 15: Your domain pattern
regex: "^https://.*\\.yourdomain\\.com$"

# Line 33: Your GitHub repository
repo: cyhiiii/om_dayal_server  # Change to your username
```

## Step 4: Deploy Using Script

We provide deployment scripts for easy deployment:

```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

**Manual deployment (alternative):**

```bash
# Create new app
doctl apps create --spec .do/app.production.yaml

# Or update existing app
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "om-dayal-crm-prod" | awk '{print $1}')
doctl apps update $APP_ID --spec .do/app.production.yaml
```

## Step 5: Configure Secrets

After creating the app, configure environment secrets:

```bash
# Run the setup script
./scripts/setup-secrets.sh production

# Or manually via doctl
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "om-dayal-crm-prod" | awk '{print $1}')

# Set secrets one by one
doctl apps update $APP_ID --spec <(
  doctl apps spec get $APP_ID --format yaml | \
  yq eval '.services[0].envs += [{"key": "MONGODB_URI", "value": "mongodb+srv://...", "type": "SECRET"}]' -
)
```

**Required secrets:**
- `MONGODB_URI` - Your MongoDB connection string
- `ACCESS_TOKEN_SECRET` - Generate with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
- `REFRESH_TOKEN_SECRET` - Generate a different secret
- `EMPLOYEE_ACCESS_TOKEN_SECRET` - Generate a different secret
- `CLOUDINARY_CLOUD_NAME` - From Cloudinary dashboard
- `CLOUDINARY_API_KEY` - From Cloudinary dashboard
- `CLOUDINARY_API_SECRET` - From Cloudinary dashboard
- `ORIGIN` - Your frontend domain (production only)

## Step 6: Monitor Deployment

```bash
# Get app ID
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "om-dayal-crm-prod" | awk '{print $1}')

# Watch logs in real-time
doctl apps logs $APP_ID --follow --type=run

# Check deployment status
doctl apps get $APP_ID --format ID,Spec.Name,DefaultIngress,ActiveDeployment.Phase

# List all deployments
doctl apps list-deployments $APP_ID
```

## Step 7: Verify Deployment

```bash
# Get app URL
APP_URL=$(doctl apps get $APP_ID --format DefaultIngress --no-header)

# Test health endpoint
curl https://$APP_URL/health

# Test API login
curl https://$APP_URL/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}'
```

## YAML Deployment Quick Reference

```bash
# List all apps
doctl apps list

# Get app details
doctl apps get <app-id>

# View current spec
doctl apps spec get <app-id>

# View logs
doctl apps logs <app-id> --follow

# List deployments
doctl apps list-deployments <app-id>

# Trigger manual deployment
doctl apps create-deployment <app-id> --force-rebuild

# Delete app (careful!)
doctl apps delete <app-id>
```

---

# Dashboard Deployment (Manual)

## Step 1: Prepare MongoDB Connection

Since you're using an external MongoDB database:

1. **Get your MongoDB connection string**:
   - Your MongoDB URI: `mongodb+srv://gigsumitsingh:<db_password>@cluster0.68jua80.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
   - **Replace `<db_password>`** with your actual database password
   - Format: `mongodb+srv://username:password@host/database?retryWrites=true&w=majority`

2. **Ensure network access is allowed**:
   - **MongoDB Atlas**: Add `0.0.0.0/0` to IP Access List (allows all IPs)
     - Go to **Network Access** → **Add IP Address** → **Allow Access from Anywhere**
   - **Self-hosted**: Ensure firewall allows incoming connections from DigitalOcean
   - **Cloud provider**: Configure security groups to allow DigitalOcean App Platform IPs

3. **Test connection** (optional but recommended):
   ```bash
   # Install mongosh if not already installed
   npm install -g mongosh
   
   # Test connection
   mongosh "your_mongodb_connection_string"
   ```

## Step 2: Prepare Your Repository

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

## Step 3: Deploy to App Platform

### 3.1 Create App

1. Go to **App Platform** → **Create App**
2. Choose **GitHub** as the source
3. Authorize DigitalOcean to access your GitHub account
4. Select your repository: `om_dayal_server`
5. Select branch: `main`
6. Enable **Autodeploy** (deploys automatically on push)
7. Click **Next**

### 3.2 Configure Resources

1. **Edit Plan**:
   - Select **Basic** plan ($5/month for 512MB RAM)
   - For production, consider **Professional** ($12/month for 1GB RAM)

2. **Environment Variables** - Click **Edit** next to your app component:
   
   Add the following environment variables:

   | Key | Value | Notes |
   |-----|-------|-------|
   | `PORT` | `8080` | App Platform default |
   | `ORIGIN` | `*` | Or your frontend URL (e.g., `https://yourapp.com`) |
   | `MONGODB_URI` | `mongodb+srv://...` or `mongodb://...` | **Your existing database connection string** |
   | `ACCESS_TOKEN_SECRET` | `[generate random string]` | See below |
   | `REFRESH_TOKEN_SECRET` | `[generate random string]` | See below |
   | `EMPLOYEE_ACCESS_TOKEN_SECRET` | `[generate random string]` | See below |
   | `EMPLOYEE_ACCESS_TOKEN_EXPIRY` | `1d` | |
   | `REFRESH_TOKEN_EXPIRY` | `10d` | |
   | `CLOUDINARY_CLOUD_NAME` | `your_cloud_name` | From Cloudinary |
   | `CLOUDINARY_API_KEY` | `your_api_key` | From Cloudinary |
   | `CLOUDINARY_API_SECRET` | `your_api_secret` | From Cloudinary |

   **Generate Secure Secrets** (run in terminal):
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Run this 3 times for the 3 token secrets.

3. Click **Next**

### 3.3 App Info

1. Name your app: `om-dayal-crm`
2. Select region (choose closest to your MongoDB server for best performance)
3. Click **Next**

### 3.4 Review & Launch

1. Review your configuration
2. Estimated cost: **$5-12/month** (just App Platform, no DigitalOcean database)
3. Click **Create Resources**
4. Wait for deployment (~5-10 minutes)

## Step 4: Verify Deployment

Once deployment completes:

1. Click on your app URL (e.g., `https://om-dayal-crm-xxxxx.ondigitalocean.app`)
2. Test the API:
   ```bash
   curl https://your-app-url.ondigitalocean.app/api/v1/admin/login \
     -H "Content-Type: application/json" \
     -d '{"username":"your_username","password":"your_password"}'
   ```

3. **Check Runtime Logs** for database connection:
   - Look for: `"⚙️ MongoDB connected! DB HOST: ..."`
   - If you see connection errors, verify your `MONGODB_URI` and network access

## Step 5: Configure Custom Domain (Optional)

1. In App Platform, go to **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain: `api.yourdomain.com`
4. Add DNS records as instructed:
   - Type: `CNAME`
   - Name: `api`
   - Value: `your-app-url.ondigitalocean.app`
5. Wait for DNS propagation (5-30 minutes)
6. SSL certificate will be automatically provisioned

## Monitoring & Logs

### View Application Logs
1. App Platform → Your App → **Runtime Logs**
2. Filter by severity: Info, Warning, Error

### Monitor Performance
1. App Platform → Your App → **Insights**
2. View CPU, Memory, and Request metrics

### Monitor External Database
- Check your MongoDB provider's dashboard for:
  - Connection metrics
  - Query performance
  - Storage usage
  - Active connections

## Updating Your Application

App Platform will automatically deploy when you push to GitHub:

```bash
# Make your changes
git add .
git commit -m "Your changes"
git push origin main

# Deployment starts automatically
# Check progress in App Platform dashboard
```

### Manual Deployment
If autodeploy is disabled:
1. App Platform → Your App
2. Click **Create Deployment**
3. Select branch and click **Deploy**

## Troubleshooting

### App Won't Start
- Check **Runtime Logs** for error messages
- Verify all environment variables are set correctly
- Ensure MongoDB connection string is correct

### Database Connection Failed
- **Verify MongoDB URI format** in environment variables
- **Check network access**:
  - MongoDB Atlas: Ensure `0.0.0.0/0` is in IP Access List
  - Self-hosted: Check firewall rules allow connections
- **Test connection locally** with the same connection string:
  ```bash
  mongosh "your_mongodb_connection_string"
  ```
- **Check database is running** on your provider's dashboard
- **Review logs** for specific error messages (authentication, timeout, etc.)

### File Upload Issues
- Verify Cloudinary credentials are correct
- Check `public/temp` directory exists (created automatically)
- Review Cloudinary usage limits

### High Memory Usage
- Upgrade to Professional plan ($12/month, 1GB RAM)
- Monitor memory usage in **Insights**

### Slow API Responses
- **Check database latency**: Deploy app in region closest to your database
- **MongoDB Atlas**: Choose same cloud provider region as DigitalOcean
- **Self-hosted**: Ensure good network connectivity between servers

## Cost Breakdown

| Resource | Plan | Monthly Cost |
|----------|------|--------------|
| App Platform (Basic) | 512MB RAM | $5 |
| MongoDB Database | External (your existing DB) | $0 (on DO) |
| **Total (DigitalOcean)** | | **$5** |

For production with higher traffic:
- App Platform Professional: $12/month (1GB RAM)
- **Total**: ~$12/month (+ your external DB costs)

*Note: You'll continue paying your existing MongoDB hosting costs separately.*

## Security Recommendations

1. ✅ **Use strong JWT secrets** (generated with crypto.randomBytes)
2. ✅ **Enable CORS** properly (set ORIGIN to your frontend URL)
3. ✅ **Use HTTPS** (automatic with App Platform)
4. ✅ **Secure MongoDB access**:
   - Use strong passwords
   - Enable IP whitelisting (add `0.0.0.0/0` for App Platform)
   - Use connection string with SSL/TLS
   - Enable authentication
5. ✅ **Rotate secrets regularly** (every 90 days)
6. ⚠️ **Never commit .env files** to Git
7. ⚠️ **Monitor database access logs** on your provider's dashboard

## External MongoDB Providers

### MongoDB Atlas (Recommended)
- Free tier: 512MB storage
- Paid plans from $9/month
- Automatic backups, monitoring, scaling
- **Setup**: [atlas.mongodb.com](https://www.mongodb.com/cloud/atlas)

### Other Options
- **Railway**: MongoDB from $5/month
- **Render**: MongoDB from $7/month
- **Self-hosted VPS**: Full control, requires maintenance
- **AWS DocumentDB**: MongoDB-compatible, enterprise features

## Support

- DigitalOcean Documentation: https://docs.digitalocean.com/products/app-platform/
- Community Support: https://www.digitalocean.com/community/
- Ticket Support: Available on all paid plans

---

## Alternative: Droplet Deployment

For full control with a VPS, see [DROPLET_DEPLOYMENT.md](DROPLET_DEPLOYMENT.md) (manual VM setup guide).