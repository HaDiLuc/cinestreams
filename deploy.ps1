# ==============================================================================
# CineStreams - Automated Deployment Script for VPS Ubuntu
# Target: root@150.95.111.156 | Domain: cinestreams999.io.vn
# ==============================================================================

param (
    [string]$HostIP = "150.95.111.156",
    [string]$User = "root",
    [int]$Port = 22,
    [string]$FrontendRemoteDir = "/var/www/cinestreams/dist",
    [string]$BackendRemoteDir = "/var/www/cinestreams/backend",
    [string]$IdentityFile = "" # Optionally pass path to private key e.g. -IdentityFile ~/.ssh/id_rsa
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param ([string]$Message)
    Write-Host "`n[🚀] $Message" -ForegroundColor Cyan
}

function Write-Success {
    param ([string]$Message)
    Write-Host "[✅] $Message" -ForegroundColor Green
}

function Write-Warn {
    param ([string]$Message)
    Write-Host "[⚠️] $Message" -ForegroundColor Yellow
}

$SshArgs = @("-p", "$Port")
$ScpArgs = @("-P", "$Port")
if ($IdentityFile -ne "") {
    $SshArgs += @("-i", "$IdentityFile")
    $ScpArgs += @("-i", "$IdentityFile")
}

# Resolve Local Directories automatically whether run from D:\cinestreams or D:\cinestreams\cinestreams
$CurrentDir = (Get-Location).Path
if (Test-Path (Join-Path $CurrentDir "cinestreams\server")) {
    $ProjectDir = Join-Path $CurrentDir "cinestreams"
} elseif (Test-Path (Join-Path $CurrentDir "server")) {
    $ProjectDir = $CurrentDir
} elseif ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "server"))) {
    $ProjectDir = $PSScriptRoot
} elseif ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "cinestreams\server"))) {
    $ProjectDir = Join-Path $PSScriptRoot "cinestreams"
} else {
    $ProjectDir = "D:\cinestreams\cinestreams"
}

$ServerDir = Join-Path $ProjectDir "server"
$ClientDir = Join-Path $ProjectDir "client"
$JarPath = Join-Path $ServerDir "target\cinestreams-server-1.0.0-SNAPSHOT.jar"
$DistPath = Join-Path $ClientDir "dist"

Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host "     CINESTREAMS AUTOMATED DEPLOYMENT TO VPS UBUNTU             " -ForegroundColor Magenta
Write-Host "=================================================================" -ForegroundColor Magenta
Write-Host "Target Host   : $User@$HostIP"
Write-Host "Project Root  : $ProjectDir"
Write-Host "Frontend Dist : $DistPath"
Write-Host "Backend JAR   : $JarPath"
Write-Host "Backend Dir   : $BackendRemoteDir/app.jar (Port 8088)"
Write-Host "Domain        : cinestreams999.io.vn"
Write-Host "=================================================================`n"

# 1. Check Artifacts
Write-Step "1/5. Kiểm tra các file đóng gói (Artifacts)..."

if (-not (Test-Path $JarPath)) {
    Write-Warn "Chưa tìm thấy file JAR. Tiến hành build Backend..."
    Push-Location $ServerDir
    .\mvnw.cmd clean package -DskipTests
    Pop-Location
}
if (-not (Test-Path (Join-Path $DistPath "index.html"))) {
    Write-Warn "Chưa tìm thấy client/dist. Tiến hành build Frontend..."
    Push-Location $ClientDir
    npm run build
    Pop-Location
}
Write-Success "Đã xác nhận đầy đủ file JAR và thư mục client/dist."

# 2. Prepare Remote Directories on VPS
Write-Step "2/5. Tạo cấu trúc thư mục trên VPS..."
$RemoteInitCmd = "mkdir -p $FrontendRemoteDir $BackendRemoteDir/uploads/temp $BackendRemoteDir/uploads/videos"
ssh @SshArgs "$User@$HostIP" $RemoteInitCmd
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Không thể kết nối SSH tới $User@$HostIP qua cổng $Port. Vui lòng kiểm tra lại cổng SSH hoặc tường lửa mạng."
} else {
    Write-Success "Đã tạo cấu trúc thư mục từ xa sẵn sàng."
}

# 3. Upload Frontend
Write-Step "3/5. Upload Frontend (React/Vite) lên $FrontendRemoteDir..."
scp @ScpArgs -r "$DistPath/*" "${User}@${HostIP}:${FrontendRemoteDir}/"
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Upload Frontend chưa thành công do kết nối SSH bị ngắt."
} else {
    Write-Success "Upload Frontend hoàn tất."
}

# 4. Upload Backend JAR
Write-Step "4/5. Upload Backend JAR lên $BackendRemoteDir/app.jar..."
scp @ScpArgs "$JarPath" "${User}@${HostIP}:${BackendRemoteDir}/app.jar"
if ($LASTEXITCODE -ne 0) {
    Write-Warn "Upload Backend JAR chưa thành công do kết nối SSH bị ngắt."
} else {
    Write-Success "Upload Backend hoàn tất."
}

# 4.5. Upload Nginx Configuration
$NginxConfPath = Join-Path $ProjectDir "cinestreams.nginx.conf"
if (-not (Test-Path $NginxConfPath)) {
    $ParentDir = Split-Path $ProjectDir -Parent
    if ($ParentDir -and (Test-Path (Join-Path $ParentDir "cinestreams.nginx.conf"))) {
        $NginxConfPath = Join-Path $ParentDir "cinestreams.nginx.conf"
    }
}
if (Test-Path $NginxConfPath) {
    Write-Step "Cập nhật cấu hình Nginx tối ưu cho Watch Party SSE..."
    scp @ScpArgs "$NginxConfPath" "${User}@${HostIP}:/etc/nginx/sites-available/cinestreams"
    ssh @SshArgs "$User@$HostIP" "ln -sfn /etc/nginx/sites-available/cinestreams /etc/nginx/sites-enabled/cinestreams && nginx -t && systemctl reload nginx || true"
}

# 5. Remote Service Management via PM2 & Permissions
Write-Step "5/5. Thiết lập quyền Nginx và Khởi động lại dịch vụ qua PM2..."

$RemoteDeployCommands = @'
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin
[ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh" 2>/dev/null || true
[ -s "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true

echo "--> 1. Đảm bảo MongoDB đang chạy..."
systemctl start mongod || systemctl start mongodb || true

echo "--> 2. Giải phóng cổng 8088 và 8080 (diệt tiến trình treo nếu có)..."
fuser -k 8088/tcp 2>/dev/null || true
fuser -k 8080/tcp 2>/dev/null || true
pkill -f app.jar 2>/dev/null || true

echo "--> 3. Cập nhật thư mục Frontend và quyền Nginx..."
mkdir -p /var/www/cinestreams/client
ln -sfn /var/www/cinestreams/dist /var/www/cinestreams/client/dist
chown -R www-data:www-data /var/www/cinestreams/dist
chmod -R 755 /var/www/cinestreams/dist

echo "--> 4. Đảm bảo quyền thư mục uploads..."
mkdir -p /var/www/cinestreams/backend/uploads/videos /var/www/cinestreams/backend/uploads/temp
ln -sfn /var/www/cinestreams/backend /var/www/cinestreams/server
chmod -R 775 /var/www/cinestreams/backend/uploads

echo "--> 5. Tạo script khởi động an toàn cho Spring Boot (Port 8088, RAM tối ưu)..."
cat << 'STARTEOF' > /var/www/cinestreams/backend/start.sh
#!/bin/bash
cd /var/www/cinestreams/backend
exec java -Xms128m -Xmx512m -jar /var/www/cinestreams/backend/app.jar --server.port=8088
STARTEOF
chmod +x /var/www/cinestreams/backend/start.sh

echo "--> 6. Khởi chạy Backend với PM2 (kèm interpreter bash)..."
pm2 delete cinestreams-backend 2>/dev/null || true
pm2 start /var/www/cinestreams/backend/start.sh --name cinestreams-backend --interpreter bash
pm2 save

echo "--> 7. Đợi 8 giây để Spring Boot hoàn tất khởi động..."
sleep 8

echo "--> 8. Kiểm tra trạng thái PM2..."
pm2 status cinestreams-backend

echo "--> 9. Kiểm tra cổng 8088 trên VPS..."
netstat -tulpn | grep 8088 || ss -tulpn | grep 8088 || true

echo "--> 10. Thử nghiệm gọi API nội bộ http://127.0.0.1:8088/api/test/public..."
curl -s -o /dev/null -w "HTTP Status Code nội bộ: %{http_code}\n" http://127.0.0.1:8088/api/test/public || true

echo "--> 11. 30 dòng log mới nhất của Backend..."
pm2 logs cinestreams-backend --lines 30 --nostream
'@

ssh @SshArgs "$User@$HostIP" $RemoteDeployCommands

Write-Host "`n=================================================================" -ForegroundColor Green
Write-Host "   🎉 TRIỂN KHAI HOÀN TẤT LÊN VPS $HostIP!                    " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "🌐 Website Frontend : https://cinestreams999.io.vn - hoặc: http://$HostIP"
Write-Host "🔌 Backend REST API : http://${HostIP}:8088/api - hoặc: https://cinestreams999.io.vn/api"
Write-Host "📊 Quản lý PM2 VPS  : ssh $User@$HostIP -> pm2 status"
Write-Host "=================================================================`n"

