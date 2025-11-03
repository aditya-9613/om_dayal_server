#!/bin/bash
#################################################################################
# Test Deployment Scripts and Configuration
# Usage: ./scripts/test-deployment.sh
#################################################################################

# Don't exit on error for tests
# set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

# Test result tracking
pass_test() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((TESTS_PASSED++))
}

fail_test() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((TESTS_FAILED++))
}

info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        OM Dayal CRM - Deployment Tests                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Check required files exist
echo -e "${YELLOW}Test 1: Required Files${NC}"
FILES=(
    ".do/app.yaml"
    ".do/app.staging.yaml"
    ".do/app.production.yaml"
    "scripts/deploy.sh"
    "scripts/setup-secrets.sh"
    ".env.example"
    "DEPLOYMENT.md"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        pass_test "File exists: $file"
    else
        fail_test "File missing: $file"
    fi
done
echo ""

# Test 2: Check scripts are executable
echo -e "${YELLOW}Test 2: Script Permissions${NC}"
if [ -x "scripts/deploy.sh" ]; then
    pass_test "deploy.sh is executable"
else
    fail_test "deploy.sh is not executable"
fi

if [ -x "scripts/setup-secrets.sh" ]; then
    pass_test "setup-secrets.sh is executable"
else
    fail_test "setup-secrets.sh is not executable"
fi
echo ""

# Test 3: Validate YAML syntax
echo -e "${YELLOW}Test 3: YAML Syntax Validation${NC}"
for file in .do/*.yaml; do
    if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
        pass_test "Valid YAML: $file"
    else
        fail_test "Invalid YAML: $file"
    fi
done
echo ""

# Test 4: Check for required fields in YAML
echo -e "${YELLOW}Test 4: YAML Configuration${NC}"

check_yaml_field() {
    local file=$1
    local field=$2
    if grep -q "$field" "$file"; then
        pass_test "$file contains '$field'"
    else
        fail_test "$file missing '$field'"
    fi
}

check_yaml_field ".do/app.production.yaml" "name:"
check_yaml_field ".do/app.production.yaml" "region:"
check_yaml_field ".do/app.production.yaml" "services:"
check_yaml_field ".do/app.production.yaml" "github:"
check_yaml_field ".do/app.production.yaml" "health_check:"
echo ""

# Test 5: Check health endpoint exists in code
echo -e "${YELLOW}Test 5: Health Check Endpoint${NC}"
if grep -q "/health" src/app.js; then
    pass_test "Health check endpoint exists in src/app.js"
else
    fail_test "Health check endpoint missing in src/app.js"
    info "Add: app.get('/health', (req, res) => res.json({status: 'healthy'}))"
fi
echo ""

# Test 6: Check package.json has start script
echo -e "${YELLOW}Test 6: Package Configuration${NC}"
if grep -q '"start"' package.json; then
    pass_test "package.json has 'start' script"
else
    fail_test "package.json missing 'start' script"
fi

if grep -q '"dev"' package.json; then
    pass_test "package.json has 'dev' script"
else
    fail_test "package.json missing 'dev' script"
fi
echo ""

# Test 7: Check environment variables in .env.example
echo -e "${YELLOW}Test 7: Environment Variables${NC}"
ENV_VARS=(
    "PORT"
    "MONGODB_URI"
    "ACCESS_TOKEN_SECRET"
    "REFRESH_TOKEN_SECRET"
    "EMPLOYEE_ACCESS_TOKEN_SECRET"
    "CLOUDINARY_CLOUD_NAME"
    "CLOUDINARY_API_KEY"
    "CLOUDINARY_API_SECRET"
)

for var in "${ENV_VARS[@]}"; do
    if grep -q "$var" .env.example; then
        pass_test ".env.example includes $var"
    else
        fail_test ".env.example missing $var"
    fi
done
echo ""

# Test 8: Check .gitignore
echo -e "${YELLOW}Test 8: Git Configuration${NC}"
if grep -q ".env" .gitignore; then
    pass_test ".gitignore includes .env"
else
    fail_test ".gitignore missing .env"
fi

if grep -q ".secrets/" .gitignore; then
    pass_test ".gitignore includes .secrets/"
else
    fail_test ".gitignore missing .secrets/"
fi
echo ""

# Test 9: Check doctl CLI
echo -e "${YELLOW}Test 9: Deployment Tools${NC}"
if command -v doctl &> /dev/null; then
    VERSION=$(doctl version | head -n1)
    pass_test "doctl CLI installed: $VERSION"
else
    fail_test "doctl CLI not installed"
    info "Install with: snap install doctl"
fi

if command -v node &> /dev/null; then
    VERSION=$(node --version)
    pass_test "Node.js installed: $VERSION"
else
    fail_test "Node.js not installed"
fi
echo ""

# Test 10: Test script error handling
echo -e "${YELLOW}Test 10: Script Validation${NC}"

# Test invalid environment
if ./scripts/deploy.sh invalid 2>&1 | grep -q "Invalid environment"; then
    pass_test "deploy.sh validates environment parameter"
else
    fail_test "deploy.sh does not validate environment parameter"
fi

# Test missing doctl auth (will fail if authenticated)
if ! doctl account get &> /dev/null; then
    if ./scripts/deploy.sh staging 2>&1 | grep -q "Not authenticated"; then
        pass_test "deploy.sh checks authentication"
    else
        fail_test "deploy.sh does not check authentication"
    fi
else
    info "Skipping auth check (already authenticated)"
fi
echo ""

# Test 11: Check GitHub repo configuration
echo -e "${YELLOW}Test 11: GitHub Configuration${NC}"
CURRENT_REPO=$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/' | sed 's/.*github.com[:/]\(.*\)/\1/')
if [ ! -z "$CURRENT_REPO" ]; then
    pass_test "Git remote configured: $CURRENT_REPO"
    
    # Check if YAML files use correct repo
    for file in .do/*.yaml; do
        YAML_REPO=$(grep "repo:" "$file" | head -n1 | awk '{print $2}' | tr -d '\r')
        if [ "$YAML_REPO" = "$CURRENT_REPO" ]; then
            pass_test "$file uses correct repo: $CURRENT_REPO"
        else
            info "$file has repo: $YAML_REPO (update to: $CURRENT_REPO if needed)"
        fi
    done
else
    fail_test "Git remote not configured"
fi
echo ""

# Test 12: Check copilot instructions
echo -e "${YELLOW}Test 12: Documentation${NC}"
if [ -f ".github/copilot-instructions.md" ]; then
    pass_test "Copilot instructions exist"
else
    fail_test "Copilot instructions missing"
fi

if [ -f ".do/README.md" ]; then
    pass_test "App Spec documentation exists"
else
    fail_test "App Spec documentation missing"
fi

if [ -f ".do/QUICKSTART.md" ]; then
    pass_test "Quick start guide exists"
else
    fail_test "Quick start guide missing"
fi
echo ""

# Summary
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Test Summary                           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed! Ready for deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Update .do/app.production.yaml with your GitHub repo"
    echo "2. Authenticate with DigitalOcean: doctl auth init"
    echo "3. Deploy: ./scripts/deploy.sh production"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please fix the issues above.${NC}"
    exit 1
fi
