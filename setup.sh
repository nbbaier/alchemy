#!/bin/bash

# Setup script for Alchemy development environment
# This mirrors the setup in .cursor.environment.json

set -e  # Exit on error

echo "🚀 Setting up Alchemy development environment..."

# Install Bun if not already installed
if ! command -v bun &> /dev/null; then
  echo "📦 Installing Bun..."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
else
  echo "✅ Bun is already installed"
fi

# Verify Bun installation
echo "📍 Bun version: $(bun --version)"

# Install root dependencies
echo "📦 Installing root dependencies..."
bun install

# Install example dependencies
echo "📦 Installing example dependencies..."
cd examples/cloudflare-tanstack-start && bun install && cd ../..

echo "✅ Setup complete! 🎉"
echo ""
echo "To ensure Bun is in your PATH for future sessions, add these lines to your shell profile:"
echo '  export BUN_INSTALL="$HOME/.bun"'
echo '  export PATH="$BUN_INSTALL/bin:$PATH"'