#!/usr/bin/env bash
# ==============================================================================
# Shareable Stickies — Installation & Administration Setup Script
# Version: 0.1.0
# ==============================================================================

set -e

# Colors for terminal output
BOLD="\033[1m"
RESET="\033[0m"
GREEN="\033[32m"
CYAN="\033[36m"
YELLOW="\033[33m"
DIM="\033[2m"

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "          Shareable Stickies — Admin & Server Setup (v 0.1.0)"
echo "======================================================================"
echo -e "${RESET}"
echo -e "This wizard configures your installation settings either interactively"
echo -e "or via environment variables. Settings are saved to ${BOLD}.env${RESET} and synced"
echo -e "directly to the persistent database (${BOLD}./data/stickies.json${RESET})."
echo ""

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
  else
    touch .env
  fi
fi

# Helper to read existing .env values if set
get_env_val() {
  local key="$1"
  local default="$2"
  local val
  if [ -f "$ENV_FILE" ]; then
    val=$(grep -E "^${key}=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
  fi
  if [ -z "$val" ]; then
    echo "$default"
  else
    echo "$val"
  fi
}

# ------------------------------------------------------------------------------
# 1. Theme Mode: dark (default), light, sepia
# ------------------------------------------------------------------------------
echo -e "${BOLD}[1/5] Default UI Theme Mode${RESET}"
echo -e "Select the default theme mode for new visitors:"
echo -e "  1) ${BOLD}dark${RESET}  ${DIM}(default)${RESET}"
echo -e "  2) ${BOLD}light${RESET}"
echo -e "  3) ${BOLD}sepia${RESET}"

EXISTING_MODE=$(get_env_val "DEFAULT_THEME" "dark")
read -p "Select theme mode [1-3] (default: 1): " THEME_INPUT
case "$THEME_INPUT" in
  2|light|Light)
    CHOSEN_MODE="light"
    ;;
  3|sepia|Sepia)
    CHOSEN_MODE="sepia"
    ;;
  *)
    CHOSEN_MODE="dark"
    ;;
esac
echo -e "${GREEN}✓ Theme mode set to: ${BOLD}${CHOSEN_MODE}${RESET}\n"

# ------------------------------------------------------------------------------
# 2. Allow Public Creation of Stickies (default: off)
# ------------------------------------------------------------------------------
echo -e "${BOLD}[2/5] Sticky Creation Permissions${RESET}"
echo -e "Allow public creation of stickies? (When off, users must sign in or register to create stickies)"
EXISTING_PUBLIC=$(get_env_val "ALLOW_ANONYMOUS_CREATION" "false")
read -p "Allow public/guest creation? [y/N] (default: N): " PUBLIC_INPUT
case "$PUBLIC_INPUT" in
  y|Y|yes|Yes|true|TRUE)
    CHOSEN_ALLOW_PUBLIC="true"
    ;;
  *)
    CHOSEN_ALLOW_PUBLIC="false"
    ;;
esac
echo -e "${GREEN}✓ Allow public creation: ${BOLD}${CHOSEN_ALLOW_PUBLIC}${RESET} (off by default)\n"

# ------------------------------------------------------------------------------
# 3. OIDC Settings
# ------------------------------------------------------------------------------
echo -e "${BOLD}[3/5] OIDC Single Sign-On (SSO) Settings${RESET}"
read -p "Enable OIDC Single Sign-On? [y/N] (default: N): " OIDC_CONFIRM
if [[ "$OIDC_CONFIRM" =~ ^[yY] ]]; then
  CHOSEN_OIDC_ENABLED="true"
  read -p "  OIDC Provider Name [Enterprise SSO]: " OIDC_NAME_IN
  CHOSEN_OIDC_PROVIDER="${OIDC_NAME_IN:-Enterprise SSO}"

  read -p "  OIDC Issuer URL (e.g. https://accounts.google.com): " OIDC_ISSUER_IN
  CHOSEN_OIDC_ISSUER="${OIDC_ISSUER_IN}"

  read -p "  OIDC Client ID: " OIDC_CLIENT_ID_IN
  CHOSEN_OIDC_CLIENT_ID="${OIDC_CLIENT_ID_IN}"

  read -s -p "  OIDC Client Secret: " OIDC_CLIENT_SECRET_IN
  echo ""
  CHOSEN_OIDC_CLIENT_SECRET="${OIDC_CLIENT_SECRET_IN}"

  read -p "  Allowed Email Domains [default: * (all)]: " OIDC_DOMAINS_IN
  CHOSEN_OIDC_DOMAINS="${OIDC_DOMAINS_IN:-*}"

  read -p "  Require OIDC only (disable local registration)? [y/N] (default: N): " OIDC_ONLY_IN
  if [[ "$OIDC_ONLY_IN" =~ ^[yY] ]]; then
    CHOSEN_OIDC_ONLY="true"
  else
    CHOSEN_OIDC_ONLY="false"
  fi
  echo -e "${GREEN}✓ OIDC configured for ${BOLD}${CHOSEN_OIDC_PROVIDER}${RESET}\n"
else
  CHOSEN_OIDC_ENABLED="false"
  CHOSEN_OIDC_PROVIDER="Enterprise SSO"
  CHOSEN_OIDC_ISSUER=""
  CHOSEN_OIDC_CLIENT_ID=""
  CHOSEN_OIDC_CLIENT_SECRET=""
  CHOSEN_OIDC_DOMAINS="*"
  CHOSEN_OIDC_ONLY="false"
  echo -e "${DIM}✓ OIDC Single Sign-On disabled.${RESET}\n"
fi

# ------------------------------------------------------------------------------
# 4. Image/Attachment Storage: local (default), cloudinary, s3
# ------------------------------------------------------------------------------
echo -e "${BOLD}[4/5] Image & Attachment Storage Driver${RESET}"
echo -e "Choose attachment storage backend:"
echo -e "  1) ${BOLD}local${RESET}       ${DIM}(default, stored in ./uploads directory)${RESET}"
echo -e "  2) ${BOLD}cloudinary${RESET}  ${DIM}(Cloudinary CDN — requires org id / cloud name, api key, api secret)${RESET}"
echo -e "  3) ${BOLD}s3${RESET}          ${DIM}(Amazon S3 or S3-compatible: MinIO, Cloudflare R2, Wasabi)${RESET}"

read -p "Select storage driver [1-3] (default: 1): " STORAGE_INPUT
case "$STORAGE_INPUT" in
  2|cloudinary|Cloudinary)
    CHOSEN_STORAGE="cloudinary"
    read -p "  Cloudinary Org ID / Cloud Name: " CLOUD_NAME_IN
    CHOSEN_CLOUDINARY_CLOUD_NAME="${CLOUD_NAME_IN}"
    read -p "  Cloudinary API Key: " CLOUD_KEY_IN
    CHOSEN_CLOUDINARY_API_KEY="${CLOUD_KEY_IN}"
    read -s -p "  Cloudinary API Secret: " CLOUD_SECRET_IN
    echo ""
    CHOSEN_CLOUDINARY_API_SECRET="${CLOUD_SECRET_IN}"
    echo -e "${GREEN}✓ Storage configured for: ${BOLD}Cloudinary (${CHOSEN_CLOUDINARY_CLOUD_NAME})${RESET}\n"
    ;;
  3|s3|S3)
    CHOSEN_STORAGE="s3"
    read -p "  S3 Bucket Name: " S3_BUCKET_IN
    CHOSEN_AWS_BUCKET="${S3_BUCKET_IN}"
    read -p "  S3 Region [default: us-east-1]: " S3_REGION_IN
    CHOSEN_AWS_REGION="${S3_REGION_IN:-us-east-1}"
    read -p "  AWS Access Key ID: " S3_KEY_IN
    CHOSEN_AWS_KEY="${S3_KEY_IN}"
    read -s -p "  AWS Secret Access Key: " S3_SECRET_IN
    echo ""
    CHOSEN_AWS_SECRET="${S3_SECRET_IN}"
    read -p "  Custom Endpoint URL (optional, e.g. for MinIO or R2): " S3_ENDPOINT_IN
    CHOSEN_AWS_ENDPOINT="${S3_ENDPOINT_IN}"
    echo -e "${GREEN}✓ Storage configured for: ${BOLD}S3 Bucket (${CHOSEN_AWS_BUCKET})${RESET}\n"
    ;;
  *)
    CHOSEN_STORAGE="local"
    read -p "  Local Upload Directory [default: ./uploads]: " LOCAL_DIR_IN
    CHOSEN_UPLOAD_DIR="${LOCAL_DIR_IN:-./uploads}"
    echo -e "${GREEN}✓ Storage configured for: ${BOLD}Local Disk (${CHOSEN_UPLOAD_DIR})${RESET}\n"
    ;;
esac

# ------------------------------------------------------------------------------
# 5. Change Admin Username and Password
# ------------------------------------------------------------------------------
echo -e "${BOLD}[5/5] Administrator Account Credentials${RESET}"
EXISTING_ADMIN_USER=$(get_env_val "ADMIN_USERNAME" "admin")
read -p "Admin Username [default: ${EXISTING_ADMIN_USER}]: " ADMIN_USER_INPUT
CHOSEN_ADMIN_USER="${ADMIN_USER_INPUT:-$EXISTING_ADMIN_USER}"

echo -e "${DIM}Enter new admin password (minimum 6 characters). Leave blank to keep existing:${RESET}"
read -s -p "Admin Password: " ADMIN_PASS_INPUT
echo ""
if [ -n "$ADMIN_PASS_INPUT" ]; then
  if [ ${#ADMIN_PASS_INPUT} -lt 6 ]; then
    echo -e "${YELLOW}Warning: Password shorter than 6 characters. Please provide at least 6 characters in production.${RESET}"
  fi
  CHOSEN_ADMIN_PASS="$ADMIN_PASS_INPUT"
else
  CHOSEN_ADMIN_PASS=$(get_env_val "ADMIN_PASSWORD" "")
fi
echo -e "${GREEN}✓ Administrator credentials recorded for: ${BOLD}@${CHOSEN_ADMIN_USER}${RESET}\n"

# Ensure 32-byte encryption secret exists
EXISTING_SECRET=$(get_env_val "ENCRYPTION_SECRET" "")
if [ -z "$EXISTING_SECRET" ] || [ "$EXISTING_SECRET" = "replace-with-a-secure-32-byte-hex-or-passphrase-string" ]; then
  GEN_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32 2>/dev/null || echo "c9f3b890a8274d8e9c20a1f4b892348572e819acb09182746182947192847192")
else
  GEN_SECRET="$EXISTING_SECRET"
fi

# ------------------------------------------------------------------------------
# Write settings to .env
# ------------------------------------------------------------------------------
cat <<EOF > "$ENV_FILE"
# ==============================================================================
# Shareable Stickies — Environment Configuration
# Generated by setup.sh on $(date -u +"%Y-%m-%dT%H:%M:%SZ")
# ==============================================================================

PORT=3000
NODE_ENV=production

# Encryption secret for at-rest zero-knowledge encryption
ENCRYPTION_SECRET="${GEN_SECRET}"

# 1. Default UI Theme Mode (dark | light | sepia)
DEFAULT_THEME="${CHOSEN_MODE}"

# 2. Allow Public Creation of Stickies (true | false)
ALLOW_ANONYMOUS_CREATION=${CHOSEN_ALLOW_PUBLIC}
ALLOW_PUBLIC_STICKIES=${CHOSEN_ALLOW_PUBLIC}

# 3. OIDC Single Sign-On Settings
OIDC_ENABLED=${CHOSEN_OIDC_ENABLED}
OIDC_PROVIDER_NAME="${CHOSEN_OIDC_PROVIDER}"
OIDC_ISSUER_URL="${CHOSEN_OIDC_ISSUER}"
OIDC_CLIENT_ID="${CHOSEN_OIDC_CLIENT_ID}"
OIDC_CLIENT_SECRET="${CHOSEN_OIDC_CLIENT_SECRET}"
OIDC_ALLOWED_DOMAINS="${CHOSEN_OIDC_DOMAINS}"
OIDC_REQUIRE_OIDC_ONLY=${CHOSEN_OIDC_ONLY}

# 4. Storage Driver (local | cloudinary | s3)
STORAGE_DRIVER="${CHOSEN_STORAGE}"
UPLOAD_DIR="${CHOSEN_UPLOAD_DIR:-./uploads}"
DATA_DIR="./data"

# Cloudinary Storage Configuration
CLOUDINARY_CLOUD_NAME="${CHOSEN_CLOUDINARY_CLOUD_NAME}"
CLOUDINARY_API_KEY="${CHOSEN_CLOUDINARY_API_KEY}"
CLOUDINARY_API_SECRET="${CHOSEN_CLOUDINARY_API_SECRET}"

# Amazon S3 / S3-Compatible Storage Configuration
AWS_BUCKET_NAME="${CHOSEN_AWS_BUCKET}"
AWS_REGION="${CHOSEN_AWS_REGION:-us-east-1}"
AWS_ACCESS_KEY_ID="${CHOSEN_AWS_KEY}"
AWS_SECRET_ACCESS_KEY="${CHOSEN_AWS_SECRET}"
AWS_ENDPOINT="${CHOSEN_AWS_ENDPOINT}"

# 5. Administrator Credentials
ADMIN_USERNAME="${CHOSEN_ADMIN_USER}"
ADMIN_PASSWORD="${CHOSEN_ADMIN_PASS}"
EOF

echo -e "${GREEN}${BOLD}✓ Saved configuration to ${ENV_FILE}${RESET}"

# Synchronize with persistent database if tsx / node is available
if command -v npx >/dev/null 2>&1; then
  echo -e "${CYAN}Syncing settings with persistent database...${RESET}"
  npx tsx server/setupCli.ts || true
fi

echo ""
echo -e "${CYAN}${BOLD}======================================================================${RESET}"
echo -e "${GREEN}${BOLD}Setup Completed Successfully!${RESET}"
echo -e "${CYAN}======================================================================${RESET}"
echo -e "  • Mode:              ${BOLD}${CHOSEN_MODE}${RESET}"
echo -e "  • Public Creation:   ${BOLD}${CHOSEN_ALLOW_PUBLIC}${RESET} (Default: off)"
echo -e "  • OIDC SSO:          ${BOLD}${CHOSEN_OIDC_ENABLED}${RESET} (${CHOSEN_OIDC_PROVIDER})"
echo -e "  • Storage Driver:    ${BOLD}${CHOSEN_STORAGE}${RESET}"
echo -e "  • Admin Username:    ${BOLD}@${CHOSEN_ADMIN_USER}${RESET}"
echo -e "======================================================================"
echo -e "You can start the server with: ${BOLD}npm run start${RESET} or ${BOLD}npm run dev${RESET}"
echo -e "Settings can also be modified in the web app under ${BOLD}Admin Settings${RESET}."
echo ""
