@echo off
echo 🎨 Setting up Coloring Game Test Suite...

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16.0.0 or higher.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% lss 16 (
    echo ❌ Node.js version 16.0.0 or higher is required. Current version: 
    node --version
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Install Playwright browsers
echo 🌐 Installing Playwright browsers...
call npx playwright install

if %errorlevel% neq 0 (
    echo ❌ Failed to install Playwright browsers
    pause
    exit /b 1
)

echo ✅ Playwright browsers installed successfully

REM Create test results directory
echo 📁 Creating test results directory...
if not exist "test-results" mkdir test-results

echo ✅ Test results directory created

REM Verify setup
echo 🔍 Verifying setup...

REM Check if all required files exist
if not exist "package.json" (
    echo ❌ Missing required file: package.json
    pause
    exit /b 1
)

if not exist "playwright.config.ts" (
    echo ❌ Missing required file: playwright.config.ts
    pause
    exit /b 1
)

if not exist "tests\coloring-game.web.spec.ts" (
    echo ❌ Missing required file: tests\coloring-game.web.spec.ts
    pause
    exit /b 1
)

if not exist "tests\coloring-game.mobile.spec.ts" (
    echo ❌ Missing required file: tests\coloring-game.mobile.spec.ts
    pause
    exit /b 1
)

if not exist "tests\coloring-game.android.spec.ts" (
    echo ❌ Missing required file: tests\coloring-game.android.spec.ts
    pause
    exit /b 1
)

if not exist "tests\utils\test-helpers.ts" (
    echo ❌ Missing required file: tests\utils\test-helpers.ts
    pause
    exit /b 1
)

if not exist "tests\README.md" (
    echo ❌ Missing required file: tests\README.md
    pause
    exit /b 1
)

echo ✅ All required files are present

REM Test Playwright installation
echo 🧪 Testing Playwright installation...
call npx playwright --version

if %errorlevel% neq 0 (
    echo ❌ Playwright installation test failed
    pause
    exit /b 1
)

echo.
echo 🎉 Test suite setup completed successfully!
echo.
echo 📋 Available commands:
echo   npm test              - Run all tests
echo   npm run test:web      - Run web tests only
echo   npm run test:mobile   - Run mobile tests only
echo   npm run test:android  - Run Android tests only
echo   npm run test:headful  - Run tests with browser visible
echo   npm run test:debug    - Run tests in debug mode
echo   npm run test:ui       - Run tests with interactive UI
echo   npm run show-report   - Show test report
echo.
echo 📚 For more information, see tests\README.md
echo.
echo 🚀 To start testing, run: npm test
echo.
pause

