# PowerShell Script to launch Google Chrome with Remote Debugging on port 9222

Write-Host "Starting Google Chrome with Remote Debugging on port 9222..." -ForegroundColor Green

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chromePath)) {
    $chromePath = "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
}

if (Test-Path $chromePath) {
    Start-Process $chromePath -ArgumentList "--remote-debugging-port=9222"
    Write-Host "Google Chrome started successfully on port 9222." -ForegroundColor Cyan
} else {
    Start-Process "chrome.exe" -ArgumentList "--remote-debugging-port=9222"
    Write-Host "Launched default chrome.exe with --remote-debugging-port=9222." -ForegroundColor Cyan
}
