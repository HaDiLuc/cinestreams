#!/usr/bin/env bash
# ==============================================================================
# CineStreams - Automated Deployment Script (Bash / macOS / Linux / WSL)
# Target: root@150.95.111.156 | Domain: cinestreams999.io.vn
# ==============================================================================

set -e

HOST_IP="${1:-150.95.111.156}"
USER="${2:-root}"
FRONTEND_DIR="/var/www/cinestreams/dist"
BACKEND_DIR="/var/www/cinestreams/backend"

# Tự động xác định thư mục gốc dự án (chạy từ thư mục gốc hoặc cinestreams)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/server" ]; then
    PROJECT_ROOT="$SCRIPT_DIR"
elif [ -d "$SCRIPT_DIR/cinestreams/server" ]; then
    PROJECT_ROOT="$SCRIPT_DIR/cinestreams"
elif [ -d "$(pwd)/cinestreams/server" ]; then
    PROJECT_ROOT="$(pwd)/cinestreams"
elif [ -d "$(pwd)/server" ]; then
    PROJECT_ROOT="$(pwd)"
else
    PROJECT_ROOT="$SCRIPT_DIR"
fi

SERVER_DIR="$PROJECT_ROOT/server"
CLIENT_DIR="$PROJECT_ROOT/client"
JAR_LOCAL_PATH="$SERVER_DIR/target/cinestreams-server-1.0.0-SNAPSHOT.jar"
DIST_LOCAL_PATH="$CLIENT_DIR/dist"

echo -e "\033[1;35m=================================================================\033[0m"
echo -e "\033[1;35m     CINESTREAMS AUTOMATED DEPLOYMENT TO VPS UBUNTU             \033[0m"
echo -e "\033[1;35m=================================================================\033[0m"
echo "Target Host   : ${USER}@${HOST_IP}"
echo "Project Root  : ${PROJECT_ROOT}"
echo "Frontend Dir  : ${FRONTEND_DIR}"
echo "Backend Dir   : ${BACKEND_DIR}/app.jar (Port 8088)"
echo "Domain        : cinestreams999.io.vn"
echo ""

# 1. Check Artifacts
echo -e "\033[1;36m[🚀] 1/5. Kiểm tra các file đóng gói (Artifacts)...\033[0m"
if [ ! -f "$JAR_LOCAL_PATH" ]; then
    echo "Chưa tìm thấy file JAR. Tiến hành build Backend..."
    (cd "$SERVER_DIR" && ./mvnw clean package -DskipTests)
fi

if [ ! -f "$DIST_LOCAL_PATH/index.html" ]; then
    echo "Chưa tìm thấy client/dist. Tiến hành build Frontend..."
    (cd "$CLIENT_DIR" && npm run build)
fi
echo -e "\033[1;32m[✅] Đã xác nhận đầy đủ file JAR và client/dist.\033[0m"

# 2. Prepare Remote Dirs
echo -e "\033[1;36m[🚀] 2/5. Tạo cấu trúc thư mục trên VPS...\033[0m"
ssh "${USER}@${HOST_IP}" "mkdir -p ${FRONTEND_DIR} ${BACKEND_DIR}/uploads/temp ${BACKEND_DIR}/uploads/videos"
echo -e "\033[1;32m[✅] Thư mục từ xa đã sẵn sàng.\033[0m"

# 3. Upload Frontend
echo -e "\033[1;36m[🚀] 3/5. Upload Frontend lên ${FRONTEND_DIR}...\033[0m"
scp -r "$DIST_LOCAL_PATH"/* "${USER}@${HOST_IP}:${FRONTEND_DIR}/"
echo -e "\033[1;32m[✅] Upload Frontend hoàn tất.\033[0m"

# 4. Upload Backend JAR
echo -e "\033[1;36m[🚀] 4/5. Upload Backend JAR lên ${BACKEND_DIR}/app.jar...\033[0m"
scp "$JAR_LOCAL_PATH" "${USER}@${HOST_IP}:${BACKEND_DIR}/app.jar"
echo -e "\033[1;32m[✅] Upload Backend hoàn tất.\033[0m"

# 5. Remote Service Management
echo -e "\033[1;36m[🚀] 5/5. Thiết lập dịch vụ và Khởi chạy qua PM2 trên VPS...\033[0m"
ssh "${USER}@${HOST_IP}" bash -s << 'EOF'
export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin
[ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh" 2>/dev/null || true
[ -s "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true

echo "--> 1. Đảm bảo MongoDB đang chạy..."
systemctl start mongod 2>/dev/null || systemctl start mongodb 2>/dev/null || true
systemctl enable mongod 2>/dev/null || systemctl enable mongodb 2>/dev/null || true

echo "--> 2. Giải phóng cổng 8088 và 8080 (diệt tiến trình treo nếu có)..."
fuser -k 8088/tcp 2>/dev/null || true
fuser -k 8080/tcp 2>/dev/null || true
pkill -9 -f app.jar 2>/dev/null || true

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

echo "--> 7. Đợi 10 giây để Spring Boot hoàn tất khởi động & nạp MongoDB..."
sleep 10

echo "--> 8. Kiểm tra trạng thái PM2..."
pm2 status cinestreams-backend

echo "--> 9. Kiểm tra cổng 8088 trên VPS..."
netstat -tulpn | grep 8088 || ss -tulpn | grep 8088 || true

echo "--> 10. Thử nghiệm gọi API nội bộ http://127.0.0.1:8088/api/test/public..."
curl -s -o /dev/null -w "HTTP Status Code nội bộ: %{http_code}\n" http://127.0.0.1:8088/api/test/public || true

echo "--> 11. 30 dòng log mới nhất của Backend..."
pm2 logs cinestreams-backend --lines 30 --nostream
EOF

echo -e "\033[1;32m=================================================================\033[0m"
echo -e "\033[1;32m   🎉 TRIỂN KHAI HOÀN TẤT LÊN VPS ${HOST_IP}!                   \033[0m"
echo -e "\033[1;32m=================================================================\033[0m"
echo "🌐 Website Frontend : https://cinestreams999.io.vn (hoặc http://${HOST_IP})"
echo "🔌 Backend REST API : https://cinestreams999.io.vn/api (hoặc http://${HOST_IP}:8088/api)"
echo "📊 Quản lý PM2 VPS  : ssh ${USER}@${HOST_IP} -> pm2 status"
echo -e "\033[1;32m=================================================================\033[0m"
