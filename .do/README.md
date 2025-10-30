# DigitalOcean App Platform Configuration

This directory contains App Spec YAML files for deploying the OM Dayal CRM Server to DigitalOcean App Platform.

## Files

### `app.yaml`
Basic configuration with inline secrets. Use for:
- **Development testing**
- **Quick deployments**
- **Demo environments**

⚠️ **Do NOT use for production** - contains placeholder secrets

### `app.staging.yaml`
Staging environment configuration:
- **Branch**: `develop`
- **Resources**: Basic ($5/month, 512MB RAM)
- **Instances**: 1
- **CORS**: Permissive (`*`) for testing
- **Purpose**: Testing before production

### `app.production.yaml`
Production environment configuration:
- **Branch**: `main`
- **Resources**: Professional ($12/month, 1GB RAM)
- **Instances**: 2 (high availability)
- **CORS**: Strict domain-based
- **Secrets**: Managed via doctl or dashboard (not inline)
- **Alerts**: Enabled for deployment and domain events

## Quick Start

### 1. Install doctl

```bash
# Linux (snap)
snap install doctl

# macOS
brew install doctl

# Or download binary
wget https://github.com/digitalocean/doctl/releases/latest/download/doctl-1.104.0-linux-amd64.tar.gz
tar xf doctl-*.tar.gz
sudo mv doctl /usr/local/bin
```

### 2. Authenticate

```bash
doctl auth init
# Paste your API token from: https://cloud.digitalocean.com/account/api/tokens
```

### 3. Deploy

```bash
# From repository root
./scripts/deploy.sh production

# Or manually
doctl apps create --spec .do/app.production.yaml
```

### 4. Configure Secrets

```bash
./scripts/setup-secrets.sh production
```

## App Spec Structure

```yaml
name: om-dayal-crm-prod           # App name in dashboard
region: blr1                       # Datacenter (blr1, nyc, sfo, lon, etc.)

ingress:                           # Routing and CORS
  rules:
    - component:
        name: api
      cors:                        # CORS configuration
        allow_origins:             # Allowed origins (domains)
        allow_methods:             # HTTP methods
        allow_headers:             # Request headers
        allow_credentials: true    # Allow cookies

services:                          # Application services
  - name: api
    github:
      repo: owner/repo             # GitHub repository
      branch: main                 # Branch to deploy
      deploy_on_push: true         # Auto-deploy on push
    
    build_command: npm ci          # Build step
    run_command: npm start         # Start command
    
    health_check:                  # Health check configuration
      http_path: /health
      initial_delay_seconds: 10
      period_seconds: 10
      timeout_seconds: 5
      success_threshold: 1
      failure_threshold: 3
    
    instance_count: 2              # Number of instances
    instance_size_slug: professional-xs  # Instance size
    http_port: 8080                # Internal port
    
    envs:                          # Environment variables
      - key: NODE_ENV
        value: "production"
        scope: RUN_TIME
      
      - key: MONGODB_URI           # Secret (no value in YAML)
        type: SECRET
        scope: RUN_TIME
```

## Instance Sizes & Pricing

| Slug | RAM | vCPU | Price/month | Use Case |
|------|-----|------|-------------|----------|
| `basic-xxs` | 512MB | 1 | $5 | Development, staging |
| `professional-xs` | 1GB | 1 | $12 | Production (small) |
| `professional-s` | 2GB | 1 | $24 | Production (medium) |
| `professional-m` | 4GB | 2 | $48 | Production (large) |
| `professional-l` | 8GB | 4 | $96 | Production (enterprise) |

## Regions

| Code | Location | Best For |
|------|----------|----------|
| `blr1` | Bangalore, India | Indian users |
| `nyc1`, `nyc3` | New York, USA | US East Coast |
| `sfo3` | San Francisco, USA | US West Coast |
| `sgp1` | Singapore | Southeast Asia |
| `lon1` | London, UK | Europe |
| `fra1` | Frankfurt, Germany | Europe |
| `tor1` | Toronto, Canada | North America |
| `ams3` | Amsterdam, Netherlands | Europe |

## Environment Variables

### Required (All Environments)

| Variable | Type | Description |
|----------|------|-------------|
| `NODE_ENV` | Plain | `production`, `staging`, or `development` |
| `PORT` | Plain | `8080` (App Platform default) |
| `MONGODB_URI` | Secret | MongoDB connection string<br/>Use: `mongodb+srv://gigsumitsingh:<db_password>@cluster0.68jua80.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`<br/>⚠️ Replace `<db_password>` with actual password |
| `ACCESS_TOKEN_SECRET` | Secret | JWT access token secret (64+ chars) |
| `REFRESH_TOKEN_SECRET` | Secret | JWT refresh token secret (64+ chars) |
| `EMPLOYEE_ACCESS_TOKEN_SECRET` | Secret | Employee JWT secret (64+ chars) |
| `EMPLOYEE_ACCESS_TOKEN_EXPIRY` | Plain | Token expiry (e.g., `1d`) |
| `REFRESH_TOKEN_EXPIRY` | Plain | Refresh token expiry (e.g., `10d`) |
| `CLOUDINARY_CLOUD_NAME` | Secret | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Secret | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Secret | Cloudinary API secret |

### Environment-Specific

| Variable | Staging | Production |
|----------|---------|------------|
| `ORIGIN` | `*` (permissive) | `https://yourdomain.com` (strict) |

## Common Commands

### Create App
```bash
doctl apps create --spec .do/app.production.yaml
```

### Update App
```bash
APP_ID=$(doctl apps list --format ID --no-header | head -n1)
doctl apps update $APP_ID --spec .do/app.production.yaml
```

### View Logs
```bash
APP_ID=$(doctl apps list --format ID --no-header | head -n1)
doctl apps logs $APP_ID --follow --type=run
```

### Get App URL
```bash
APP_ID=$(doctl apps list --format ID --no-header | head -n1)
doctl apps get $APP_ID --format DefaultIngress --no-header
```

### Trigger Deployment
```bash
APP_ID=$(doctl apps list --format ID --no-header | head -n1)
doctl apps create-deployment $APP_ID --force-rebuild
```

### Delete App
```bash
APP_ID=$(doctl apps list --format ID --no-header | head -n1)
doctl apps delete $APP_ID
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to DigitalOcean

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install doctl
        uses: digitalocean/action-doctl@v2
        with:
          token: ${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
      
      - name: Deploy to App Platform
        run: |
          APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "om-dayal-crm-prod" | awk '{print $1}')
          doctl apps update $APP_ID --spec .do/app.production.yaml
```

Add `DIGITALOCEAN_ACCESS_TOKEN` to GitHub Secrets.

## Troubleshooting

### App Not Deploying

```bash
# Check deployment logs
APP_ID=$(doctl apps list --format ID --no-header | head -n1)
doctl apps logs $APP_ID --type=build

# Check deployment status
doctl apps get $APP_ID --format ActiveDeployment.Phase,ActiveDeployment.Progress
```

### Environment Variable Not Set

```bash
# List all env vars
APP_ID=$(doctl apps list --format ID --no-header | head -n1)
doctl apps spec get $APP_ID --format yaml | grep -A 2 "envs:"

# Update env var (requires yq)
doctl apps update $APP_ID --spec <(
  doctl apps spec get $APP_ID --format yaml | \
  yq eval '.services[0].envs += [{"key": "NEW_VAR", "value": "value", "scope": "RUN_TIME"}]' -
)
```

### Health Check Failing

Ensure `/health` endpoint exists in `src/app.js`:

```javascript
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});
```

## Security Best Practices

1. ✅ **Never commit secrets** to YAML files in production
2. ✅ **Use `type: SECRET`** for sensitive environment variables
3. ✅ **Set strict CORS** (`ORIGIN`) in production
4. ✅ **Enable MongoDB IP whitelist** with App Platform egress IPs
5. ✅ **Rotate secrets regularly** (every 90 days)
6. ✅ **Use separate databases** for staging/production
7. ✅ **Enable 2FA** on DigitalOcean account

## Support

- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/
- **App Spec Reference**: https://docs.digitalocean.com/products/app-platform/reference/app-spec/
- **doctl CLI Docs**: https://docs.digitalocean.com/reference/doctl/
- **Community**: https://www.digitalocean.com/community/

## Additional Resources

- [App Spec Examples](https://github.com/digitalocean/sample-nodejs)
- [doctl GitHub Releases](https://github.com/digitalocean/doctl/releases)
- [DigitalOcean API Documentation](https://docs.digitalocean.com/reference/api/)
