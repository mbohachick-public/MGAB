# Set ANDROID_HOME and JAVA_HOME for this PowerShell session only.
# Edit paths below if your install locations differ.
$sdkPath = "C:\Users\bohac\AppData\Local\Android\Sdk"
$jbrPath = "C:\Program Files\Android\Android Studio\jbr"

if (-not (Test-Path $sdkPath)) {
  Write-Host "Android SDK not found at: $sdkPath" -ForegroundColor Yellow
  Write-Host "Install Android Studio and the SDK, or edit this script with your SDK path." -ForegroundColor Yellow
  exit 1
}

$env:ANDROID_HOME = $sdkPath
$env:Path = "$sdkPath\platform-tools;$env:Path"

if (Test-Path $jbrPath) {
  $env:JAVA_HOME = $jbrPath
  $env:Path = "$jbrPath\bin;$env:Path"
  Write-Host "JAVA_HOME set to: $env:JAVA_HOME" -ForegroundColor Green
} else {
  Write-Host "Java (JBR) not found at: $jbrPath" -ForegroundColor Yellow
  Write-Host "Set JAVA_HOME permanently (see ANDROID_SETUP.md) or install Android Studio." -ForegroundColor Yellow
}

Write-Host "ANDROID_HOME set to: $env:ANDROID_HOME" -ForegroundColor Green
Write-Host "You can now run: npx expo run:android" -ForegroundColor Green
