#!/bin/bash

echo "🎨 Setting up Coloring Game Test Suite..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16.0.0 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16.0.0 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
npx playwright install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install Playwright browsers"
    exit 1
fi

echo "✅ Playwright browsers installed successfully"

# Create test results directory
echo "📁 Creating test results directory..."
mkdir -p test-results

echo "✅ Test results directory created"

# Verify setup
echo "🔍 Verifying setup..."

# Check if all required files exist
REQUIRED_FILES=(
    "package.json"
    "playwright.config.ts"
    "tests/coloring-game.web.spec.ts"
    "tests/coloring-game.mobile.spec.ts"
    "tests/coloring-game.android.spec.ts"
    "tests/utils/test-helpers.ts"
    "tests/README.md"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

echo "✅ All required files are present"

# Test Playwright installation
echo "🧪 Testing Playwright installation..."
npx playwright --version

if [ $? -ne 0 ]; then
    echo "❌ Playwright installation test failed"
    exit 1
fi

echo ""
echo "🎉 Test suite setup completed successfully!"
echo ""
echo "📋 Available commands:"
echo "  npm test              - Run all tests"
echo "  npm run test:web      - Run web tests only"
echo "  npm run test:mobile   - Run mobile tests only"
echo "  npm run test:android  - Run Android tests only"
echo "  npm run test:headful  - Run tests with browser visible"
echo "  npm run test:debug    - Run tests in debug mode"
echo "  npm run test:ui       - Run tests with interactive UI"
echo "  npm run show-report   - Show test report"
echo ""
echo "📚 For more information, see tests/README.md"
echo ""
echo "🚀 To start testing, run: npm test"

