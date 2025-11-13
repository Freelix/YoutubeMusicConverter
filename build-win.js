const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 Starting Windows build process...');

// Ensure build directory exists
if (!fs.existsSync('build')) {
  console.log('ℹ️ No build directory found. Running build...');
  execSync('npm run build', { stdio: 'inherit' });
}

// Install Windows build tools if not already installed
try {
  console.log('🔧 Checking for Windows build tools...');
  execSync('npm list --depth=0 @electron/windows-sign', { stdio: 'inherit' });
} catch (e) {
  console.log('📦 Installing Windows build tools...');
  execSync('npm install --save-dev @electron/windows-sign', { stdio: 'inherit' });
}

// Build for Windows
console.log('🔨 Building Windows executable...');
try {
  // Build for Windows
  execSync('npm run electron-pack -- --win --x64', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
  console.log('📦 The Windows installer can be found in the dist/ directory');
  
  // List the output files
  console.log('\n📁 Output files:');
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    const files = fs.readdirSync(distPath);
    files.forEach(file => {
      const filePath = path.join(distPath, file);
      const stats = fs.statSync(filePath);
      const fileSize = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`- ${file} (${fileSize} MB)`);
    });
  }
  
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
