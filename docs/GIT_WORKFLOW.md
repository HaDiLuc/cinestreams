# QUY TRÌNH QUẢN LÝ GIT CHO CINESTREAMS
## MÔ HÌNH: SOLO MAINTAINER – TEAM CONTRIBUTORS

> **Phiên bản:** 1.0  
> **Dự án:** CineStreams – Nền tảng xem phim trực tuyến tốc độ cao  
> **Repository:** [https://github.com/HaDiLuc/cinestreams](https://github.com/HaDiLuc/cinestreams)  
> **Người quản trị (Maintainer duy nhất):** Hà Đình Lực  

---

## 1. TỔNG QUAN VÀ BỐI CẢNH DỰ ÁN

Trong giai đoạn hiện tại của dự án CineStreams:
1. **Maintainer duy nhất (Bạn):**
   - Là người duy nhất sử dụng Git và thao tác trực tiếp với GitHub Repository.
   - Chịu trách nhiệm toàn quyền: tiếp nhận mã nguồn, kiểm soát bảo mật, rà soát xung đột, chạy kiểm thử, commit, push, tạo và duyệt Pull Request (PR).
2. **Team Contributors (Các thành viên khác trong nhóm):**
   - Tập trung 100% vào nghiệp vụ lập trình frontend/backend.
   - **Không bắt buộc phải biết hoặc thao tác Git/GitHub**.
   - Bàn giao mã nguồn qua file ZIP, thư mục chia sẻ, hoặc các kênh trao đổi nội bộ theo quy ước chuẩn.

---

## 2. CHIẾN LƯỢC PHÂN NHÁNH (BRANCHING STRATEGY)

Hệ thống quản lý mã nguồn CineStreams tuân thủ nghiêm ngặt mô hình phân nhánh chuẩn công nghiệp:

```
[main] ─────────────────────────────────────────────────────────────● (v1.0.0 Release)
          ▲                                                         │
          │ (Release PR sau khi kiểm thử toàn diện)                 │
[develop] ┴────────────────────●───────────────────────●────────────┴ (Tích hợp liên tục)
               ▲               │          ▲            │
               │ (Feature PR)  │          │ (Fix PR)   │
[feature/*] ───┴───────────────┘          │            │
  (vd: feature/vietqr-payment)            │            │
                                          │            │
[fix/*] ──────────────────────────────────┴────────────┘
  (vd: fix/backend-auth-verification)
```

### Chi tiết các nhánh:

| Nhánh | Nguồn tạo (Base) | Mục đích | Quyền Merge |
| :--- | :--- | :--- | :--- |
| **`main`** | Gốc | Nhánh Production ổn định nhất, sẵn sàng triển khai thực tế. Luôn phải build thành công và vượt qua 100% test suites. | Chỉ Maintainer (qua Release PR từ `develop`) |
| **`develop`** | `main` | Nhánh tích hợp trung tâm chứa các tính năng mới nhất đã được kiểm thử. Mọi tính năng đều hội tụ tại đây trước khi release. | Chỉ Maintainer (qua Feature/Fix PR) |
| **`feature/*`** | `develop` | Phát triển hoặc tích hợp từng tính năng cụ thể. Ví dụ: `feature/vietqr-payment`, `feature/hls-transcoding`, `feature/watchparty-chat`. | Merge vào `develop` |
| **`fix/*`** | `develop` | Sửa chữa lỗi kỹ thuật, lỗi CI hoặc lỗi nghiệp vụ. Ví dụ: `fix/auth-email-verification`, `fix/quality-publish-gate`. | Merge vào `develop` |

---

## 3. NGUYÊN TẮC BẢN GIAO SOURCE CODE (DÀNH CHO TEAM CONTRIBUTORS)

Để đảm bảo quá trình tích hợp diễn ra trơn tru, khi một thành viên hoàn thành chức năng, họ chỉ cần thực hiện 3 bước đơn giản:

### Bước 1: Chuẩn bị gói bàn giao
- Đóng gói thư mục hoặc nén file ZIP chứa các file đã thêm mới hoặc chỉnh sửa.
- **TUYỆT ĐỐI KHÔNG GỬI KÈM:**
  - `node_modules/` (Frontend)
  - `target/` hoặc file `*.jar` (Backend)
  - Thư mục video nặng `uploads/videos/`
  - Các file chứa API key / mật khẩu cá nhân (`.env`)

### Bước 2: Kèm theo "Biên bản bàn giao ngắn"
Thành viên gửi kèm 1 đoạn văn bản ngắn (qua tin nhắn/ghi chú) với cấu trúc:
```text
[BÀN GIAO TÍNH NĂNG]
- Tên tính năng: Cổng thanh toán VietQR gói VIP
- Người thực hiện: [Tên thành viên]
- Danh sách file chỉnh sửa/thêm mới:
  + client/src/features/vip/VipPaymentModal.tsx (Mới)
  + client/server.ts (Thêm route /api/vietqr/generate)
- Hướng dẫn test nhanh: Mở trang /vip, click Mua gói 1 tháng để hiển thị mã QR.
```

---

## 4. QUY TRÌNH MAINTAINER TÍCH HỢP CODE TỪ THÀNH VIÊN (10 BƯỚC CHUẨN)

Mỗi khi nhận được mã nguồn từ thành viên, bạn thực hiện lần lượt quy trình sau:

### Bước 4.1: Đồng bộ nhánh `develop` mới nhất
```powershell
# Chuyển về thư mục dự án
cd D:\VTI-FullStack\cinestreams_26_11\cinestreams\cinestreams

# Đảm bảo nhánh develop được cập nhật mới nhất
git checkout develop
git pull origin develop
```

### Bước 4.2: Tạo nhánh `feature/*` hoặc `fix/*` mới
Đặt tên nhánh theo đúng quy ước:
```powershell
# Nếu là tính năng mới:
git checkout -b feature/vietqr-payment

# Nếu là sửa lỗi:
git checkout -b fix/auth-email-verification
```

### Bước 4.3: Chép đè mã nguồn của thành viên vào thư mục dự án
- Mở thư mục dự án trên máy của bạn.
- Dán các file/thư mục mà thành viên bàn giao vào đúng vị trí tương ứng trong `client/` hoặc `server/`.

### Bước 4.4: Kiểm tra trạng thái và rà soát Diff
Đây là bước **quan trọng nhất** để tránh mất code cũ và phát hiện lỗi ngoài ý muốn:
```powershell
# 1. Xem danh sách các file bị sửa đổi và file mới
git status

# 2. Xem chi tiết từng dòng code thay đổi
git diff

# 3. Đối với các file frontend cụ thể
git diff client/src/features/vip/VipPaymentModal.tsx
```

### Bước 4.5: Rà soát bảo mật nghiêm ngặt (Security Checklist)
Trước khi đưa code vào Staging:
- [ ] Không có file `.env` nào bị thêm vào Git (`git status` không hiển thị `.env`).
- [ ] Không có API Key (Gemini, OpenAI, v.v.) bị gán cứng trong code.
- [ ] Không có App Password Gmail hay mật khẩu Database bị commit thô.
- [ ] Các tham số cấu hình nhạy cảm đều dùng dạng `${ENV_VAR:default_placeholder}`.

### Bước 4.6: Chạy kiểm thử nội bộ (Local Verification)
Đảm bảo code mới không làm hỏng các tính năng hiện tại:
```powershell
# Kiểm tra backend (nếu có sửa đổi server):
cd server
..\..\..\..\..\..\Users\Hadin\.m2\wrapper\dists\apache-maven-3.9.16\0daed3be3ebd1c706f0e69e8b07c6b73f5cc4ea3dfce72a8d0ec2e849ca2ddb0\bin\mvn.cmd test -Dspring.data.mongodb.uri="mongodb://cinestreams_user:CineStreamsPass123%40@127.0.0.1:27017/jwt_demo_db?authSource=cinestreams"

# Kiểm tra frontend build (nếu có sửa đổi client):
cd ../client
npm run build
cd ..
```

### Bước 4.7: Stage và Commit theo chuẩn Conventional Commits
```powershell
# Stage toàn bộ các file đã kiểm tra
git add .

# Xác nhận lại danh sách file chuẩn bị commit
git status

# Tạo commit với thông điệp rõ ràng, đúng chuẩn:
git commit -m "feat(vip): integrate VietQR payment modal and gateway endpoint"
```
*Gợi ý tiền tố commit:*
- `feat:` Thêm chức năng mới.
- `fix:` Sửa lỗi.
- `docs:` Viết hoặc sửa tài liệu.
- `refactor:` Tái cấu trúc code (không đổi nghiệp vụ).
- `test:` Bổ sung hoặc sửa test cases.

### Bước 4.8: Push nhánh Feature lên GitHub
```powershell
git push -u origin feature/vietqr-payment
```

### Bước 4.9: Tạo Pull Request (PR) từ `feature/*` vào `develop`
1. Mở trình duyệt truy cập: [https://github.com/HaDiLuc/cinestreams/pulls](https://github.com/HaDiLuc/cinestreams/pulls)
2. Nhấn nút **New pull request**:
   - **Base branch:** chọn `develop`
   - **Compare branch:** chọn `feature/vietqr-payment`
3. Điền tiêu đề và nội dung tóm tắt tính năng.
4. Kiểm tra tab **Files changed** trên giao diện web để rà soát lại lần cuối.
5. Khi GitHub Actions chạy kiểm thử thành công (Green Checkmark ✅), bạn nhấn **Merge pull request** (chọn *Squash and merge* hoặc *Create a merge commit*).
6. Xóa nhánh feature trên GitHub sau khi merge xong.

### Bước 4.10: Tạo Release PR từ `develop` vào `main` (Chuẩn bị phát hành)
Khi nhánh `develop` đã tích lũy đủ các tính năng ổn định của một mốc đồ án / sprint:
1. Mở GitHub và tạo PR mới:
   - **Base branch:** `main`
   - **Compare branch:** `develop`
2. Đặt tiêu đề: `release: v1.1.0 - CineStreams Core Streaming & Payment Module`
3. Rà soát tổng thể toàn bộ hệ thống.
4. Xác nhận merge vào `main`.
5. Tạo Git Tag (nếu cần):
   ```powershell
   git checkout main
   git pull origin main
   git tag -a v1.1.0 -m "Release version 1.1.0"
   git push origin v1.1.0
   ```

---

## 5. BẢNG TRA CỨU LỆNH NHANH (MAINTAINER CHEATSHEET)

| Tình huống thao tác | Lệnh PowerShell |
| :--- | :--- |
| **Xem trạng thái hiện tại** | `git status` |
| **Xem danh sách nhánh** | `git branch -a` |
| **Chuyển nhánh** | `git checkout <tên_nhánh>` |
| **Tạo và chuyển sang nhánh mới** | `git checkout -b feature/<tên_tính_năng>` |
| **Lấy code mới nhất về máy** | `git pull origin <tên_nhánh>` |
| **Xem chi tiết code thay đổi** | `git diff` |
| **Hủy bỏ thay đổi của 1 file chưa stage** | `git checkout -- <đường_dẫn_file>` |
| **Đưa tất cả file vào staging** | `git add .` |
| **Tạo commit** | `git commit -m "feat: mô tả chức năng"` |
| **Đẩy nhánh mới lên GitHub** | `git push -u origin <tên_nhánh>` |
| **Xóa nhánh local sau khi đã merge** | `git branch -d feature/<tên_tính_năng>` |

---

## 6. QUY TẮC AN TOÀN TUYỆT ĐỐI (GOLDEN RULES)

1. **Không bao giờ commit thẳng lên `main`:** Luôn đi qua luồng `feature/*` $\rightarrow$ `develop` $\rightarrow$ `main`.
2. **Không bao giờ dùng `--force` (`git push -f`):** Trừ khi có sự cố nghiêm trọng cần cứu vãn và đã sao lưu toàn bộ code.
3. **Luôn kiểm tra `.env` trước khi `git add`:** Tuyệt đối không để lộ JWT secret, MongoDB password hay API key của nhóm lên GitHub.
4. **Luôn chạy test trước khi tạo PR:** Đảm bảo nhánh luôn xanh (passed) trên GitHub Actions CI.
