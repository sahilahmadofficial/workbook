const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '../dist-electron');
const packageJson = require('../package.json');
const version = packageJson.version;

console.log('📦 Creating distribution package...');

// Create distribution folder
const distPackageDir = path.join(distDir, 'WorkBook-Distribution');
if (fs.existsSync(distPackageDir)) {
  fs.rmSync(distPackageDir, { recursive: true });
}
fs.mkdirSync(distPackageDir, { recursive: true });

// Copy INSTALLATION.txt
const installationFile = path.join(__dirname, '../INSTALLATION.txt');
if (fs.existsSync(installationFile)) {
  fs.copyFileSync(
    installationFile,
    path.join(distPackageDir, 'INSTALLATION.txt')
  );
  console.log('✓ Copied INSTALLATION.txt');
}

// Copy Setup executable
const setupFile = path.join(distDir, `WorkBook Setup ${version}.exe`);
if (fs.existsSync(setupFile)) {
  fs.copyFileSync(
    setupFile,
    path.join(distPackageDir, `WorkBook-Setup-${version}.exe`)
  );
  console.log('✓ Copied Setup installer');
} else {
  console.log('⚠ Setup installer not found');
}

// Copy Portable executable
const portableFile = path.join(distDir, `WorkBook ${version}.exe`);
if (fs.existsSync(portableFile)) {
  fs.copyFileSync(
    portableFile,
    path.join(distPackageDir, `WorkBook-Portable-${version}.exe`)
  );
  console.log('✓ Copied Portable executable');
} else {
  console.log('⚠ Portable executable not found');
}

// Create README for the package
const readmeContent = `
WorkBook v${version} - Distribution Package
============================================

This package contains:

1. WorkBook-Setup-${version}.exe
   → Full installer with desktop shortcuts and uninstaller
   → Recommended for most users

2. WorkBook-Portable-${version}.exe
   → Standalone executable, no installation needed
   → Recommended for USB drives or temporary use

3. INSTALLATION.txt
   → Complete installation guide and troubleshooting


QUICK START
-----------
For installation: Run WorkBook-Setup-${version}.exe
For portable use: Run WorkBook-Portable-${version}.exe


SECURITY NOTICE
---------------
Windows may show a security warning because this app isn't code-signed.
This is normal for indie/free software. See INSTALLATION.txt for details.

Source code: https://github.com/sahilahmad6569/workbook


Enjoy WorkBook! 🚀
`;

fs.writeFileSync(
  path.join(distPackageDir, 'README.txt'),
  readmeContent.trim()
);
console.log('✓ Created README.txt');

// Create ZIP file
const zipName = `WorkBook-v${version}-Windows.zip`;
const zipPath = path.join(distDir, zipName);

console.log('📦 Creating ZIP archive...');

try {
  // Remove old ZIP if exists
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }

  // Use PowerShell to create ZIP (works on Windows)
  execSync(
    `powershell -Command "Compress-Archive -Path '${distPackageDir}/*' -DestinationPath '${zipPath}' -Force"`,
    { stdio: 'inherit' }
  );

  console.log(`✅ Distribution package created: ${zipName}`);
  console.log(`📂 Location: ${zipPath}`);
  
  // Get file size
  const stats = fs.statSync(zipPath);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📊 Size: ${fileSizeMB} MB`);

} catch (error) {
  console.error('❌ Error creating ZIP:', error.message);
  process.exit(1);
}
