#!/bin/bash
#################################################################################
# DigitalOcean App Platform Deployment Script
# Usage: ./deploy.sh [environment]
# Environments: staging, production (default: staging)
#################################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT="${1:-staging}"

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     OM Dayal CRM - DigitalOcean Deployment Script        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo ""

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}Error: doctl CLI is not installed${NC}"
    echo "Install with: snap install doctl"
    echo "Or download from: https://github.com/digitalocean/doctl/releases"
    exit 1
fi

# Check if authenticated
if ! doctl account get &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with DigitalOcean${NC}"
    echo "Run: doctl auth init"
    echo "Get token from: https://cloud.digitalocean.com/account/api/tokens"
    exit 1
fi

echo -e "${GREEN}✓ doctl CLI is installed and authenticated${NC}"

# App spec file
SPEC_FILE=".do/app.${ENVIRONMENT}.yaml"

if [ ! -f "$SPEC_FILE" ]; then
    echo -e "${RED}Error: Spec file not found: ${SPEC_FILE}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Using spec file: ${SPEC_FILE}${NC}"
echo ""

# Check if app already exists
APP_NAME="om-dayal-crm-${ENVIRONMENT}"
echo -e "${YELLOW}Checking if app '${APP_NAME}' exists...${NC}"

APP_ID=$(doctl apps list --format ID,Spec.Name --no-header | grep "${APP_NAME}" | awk '{print $1}' || echo "")

if [ -z "$APP_ID" ]; then
    # Create new app
    echo -e "${YELLOW}App does not exist. Creating new app...${NC}"
    echo ""
    
    # Prompt for confirmation
    read -p "This will create a NEW app. Continue? (yes/no): " -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Creating app from spec...${NC}"
    doctl apps create --spec "$SPEC_FILE" --format ID,Spec.Name,DefaultIngress,ActiveDeployment.Phase
    
    echo ""
    echo -e "${GREEN}✓ App created successfully!${NC}"
    echo -e "${YELLOW}Note: You need to configure environment secrets manually:${NC}"
    echo "  - MONGODB_URI"
    echo "  - ACCESS_TOKEN_SECRET"
    echo "  - REFRESH_TOKEN_SECRET"
    echo "  - EMPLOYEE_ACCESS_TOKEN_SECRET"
    echo "  - CLOUDINARY_CLOUD_NAME"
    echo "  - CLOUDINARY_API_KEY"
    echo "  - CLOUDINARY_API_SECRET"
    echo ""
    echo "Run: ./scripts/setup-secrets.sh ${ENVIRONMENT}"
    
else
    # Update existing app
    echo -e "${GREEN}✓ App found: ${APP_NAME} (ID: ${APP_ID})${NC}"
    echo ""
    
    # Prompt for confirmation
    read -p "This will UPDATE the existing app. Continue? (yes/no): " -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Updating app from spec...${NC}"
    doctl apps update "$APP_ID" --spec "$SPEC_FILE" --format ID,Spec.Name,DefaultIngress,ActiveDeployment.Phase
    
    echo ""
    echo -e "${GREEN}✓ App updated successfully!${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                  Deployment Commands                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "View logs:"
echo "  doctl apps logs ${APP_ID} --follow"
echo ""
echo "View app details:"
echo "  doctl apps get ${APP_ID}"
echo ""
echo "List deployments:"
echo "  doctl apps list-deployments ${APP_ID}"
echo ""
echo "Open in browser:"
echo "  doctl apps get ${APP_ID} --format DefaultIngress --no-header | xargs -I {} echo 'https://{}'\"
echo ""
echo -e "${GREEN}Deployment initiated! Check status in DigitalOcean dashboard.${NC}"
