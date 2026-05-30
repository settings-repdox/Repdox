#!/bin/bash
# Build script for Vercel
# Automatically generates env-config.js from environment variables during build

set -e

echo "🔨 Building Repdox..."

# Step 1: Generate registration portal config from environment variables
echo "📝 Generating registration portal configuration..."

PORTAL_CONFIG_FILE="registration-portal/env-config.js"

# Get environment variables (with defaults for local development)
SUPABASE_URL=${VITE_SUPABASE_URL:-"https://your-project.supabase.co"}
SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:-"your-anon-key-here"}

# Create env-config.js with actual credentials
cat > "$PORTAL_CONFIG_FILE" << EOF
/**
 * Environment Configuration for Registration Portal
 * 
 * Auto-generated during build process
 * Generated: $(date)
 * 
 * This file contains your Supabase credentials and is generated
 * from environment variables during the build process.
 */

window.REGISTRATION_CONFIG = {
  SUPABASE_URL: '$SUPABASE_URL',
  SUPABASE_ANON_KEY: '$SUPABASE_ANON_KEY',
  DEBUG: false
};

console.log('[Registration Config] ✅ Configuration loaded during build');
EOF

echo "✅ Registration portal config generated"
echo "   URL: $SUPABASE_URL"
echo "   Key: ${SUPABASE_ANON_KEY:0:20}..."

# Step 2: Run the main build
echo ""
echo "🏗️  Building React application..."
npm run build

echo ""
echo "✅ Build complete! Registration portal is configured and ready."
