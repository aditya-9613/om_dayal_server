# MongoDB Configuration

## Connection String

Your MongoDB Atlas connection string:

```
mongodb+srv://gigsumitsingh:vd4pFJjWHubYgPj5@cluster0.68jua80.mongodb.net
```

✅ **Password configured**: `vd4pFJjWHubYgPj5`

## Connection Details

### 1. For Local Development

Update `.env` file (create from `.env.example`):
```bash
cp .env.example .env
nano .env
```

Replace:
```env
MONGODB_URI=mongodb+srv://gigsumitsingh:YOUR_ACTUAL_PASSWORD@cluster0.68jua80.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

### 2. For DigitalOcean Deployment

When running `./scripts/setup-secrets.sh`, provide the connection string with actual password:
```bash
./scripts/setup-secrets.sh production
# When prompted for MONGODB_URI, paste:
# mongodb+srv://gigsumitsingh:YOUR_ACTUAL_PASSWORD@cluster0.68jua80.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

## MongoDB Atlas Network Access

**Important**: Allow DigitalOcean App Platform to connect to your database.

### Option 1: Allow All IPs (Quick Setup)
1. Go to MongoDB Atlas Dashboard
2. Navigate to **Network Access**
3. Click **Add IP Address**
4. Select **Allow Access from Anywhere** (`0.0.0.0/0`)
5. Click **Confirm**

⚠️ **Security Note**: This is less secure but easier for getting started. For production, use Option 2.

### Option 2: Whitelist Specific IPs (Recommended for Production)
1. Deploy your app to DigitalOcean first
2. Get egress IPs from App Platform:
   - App Platform Dashboard → Your App → Settings → Component
   - Scroll to "Egress Source IPs"
   - Copy all listed IPs
3. Add each IP to MongoDB Atlas Network Access
4. Redeploy if connection fails

## Database Details

- **Cluster**: Cluster0
- **Region**: (Check your MongoDB Atlas dashboard)
- **Username**: `gigsumitsingh`
- **Database Name**: Will be added by your app (`OMDT` from `src/constant.js`)

## Connection String Parameters

- `retryWrites=true` - Automatically retry write operations
- `w=majority` - Write concern (wait for majority of nodes)
- `appName=Cluster0` - Application identifier in MongoDB logs

## Testing Connection

Test your connection string locally:

```bash
# Install mongosh if not installed
npm install -g mongosh

# Test connection (replace <db_password>)
mongosh "mongodb+srv://gigsumitsingh:YOUR_PASSWORD@cluster0.68jua80.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
```

## Troubleshooting

### "Authentication Failed"
- Verify password is correct (no spaces, URL-encoded if contains special characters)
- Check username is `gigsumitsingh`
- Verify user has database permissions in MongoDB Atlas

### "Connection Timeout"
- Check Network Access whitelist in MongoDB Atlas
- Ensure `0.0.0.0/0` is added (or specific IPs)
- Verify cluster is not paused

### "Invalid Connection String"
- Ensure no spaces in the connection string
- Password must be URL-encoded if it contains special characters
  - Example: `p@ssword` → `p%40ssword`
  - Use online URL encoder or: `node -e "console.log(encodeURIComponent('your_password'))"`

## URL Encoding Special Characters

If your password contains special characters, encode them:

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `:` | `%3A` |
| `/` | `%2F` |
| `?` | `%3F` |
| `#` | `%23` |
| `[` | `%5B` |
| `]` | `%5D` |
| `%` | `%25` |

Example:
```
Password: p@ss:word#123
Encoded: p%40ss%3Aword%23123
```

## Security Best Practices

1. ✅ **Never commit** `.env` file with real password
2. ✅ **Use strong passwords** (MongoDB Atlas enforces this)
3. ✅ **Enable IP whitelist** in production (not `0.0.0.0/0`)
4. ✅ **Rotate passwords** every 90 days
5. ✅ **Use different databases** for staging and production
6. ✅ **Enable MongoDB backups** (automatic in Atlas)
7. ✅ **Monitor connection logs** in MongoDB Atlas dashboard
