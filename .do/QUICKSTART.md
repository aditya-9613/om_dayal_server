# DigitalOcean Deployment - Quick Start

## 🚀 Fast Track Deployment (5 minutes)

### 1. Install & Authenticate doctl

```bash
# Install
snap install doctl

# Authenticate
doctl auth init
# Paste your API token from: https://cloud.digitalocean.com/account/api/tokens
```

### 2. Update Configuration

Edit `.do/app.production.yaml`:
```yaml
# Line 33: Update your GitHub repo
repo: YOUR_GITHUB_USERNAME/om_dayal_server

# Line 15: Update your domain
regex: "^https://.*\\.yourdomain\\.com$"
```

### 3. Deploy

```bash
# Deploy to production
./scripts/deploy.sh production
```

### 4. Configure Secrets

```bash
# Run interactive setup
./scripts/setup-secrets.sh production

# You'll be prompted for:
# - MongoDB URI
# - JWT secrets (auto-generated or manual)
# - Cloudinary credentials
# - Frontend URL (ORIGIN)
```

### 5. Verify

```bash
# Get app ID
APP_ID=$(doctl apps list --format ID --no-header | head -n1)

# Watch deployment
doctl apps logs $APP_ID --follow

# Get app URL
doctl apps get $APP_ID --format DefaultIngress --no-header

# Test health check
curl https://YOUR_APP_URL/health
```

## 🎯 Commands Cheat Sheet

```bash
# List apps
doctl apps list

# View logs
doctl apps logs $APP_ID --follow

# Redeploy
doctl apps create-deployment $APP_ID --force-rebuild

# Get app URL
doctl apps get $APP_ID --format DefaultIngress --no-header

# View app spec
doctl apps spec get $APP_ID --format yaml

# Delete app
doctl apps delete $APP_ID
```

## 📋 Pre-Deployment Checklist

- [ ] MongoDB database created and connection string ready
- [ ] Cloudinary account created with credentials
- [ ] GitHub repository pushed with latest code
- [ ] `.do/app.production.yaml` updated with your repo name
- [ ] doctl CLI installed and authenticated
- [ ] Health check endpoint exists in `src/app.js`

## 🔐 Security Checklist

- [ ] `ORIGIN` set to actual frontend domain (not `*`)
- [ ] JWT secrets are cryptographically random (64+ chars)
- [ ] MongoDB uses IP whitelist (not `0.0.0.0/0`)
- [ ] Secrets stored securely (`.secrets/` is gitignored)
- [ ] 2FA enabled on DigitalOcean account

## 💰 Cost Estimate

| Resource | Configuration | Monthly Cost |
|----------|---------------|--------------|
| App Platform | Professional-XS, 2 instances | $24 |
| MongoDB | External (your provider) | $0 (on DO) |
| Bandwidth | Included (1TB) | $0 |
| **Total** | | **$24/month** |

## 🆘 Troubleshooting

### Deployment Fails
```bash
# Check build logs
doctl apps logs $APP_ID --type=build

# Check runtime logs
doctl apps logs $APP_ID --type=run --follow
```

### Cannot Connect to MongoDB
```bash
# Test connection locally
mongosh "your_mongodb_connection_string"

# Check if App Platform IPs are whitelisted in MongoDB
# Get egress IPs from App Platform dashboard → Settings → Component
```

### Health Check Fails
Add to `src/app.js`:
```javascript
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});
```

## 📚 Full Documentation

- **Complete Guide**: See [`DEPLOYMENT.md`](../DEPLOYMENT.md)
- **App Spec Details**: See [`.do/README.md`](.do/README.md)
- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/

## 🔄 Update Existing Deployment

```bash
# Pull latest changes
git pull origin main

# Update app spec if needed
nano .do/app.production.yaml

# Redeploy
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "om-dayal-crm-prod" | awk '{print $1}')
doctl apps update $APP_ID --spec .do/app.production.yaml
```

## 🌟 Next Steps After Deployment

1. **Add Custom Domain**:
   - App Platform → Settings → Domains
   - Add CNAME: `api.yourdomain.com` → `your-app.ondigitalocean.app`

2. **Setup Monitoring**:
   - Enable alerts in App Platform
   - Add external monitoring (UptimeRobot, Pingdom)

3. **Configure Backups**:
   - Enable MongoDB backups
   - Test restore procedure

4. **Setup CI/CD**:
   - Add GitHub Actions workflow
   - Automate deployment on merge to main
