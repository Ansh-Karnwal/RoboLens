#!/bin/bash
# RoboLens — Vultr VM Setup Script
# Run this on a fresh Ubuntu 22.04 VM (2 CPU, 4GB RAM recommended)

set -e

echo "╔═══════════════════════════════════════════════╗"
echo "║       RoboLens — Vultr Deployment Setup       ║"
echo "╚═══════════════════════════════════════════════╝"

# Update system
echo "[1/7] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "[2/7] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify Node
echo "  Node.js version: $(node -v)"
echo "  npm version: $(npm -v)"

# Install PM2
echo "[3/7] Installing PM2 process manager..."
sudo npm install -g pm2

# Install nginx
echo "[4/7] Installing nginx..."
sudo apt install -y nginx

# Clone repo (update URL to your repo)
echo "[5/7] Setting up application..."
cd /opt
if [ -d "robolens" ]; then
  echo "  Directory exists, pulling latest..."
  cd robolens
  git pull
else
  echo "  Clone your repo here:"
  echo "  git clone https://github.com/YOUR_USERNAME/robolens.git"
  echo "  For now, creating directory structure..."
  sudo mkdir -p robolens
  sudo chown $USER:$USER robolens
  cd robolens
fi

# Install backend dependencies
echo "[6/7] Installing backend dependencies..."
cd /opt/robolens/backend
npm install
npm run build

# Install frontend dependencies
echo "  Installing frontend dependencies..."
cd /opt/robolens/frontend
npm install
npm run build

# Setup environment
echo "[7/7] Setting up environment..."
cd /opt/robolens/backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  IMPORTANT: Edit /opt/robolens/backend/.env and set your GEMINI_API_KEY"
fi

# Configure nginx
echo "  Configuring nginx..."
sudo cp /opt/robolens/deploy/nginx.conf /etc/nginx/sites-available/robolens
sudo ln -sf /etc/nginx/sites-available/robolens /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Start with PM2
echo "  Starting backend with PM2..."
cd /opt/robolens/backend
pm2 start dist/index.js --name robolens-backend
pm2 save
pm2 startup

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║            Setup Complete!                    ║"
echo "╠═══════════════════════════════════════════════╣"
echo "║  1. Edit /opt/robolens/backend/.env           ║"
echo "║  2. Set GEMINI_API_KEY                        ║"
echo "║  3. pm2 restart robolens-backend              ║"
echo "║  4. Visit http://YOUR_VULTR_IP                ║"
echo "╚═══════════════════════════════════════════════╝"
