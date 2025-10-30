#!/bin/bash
#################################################################################
# Setup Environment Secrets for DigitalOcean App Platform
# Usage: ./scripts/setup-secrets.sh [environment]
# Environments: staging, production (default: staging)
#################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENVIRONMENT="${1:-staging}"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Configure Environment Secrets - ${ENVIRONMENT^^}         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

# Check doctl
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}Error: doctl CLI is not installed${NC}"
    exit 1
fi

# Get app ID
APP_NAME="om-dayal-crm-${ENVIRONMENT}"
APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "${APP_NAME}" | awk '{print $1}' || echo "")

if [ -z "$APP_ID" ]; then
    echo -e "${RED}Error: App '${APP_NAME}' not found${NC}"
    echo "Create the app first with: ./scripts/deploy.sh ${ENVIRONMENT}"
    exit 1
fi

echo -e "${GREEN}✓ App found: ${APP_NAME} (ID: ${APP_ID})${NC}"
echo ""

# Function to generate secure secret
generate_secret() {
    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
}

# Function to set environment variable
set_env() {
    local key=$1
    local value=$2
    local is_secret=${3:-true}
    
    if [ "$is_secret" = "true" ]; then
        doctl apps update "$APP_ID" --spec <(
            doctl apps spec get "$APP_ID" --format yaml | \
            yq eval ".services[0].envs += [{\"key\": \"$key\", \"value\": \"$value\", \"type\": \"SECRET\", \"scope\": \"RUN_TIME\"}]" -
        ) > /dev/null 2>&1
    else
        doctl apps update "$APP_ID" --spec <(
            doctl apps spec get "$APP_ID" --format yaml | \
            yq eval ".services[0].envs += [{\"key\": \"$key\", \"value\": \"$value\", \"scope\": \"RUN_TIME\"}]" -
        ) > /dev/null 2>&1
    fi
    
    echo -e "${GREEN}✓ Set ${key}${NC}"
}

echo -e "${YELLOW}Configure the following secrets:${NC}"
echo ""

# MongoDB URI
echo -e "${YELLOW}1. MongoDB Connection String${NC}"
read -p "Enter MONGODB_URI: " -r MONGODB_URI
if [ ! -z "$MONGODB_URI" ]; then
    set_env "MONGODB_URI" "$MONGODB_URI" true
fi

# Generate JWT secrets
echo ""
echo -e "${YELLOW}2. JWT Secrets${NC}"
echo "Generate new secrets? (recommended for first-time setup)"
read -p "Generate new JWT secrets? (yes/no): " -r

if [[ $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Generating secrets..."
    ACCESS_SECRET=$(generate_secret)
    REFRESH_SECRET=$(generate_secret)
    EMPLOYEE_SECRET=$(generate_secret)
    
    set_env "ACCESS_TOKEN_SECRET" "$ACCESS_SECRET" true
    set_env "REFRESH_TOKEN_SECRET" "$REFRESH_SECRET" true
    set_env "EMPLOYEE_ACCESS_TOKEN_SECRET" "$EMPLOYEE_SECRET" true
    
    # Save to file for backup (gitignored)
    mkdir -p .secrets
    echo "ACCESS_TOKEN_SECRET=$ACCESS_SECRET" > ".secrets/${ENVIRONMENT}.txt"
    echo "REFRESH_TOKEN_SECRET=$REFRESH_SECRET" >> ".secrets/${ENVIRONMENT}.txt"
    echo "EMPLOYEE_ACCESS_TOKEN_SECRET=$EMPLOYEE_SECRET" >> ".secrets/${ENVIRONMENT}.txt"
    
    echo -e "${GREEN}✓ Secrets saved to .secrets/${ENVIRONMENT}.txt (keep safe!)${NC}"
else
    read -p "Enter ACCESS_TOKEN_SECRET: " -r ACCESS_SECRET
    read -p "Enter REFRESH_TOKEN_SECRET: " -r REFRESH_SECRET
    read -p "Enter EMPLOYEE_ACCESS_TOKEN_SECRET: " -r EMPLOYEE_SECRET
    
    if [ ! -z "$ACCESS_SECRET" ]; then
        set_env "ACCESS_TOKEN_SECRET" "$ACCESS_SECRET" true
    fi
    if [ ! -z "$REFRESH_SECRET" ]; then
        set_env "REFRESH_TOKEN_SECRET" "$REFRESH_SECRET" true
    fi
    if [ ! -z "$EMPLOYEE_SECRET" ]; then
        set_env "EMPLOYEE_ACCESS_TOKEN_SECRET" "$EMPLOYEE_SECRET" true
    fi
fi

# Cloudinary
echo ""
echo -e "${YELLOW}3. Cloudinary Configuration${NC}"
read -p "Enter CLOUDINARY_CLOUD_NAME: " -r CLOUDINARY_NAME
read -p "Enter CLOUDINARY_API_KEY: " -r CLOUDINARY_KEY
read -p "Enter CLOUDINARY_API_SECRET: " -r CLOUDINARY_SECRET

if [ ! -z "$CLOUDINARY_NAME" ]; then
    set_env "CLOUDINARY_CLOUD_NAME" "$CLOUDINARY_NAME" true
fi
if [ ! -z "$CLOUDINARY_KEY" ]; then
    set_env "CLOUDINARY_API_KEY" "$CLOUDINARY_KEY" true
fi
if [ ! -z "$CLOUDINARY_SECRET" ]; then
    set_env "CLOUDINARY_API_SECRET" "$CLOUDINARY_SECRET" true
fi

# ORIGIN (production only)
if [ "$ENVIRONMENT" = "production" ]; then
    echo ""
    echo -e "${YELLOW}4. CORS Origin${NC}"
    read -p "Enter ORIGIN (your frontend URL, e.g., https://yourdomain.com): " -r ORIGIN
    if [ ! -z "$ORIGIN" ]; then
        set_env "ORIGIN" "$ORIGIN" true
    fi
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Secrets Configuration Complete               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Trigger a new deployment to apply changes:"
echo "  doctl apps create-deployment ${APP_ID} --force-rebuild"
echo ""
