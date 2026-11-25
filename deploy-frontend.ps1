# ==============================================================================
# CineStreams - Upload & Update Frontend only
# ==============================================================================
$ErrorActionPreference = "Stop"

$CurrentDir = (Get-Location).Path
if (Test-Path (Join-Path $CurrentDir "cinestreams\client")) {
    $ProjectDir = Join-Path $CurrentDir "cinestreams"
} elseif (Test-Path (Join-Path $CurrentDir "client")) {
    $ProjectDir = $CurrentDir
} elseif ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "client"))) {
    $ProjectDir = $PSScriptRoot
} elseif ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "cinestreams\client"))) {
    $ProjectDir = Join-Path $PSScriptRoot "cinestreams"
} else {
    $ProjectDir = "D:\cinestreams\cinestreams"
}

$ClientDir = Join-Path $ProjectDir "client"
$DistPath = Join-Path $ClientDir "dist"

Write-Host "`n[🚀] 1/3. Build lại Frontend mới nhất tại $ClientDir..." -ForegroundColor Cyan
Push-Location $ClientDir
npm run build
Pop-Location

Write-Host "`n[🚀] 2/3. Upload thư mục client/dist lên VPS 150.95.111.156..." -ForegroundColor Cyan
scp -r "$DistPath/*" root@150.95.111.156:/var/www/cinestreams/dist/

Write-Host "`n[🚀] 3/3. Thiết lập phân quyền Nginx (www-data)..." -ForegroundColor Cyan
ssh root@150.95.111.156 "mkdir -p /var/www/cinestreams/client && ln -sfn /var/www/cinestreams/dist /var/www/cinestreams/client/dist && chown -R www-data:www-data /var/www/cinestreams/dist && chmod -R 755 /var/www/cinestreams/dist"

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host "   🎉 CẬP NHẬT LOGO & FRONTEND LÊN VPS THÀNH CÔNG!              " -ForegroundColor Green
Write-Host "   Kiểm tra tại: https://cinestreams999.io.vn                  " -ForegroundColor Green
Write-Host "=================================================================`n" -ForegroundColor Green

