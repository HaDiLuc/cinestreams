#!/usr/bin/env bash
# ==============================================================================
# CineStreams - Script Sửa Lỗi Tự Động 502 Bad Gateway Nginx / API
# Chạy trực tiếp trên VPS Ubuntu (150.95.111.156) hoặc qua:
# ssh root@150.95.111.156 "bash -s" < fix-502.sh
# ==============================================================================

set -e

echo -e "\033[1;35m=================================================================\033[0m"
echo -e "\033[1;35m     CINESTREAMS AUTO-FIX: SỬA TRIỆT ĐỂ LỖI 502 BAD GATEWAY     \033[0m"
echo -e "\033[1;35m=================================================================\033[0m"

# 1. Kiểm tra quyền root
if [ "$EUID" -ne 0 ]; then
  echo "⚠️ Vui lòng chạy script với quyền root hoặc sudo: sudo bash $0"
  exit 1
fi

export PATH=$PATH:/usr/local/bin:/usr/bin:/bin:/usr/local/sbin:/usr/sbin:/sbin
[ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh" 2>/dev/null || true
[ -s "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true

# 2. Đảm bảo Swap bộ nhớ để tránh Java bị Linux OOM Killer tắt đột ngột
echo -e "\033[1;36m[🚀] 1/7. Kiểm tra Swap bộ nhớ RAM...\033[0m"
SWAP_EXISTS=$(swapon --show | wc -l)
if [ "$SWAP_EXISTS" -le 1 ]; then
    echo "VPS chưa có Swap. Đang tạo Swap 2GB để bảo vệ RAM cho Spring Boot..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile || true
    if ! grep -q '/swapfile' /etc/fstab; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    echo -e "\033[1;32m[✅] Đã kích hoạt 2GB Swap an toàn.\033[0m"
else
    echo -e "\033[1;32m[✅] Swap đã sẵn sàng.\033[0m"
fi

# 3. Đảm bảo MongoDB đang chạy
echo -e "\033[1;36m[🚀] 2/7. Kiểm tra và khởi động dịch vụ cơ sở dữ liệu MongoDB...\033[0m"
systemctl start mongod 2>/dev/null || systemctl start mongodb 2>/dev/null || true
systemctl enable mongod 2>/dev/null || systemctl enable mongodb 2>/dev/null || true

if systemctl is-active --quiet mongod || systemctl is-active --quiet mongodb; then
    echo -e "\033[1;32m[✅] Dịch vụ MongoDB đang hoạt động tốt.\033[0m"
else
    echo "⚠️ Đang thử phục hồi dịch vụ MongoDB..."
    service mongodb restart 2>/dev/null || service mongod restart 2>/dev/null || true
fi

# 4. Kiểm tra cấu hình Nginx Reverse Proxy
echo -e "\033[1;36m[🚀] 3/7. Kiểm tra cấu hình Nginx Reverse Proxy (Port 8088)...\033[0m"
NGINX_MODIFIED=0
for conf in /etc/nginx/sites-available/* /etc/nginx/sites-enabled/* /etc/nginx/conf.d/*; do
    if [ -f "$conf" ]; then
        if grep -q "proxy_pass.*8080" "$conf"; then
            echo "⚠️ Phát hiện Nginx đang trỏ tới cổng 8080 tại: $conf"
            echo "-> Tự động cập nhật trỏ về cổng 8088 của Spring Boot..."
            sed -i 's/proxy_pass http:\/\/127.0.0.1:8080/proxy_pass http:\/\/127.0.0.1:8088/g' "$conf"
            sed -i 's/proxy_pass http:\/\/localhost:8080/proxy_pass http:\/\/127.0.0.1:8088/g' "$conf"
            NGINX_MODIFIED=1
        fi
        if grep -q "proxy_pass http://localhost:8088" "$conf"; then
            echo "⚠️ Chuyển 'localhost:8088' thành '127.0.0.1:8088' tại $conf (tránh phân giải IPv6)..."
            sed -i 's/proxy_pass http:\/\/localhost:8088/proxy_pass http:\/\/127.0.0.1:8088/g' "$conf"
            NGINX_MODIFIED=1
        fi
    fi
done

# Kiểm tra cú pháp Nginx và reload
nginx -t && systemctl reload nginx
echo -e "\033[1;32m[✅] Cấu hình Nginx đã được nạp lại thành công.\033[0m"

# 5. Giải phóng cổng và diệt tiến trình treo
echo -e "\033[1;36m[🚀] 4/7. Giải phóng cổng 8088 & 8080, dọn dẹp tiến trình Java cũ...\033[0m"
fuser -k 8088/tcp 2>/dev/null || true
fuser -k 8080/tcp 2>/dev/null || true
pkill -9 -f "app.jar" 2>/dev/null || true
sleep 1
echo -e "\033[1;32m[✅] Các cổng mạng đã được giải phóng sạch sẽ.\033[0m"

# 6. Chuẩn bị thư mục và script start.sh chuẩn cho PM2
echo -e "\033[1;36m[🚀] 5/7. Thiết lập file khởi động chuẩn /var/www/cinestreams/backend/start.sh...\033[0m"
mkdir -p /var/www/cinestreams/backend/uploads/videos /var/www/cinestreams/backend/uploads/temp
mkdir -p /var/www/cinestreams/client
ln -sfn /var/www/cinestreams/dist /var/www/cinestreams/client/dist 2>/dev/null || true
ln -sfn /var/www/cinestreams/backend /var/www/cinestreams/server 2>/dev/null || true
chown -R www-data:www-data /var/www/cinestreams/dist 2>/dev/null || true
chmod -R 755 /var/www/cinestreams/dist 2>/dev/null || true
chmod -R 775 /var/www/cinestreams/backend/uploads 2>/dev/null || true

cat << 'STARTEOF' > /var/www/cinestreams/backend/start.sh
#!/bin/bash
cd /var/www/cinestreams/backend
# Tối ưu RAM cho VPS (128m - 512m) và ép cổng 8088 chuẩn
exec java -Xms128m -Xmx512m -jar /var/www/cinestreams/backend/app.jar --server.port=8088
STARTEOF
chmod +x /var/www/cinestreams/backend/start.sh
echo -e "\033[1;32m[✅] Đã cập nhật start.sh.\033[0m"

# 7. Khởi động lại Spring Boot qua PM2
echo -e "\033[1;36m[🚀] 6/7. Khởi động lại ứng dụng Spring Boot bằng PM2...\033[0m"
pm2 delete cinestreams-backend 2>/dev/null || true
pm2 start /var/www/cinestreams/backend/start.sh --name cinestreams-backend --interpreter bash
pm2 save

echo -e "\033[1;36m[🚀] 7/7. Đang đợi 10 giây để Spring Boot nạp xong Bean & kết nối MongoDB...\033[0m"
for i in {10..1}; do
    echo -n "$i... "
    sleep 1
done
echo ""

# 8. Báo cáo kết quả
echo -e "\033[1;35m=================================================================\033[0m"
echo -e "\033[1;35m                     KẾT QUẢ KIỂM TRA HỆ THỐNG                  \033[0m"
echo -e "\033[1;35m=================================================================\033[0m"
echo "📊 Trạng thái PM2:"
pm2 status cinestreams-backend || true

echo -e "\n🔌 Trạng thái cổng 8088 trên VPS:"
netstat -tulpn | grep 8088 || ss -tulpn | grep 8088 || echo "⚠️ Chưa thấy cổng 8088 mở! Kiểm tra log bên dưới."

echo -e "\n🌐 Kiểm tra gọi API nội bộ (http://127.0.0.1:8088/api/test/public):"
curl -s -o /dev/null -w "HTTP Status Code: %{http_code}\n" http://127.0.0.1:8088/api/test/public || true

echo -e "\n🌐 Kiểm tra gọi API qua Nginx (http://127.0.0.1/api/test/public):"
curl -s -o /dev/null -w "HTTP Status Code Nginx: %{http_code}\n" http://127.0.0.1/api/test/public || true

echo -e "\n📝 25 dòng Log mới nhất của Backend:"
pm2 logs cinestreams-backend --lines 25 --nostream || true

echo -e "\033[1;32m=================================================================\033[0m"
echo -e "\033[1;32m  🎉 HOÀN TẤT XỬ LÝ! Hãy mở lại website kiểm tra:               \033[0m"
echo -e "\033[1;32m     Website: https://cinestreams999.io.vn                      \033[0m"
echo -e "\033[1;32m=================================================================\033[0m"
