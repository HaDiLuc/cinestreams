#!/usr/bin/env bash
# ==============================================================================
# CineStreams - Upload & Update Frontend only (Bash / macOS / Linux)
# Target: root@150.95.111.156 | Domain: cinestreams999.io.vn
# ==============================================================================

set -e

HOST_IP="${1:-150.95.111.156}"
USER="${2:-root}"
FRONTEND_DIR="/var/www/cinestreams/dist"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/client" ]; then
    PROJECT_ROOT="$SCRIPT_DIR"
elif [ -d "$SCRIPT_DIR/cinestreams/client" ]; then
    PROJECT_ROOT="$SCRIPT_DIR/cinestreams"
elif [ -d "$(pwd)/cinestreams/client" ]; then
    PROJECT_ROOT="$(pwd)/cinestreams"
elif [ -d "$(pwd)/client" ]; then
    PROJECT_ROOT="$(pwd)"
else
    PROJECT_ROOT="$SCRIPT_DIR"
fi

CLIENT_DIR="$PROJECT_ROOT/client"
DIST_DIR="$CLIENT_DIR/dist"

echo -e "\033[1;36m[🚀] 1/3. Build lại Frontend mới nhất tại $CLIENT_DIR...\033[0m"
(cd "$CLIENT_DIR" && npm run build)

echo -e "\033[1;36m[🚀] 2/3. Upload thư mục dist lên VPS ${USER}@${HOST_IP}:${FRONTEND_DIR}...\033[0m"
scp -r "$DIST_DIR"/* "${USER}@${HOST_IP}:${FRONTEND_DIR}/"

echo -e "\033[1;36m[🚀] 3/3. Thiết lập phân quyền Nginx (www-data)...\033[0m"
ssh "${USER}@${HOST_IP}" "mkdir -p /var/www/cinestreams/client && ln -sfn /var/www/cinestreams/dist /var/www/cinestreams/client/dist && chown -R www-data:www-data /var/www/cinestreams/dist && chmod -R 755 /var/www/cinestreams/dist"

echo -e "\033[1;32m=================================================================\033[0m"
echo -e "\033[1;32m   🎉 CẬP NHẬT FRONTEND LÊN VPS THÀNH CÔNG!                      \033[0m"
echo -e "\033[1;32m   Kiểm tra tại: https://cinestreams999.io.vn                   \033[0m"
echo -e "\033[1;32m=================================================================\033[0m"
