#!/bin/bash

# AiBoT - Professional Setup Script
# This script automates the environment setup for the AiBoT project.

set -e # Exit immediately if a command exits with a non-zero status.

# Text colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Helper for showing status
function status_log() {
    echo -e "${BLUE}[AiBoT]${NC} $1"
}

function success_log() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

function warning_log() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

function error_log() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Clear screen for a better experience
clear

echo -e "${BLUE}${BOLD}====================================================${NC}"
echo -e "${BLUE}${BOLD}                   AiBoT - SETUP                    ${NC}"
echo -e "${BLUE}${BOLD}====================================================${NC}"

# 1. Environment Check
echo ""
status_log "Step 1: Analyzing system environment..."

# Check Node.js
if ! command -v node &> /dev/null; then
    error_log "Node.js is not installed. Please install Node.js (>=18.17.0)."
    exit 1
fi
status_log "Node.js version: $(node -v)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    warning_log "pnpm not found. Attempting to install pnpm globally..."
    npm install -g pnpm || { error_log "Failed to install pnpm. Please install it manually."; exit 1; }
else
    status_log "pnpm version: $(pnpm -v)"
fi

# 2. Project Configuration
echo ""
status_log "Step 2: Configuring project environment..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        success_log "Created .env from .env.example"
        warning_log "IMPORTANT: Please update OPENROUTER_API_KEY in .env before use."
    else
        error_log ".env.example not found. Cannot initialize environment."
        exit 1
    fi
else
    status_log ".env file already exists. Skipping initialization."
fi

# Check for API Key placeholder
if grep -q "your_openrouter_api_key" .env; then
    warning_log "OPENROUTER_API_KEY is still using the default placeholder."
fi

# 3. Dependency Management
echo ""
status_log "Step 3: Installing dependencies (this may take a moment)..."
pnpm install

# 4. Final Readiness Check
echo ""
status_log "Step 4: Running final readiness check..."
if [ -d "node_modules" ]; then
    success_log "Dependencies installed and node_modules ready."
else
    error_log "Dependency installation failed or node_modules missing."
    exit 1
fi

echo -e "\n${GREEN}${BOLD}Setup Complete! System is ready to launch.${NC}"
echo -e "${BLUE}----------------------------------------------------${NC}"
echo -e "Starting development server at: ${BOLD}http://localhost:3000${NC}"
echo -e "${BLUE}----------------------------------------------------${NC}\n"

# 5. Launch
status_log "Launching AiBoT..."
exec pnpm run dev
