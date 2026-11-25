# 🎬 CineStreams — High Performance Movie Streaming Platform

<p align="center">
  <img src="https://img.shields.io/badge/Spring%20Boot-3.3.5-brightgreen.svg" alt="Spring Boot 3" />
  <img src="https://img.shields.io/badge/Java-17-orange.svg" alt="Java 17" />
  <img src="https://img.shields.io/badge/React-18.3.1-blue.svg" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue.svg" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-6.0-purple.svg" alt="Vite 6" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/MongoDB-7.0-green.svg" alt="MongoDB" />
  <img src="https://img.shields.io/badge/FFmpeg-HLS%20ABR-red.svg" alt="FFmpeg" />
  <img src="https://img.shields.io/badge/MinIO-S3%20Storage-C72C48.svg" alt="MinIO" />
  <img src="https://img.shields.io/badge/VietQR-Auto%20Payment-yellow.svg" alt="VietQR" />
  <img src="https://img.shields.io/badge/Socket.IO-Realtime-black.svg" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License MIT" />
</p>

**CineStreams** là nền tảng xem phim trực tuyến chất lượng cao theo mô hình **OTT (Over-The-Top)** thế hệ mới, được thiết kế và triển khai theo kiến trúc **Client–Server Monorepo** chuẩn mực công nghiệp. 

Hệ thống tích hợp toàn diện chuỗi công nghệ hiện đại:
* **Video Pipeline Đột Phá:** Tải lên phân đoạn tự phục hồi (**Chunked Resumable Upload 5GB+**), nén chuyển mã đa độ phân giải ngầm (**FFmpeg Multi-bitrate Transcoding**), truyền phát thích ứng băng thông **HLS Adaptive Bitrate (ABR)** với cơ chế kiểm soát chất lượng phân quyền động (**VIP Quality Gate**).
* **Bảo Mật & Xác Thực Đa Lớp:** Xác thực **JWT Stateless** (Access Token ngắn hạn & Refresh Token dài hạn), kích hoạt tài khoản bằng **Gmail OTP bất đồng bộ (`@Async`)**, xác thực 2 yếu tố (**2FA**), và phân quyền vai trò động (**Dynamic RBAC** - User/Role/Permission).
* **Kinh Doanh & Quản Trị Toàn Diện:** Cổng thanh toán tự động gói VIP qua **VietQR Napas 24/7**, bảng điều khiển quản lý doanh thu & đối soát tài chính, CMS biên tập phim chuyên nghiệp.
* **Tiện Ích Trải Nghiệm Cao Cấp:** Phòng xem phim chung thời gian thực (**Watch Party Realtime**) và Trợ lý điện ảnh thông minh (**CineAI Semantic Search**).

---

## 🏛️ Kiến Trúc Hệ Thống (System Architecture)

```text
                                +-------------------------------------------+
                                |          Client Presentation Tier         |
                                |  (React 18, Vite 6, Tailwind CSS, Hls.js) |
                                +---------------------+---------------------+
                                                      |
                                     HTTP REST / HLS Video Stream / WebSocket
                                                      |
                                                      v
                                +-------------------------------------------+
                                |      Gateway & Reverse Proxy Tier         |
                                |  (Node.js Express + Socket.IO Server:3000)|
                                +---------------------+---------------------+
                                                      |
                                            Reverse Proxy / Forward
                                                      |
                                                      v
                                +-------------------------------------------+
                                |      Application Service Tier             |
                                |  (Spring Boot 3.3.5 / Java 17 - Port 8088)|
                                +--------+-------------------+--------+-----+
                                         |                   |        |
            +----------------------------+                   |        +----------------------------+
            |                                                |                                     |
            v                                                v                                     v
+-----------------------+                        +-----------------------+             +-----------------------+
|  Data Persistence     |                        |  Media Engine & S3    |             | External Integrations |
|  MongoDB 7.0 Cluster  |                        |  FFmpeg Transcoder    |             | - Google Gmail SMTP   |
|  - Users & Roles RBAC |                        |  - Chunk Assembler    |             | - VietQR Napas 24/7   |
|  - Movies & Episodes  |                        |  - HLS 1080p/720p/480p|             | - CineAI Semantic     |
|  - Email OTP (TTL 5m) |                        |  - Local / MinIO Vault|             |                       |
|  - Watch Histories    |                        +-----------------------+             +-----------------------+
+-----------------------+
```

### Chi Tiết 6 Tầng Kiến Trúc Kỹ Thuật:
1. **Client Presentation Tier (Frontend):** Xây dựng bằng React 18, Vite 6, TypeScript 5, Tailwind CSS dark/red theme, Zustand state stores, và thư viện phát video `Hls.js` hỗ trợ tự thích ứng độ trễ thấp.
2. **Gateway Tier (Dev & Local):** Máy chủ trung gian Node.js Express kết hợp Socket.IO server (cổng `3000`), vừa làm máy chủ phát triển Vite HMR, vừa làm Smart Proxy chuyển tiếp các request `/api` sang Spring Boot kèm cơ chế chịu lỗi (failover/fallback).
3. **Application Service Tier (Backend):** Xây dựng trên Spring Boot 3.3.5 và Java 17 (cổng `8088`), triển khai Spring Security 6 với JWT filter, Spring MVC RESTful APIs, Jakarta Bean Validation, và `@Async ThreadPoolTaskExecutor` xử lý gửi mail OTP không gây nghẽn luồng.
4. **Media Processing Engine:** Bộ xử lý video chuyên dụng sử dụng `ProcessBuilder` điều phối `FFmpeg` và `FFprobe`, phân giải video tải lên thành luồng HLS đa chuẩn (1080p, 720p, 480p, 360p) cùng tệp chỉ mục `master.m3u8`.
5. **Data Persistence Tier:** Cơ sở dữ liệu MongoDB 7.0 NoSQL kết hợp TTL Index tự động dọn dẹp bản ghi OTP hết hạn. Hệ thống hỗ trợ mô hình lưu trữ linh hoạt (**Pluggable Storage**): Local File System hoặc MinIO Object Storage tương thích chuẩn AWS S3.
6. **External Integration Tier:** Tích hợp máy chủ Google Gmail SMTP bảo mật qua App Password, API sinh mã VietQR Napas 24/7 theo mã đơn hàng động, và mô hình CineAI gợi ý điện ảnh.

---

## 📁 Cấu Trúc Thư Mục Monorepo Chuẩn (Project Structure)

```text
cinestreams/
├── .github/                           # Tự động hóa CI/CD
│   └── workflows/
│       └── ci.yml                     # Pipeline tự động kiểm thử Backend & Frontend
├── docs/                              # Tài liệu kỹ thuật, quản trị & thiết kế
│   ├── api/                           # Bộ sưu tập Postman Collection 9 suites kiểm thử
│   ├── design/                        # Bản thiết kế UI/UX Stitch CineStreams
│   ├── management/                    # Quản trị dự án 65 Tasks (.xlsx & .csv)
│   └── SRS_CineStreams...docx         # Tài liệu Đặc tả Yêu cầu Phần mềm (SRS IEEE 830)
├── client/                            # Toàn bộ mã nguồn Frontend (React + Vite + TS)
│   ├── public/                        # Static assets công khai
│   ├── src/
│   │   ├── assets/                    # Hình ảnh, biểu tượng, logo CineStreams
│   │   ├── components/                # UI components dùng chung (Navbar, Footer, Modals)
│   │   ├── data/                      # Dữ liệu tĩnh (Plans, Fallback Movies)
│   │   ├── features/                  # Phân hệ chức năng theo nghiệp vụ:
│   │   │   ├── account/               # Quản lý hồ sơ cá nhân & đổi mật khẩu
│   │   │   ├── admin/                 # CMS Quản trị phim, tập phim & phân quyền User
│   │   │   ├── auth/                  # Đăng nhập, Đăng ký OTP, 2FA, Quên mật khẩu
│   │   │   ├── catalog/               # Bộ lọc phim, danh mục (Phim lẻ, Phim bộ, Anime)
│   │   │   ├── cineai/                # Trợ lý điện ảnh thông minh CineAI
│   │   │   ├── finance/               # Quản lý doanh thu, giao dịch & đối soát VietQR
│   │   │   ├── home/                  # Trang chủ, Hero banner, Top 10 Trending, Bento
│   │   │   ├── movie/                 # Chi tiết phim & Trình phát HLS Player 4K
│   │   │   ├── ranking/               # Bảng xếp hạng phim theo lượt xem
│   │   │   ├── vip/                   # Bảng gói VIP & thanh toán VietQR tự động
│   │   │   └── watchparty/            # Phòng xem phim chung thời gian thực
│   │   ├── hooks/                     # Custom React Hooks (useDebounce,...)
│   │   ├── services/                  # API Client (Axios/Fetch), Auth, Socket.IO, RAG
│   │   ├── stores/                    # Quản lý state toàn cục qua Zustand
│   │   ├── types/                     # TypeScript types & interface definitions
│   │   ├── utils/                     # Chunk Uploader, Formatters
│   │   ├── App.tsx                    # Cấu hình định tuyến React Router v6
│   │   ├── index.css                  # Cấu hình Tailwind CSS & hiệu ứng cinematic
│   │   └── main.tsx                   # Điểm khởi chạy React DOM
│   ├── index.html                     # Single Page Application HTML root
│   ├── package.json                   # Dependencies & npm scripts của client
│   ├── server.ts                      # Express Gateway + Socket.IO Server
│   ├── tailwind.config.js             # Cấu hình Tailwind CSS Dark/Red theme
│   ├── tsconfig.json                  # Cấu hình trình biên dịch TypeScript
│   └── vite.config.ts                 # Cấu hình Vite build & proxy
├── server/                            # Toàn bộ mã nguồn Backend (Spring Boot 3 + Java 17)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/vti/jwt/      # Mã nguồn ứng dụng Java:
│   │   │   │   ├── config/            # Security, MongoConfig, AsyncConfig, Seeder
│   │   │   │   ├── controller/        # REST Controllers (Auth, Movie, Stream, Finance,...)
│   │   │   │   ├── dto/               # Request/Response models & validation
│   │   │   │   ├── exception/         # Global Exception Handling & custom errors
│   │   │   │   ├── model/             # MongoDB Documents (User, Movie, Role, Transaction)
│   │   │   │   ├── repository/        # Spring Data MongoDB Repositories
│   │   │   │   ├── security/          # JWT Filters, UserDetailsService, AuthEntryPoint
│   │   │   │   └── service/           # Logic nghiệp vụ (Transcode, Upload, Email, OTP)
│   │   │   └── resources/
│   │   │       ├── application.properties # Cấu hình MongoDB, Gmail SMTP, Upload, MinIO
│   │   │       └── static/            # Static resources
│   │   └── test/                      # Test suites (JUnit 5, MockMvc, Security Tests)
│   ├── uploads/                       # Thư mục lưu trữ Video & Chunks cục bộ
│   │   ├── temp/                      # Chunks tạm thời trong quá trình tải lên
│   │   └── videos/                    # Video đã hoàn tất ghép & transcode HLS
│   ├── mvnw / mvnw.cmd                # Maven Wrapper cho Linux/macOS & Windows
│   └── pom.xml                        # Cấu hình Maven dependencies & plugins
├── cinestreams.nginx.conf             # File cấu hình mẫu Reverse Proxy trên Nginx
├── deploy.ps1 / deploy.sh             # Script tự động đóng gói & deploy lên VPS Ubuntu
├── deploy-frontend.ps1 / .sh          # Script deploy riêng biệt giao diện Frontend
├── fix-502.sh                         # Script tự chẩn đoán & khắc phục lỗi 502 Bad Gateway
├── docker-compose.yml                 # File khởi chạy MongoDB 7.0 container
├── package.json                       # Monorepo Workspace configuration
└── README.md                          # Tài liệu đồng bộ tổng quan toàn bộ dự án
```

---

## 🛡️ Các Tính Năng Kỹ Thuật Trọng Tâm (Engineering Highlights)

### 1. Xác Thực Bảo Mật Đa Tầng & Dynamic RBAC
* **Mô hình Token Kép (Access Token & Refresh Token):**
  * `AccessToken`: Hiệu lực 15 phút, phi trạng thái (*Stateless*), dùng để xác thực quyền truy cập tài nguyên API mà không cần truy vấn DB liên tục.
  * `RefreshToken`: Hiệu lực 7 ngày, lưu trữ trong MongoDB, dùng để cấp mới Access Token hoặc thu hồi ngay lập tức (*Revoke*) khi người dùng bấm Đăng xuất.
* **Email OTP Bất Đồng Bộ (`@Async` ThreadPool):**
  * Tách luồng gửi mail ra executor riêng biệt (`core-size: 5`, `max-size: 20`, `queue-capacity: 100`), giúp HTTP request đăng ký tài khoản phản hồi tức thì (< 50ms).
  * Mã OTP 6 chữ số sinh ngẫu nhiên, tự hủy sau 5 phút qua **MongoDB TTL Index**, hỗ trợ cơ chế chống spam (60 giây cooldown).
* **Bảo Mật Hai Yếu Tố (2FA):** Tùy chọn đăng nhập bảo vệ nâng cao: Sau khi khớp mật khẩu, hệ thống gửi mã xác thực về email để kiểm chứng danh tính.
* **Ma Trận Phân Quyền Động (RBAC):** Thiết lập quan hệ chặt chẽ giữa `User` ⟷ `Role` ⟷ `Permission` với 6 vai trò tiêu chuẩn và 14 quyền hạn độc lập.

### 2. Tải Lên Video Phân Đoạn (Chunked Resumable Upload 5GB+)
* Phía Client chia nhỏ tệp video lớn thành các lát cắt (`Blob.slice`, dung lượng chuẩn 5MB/chunk).
* Hỗ trợ tạm dừng (Pause), tiếp tục (Resume) khi mất kết nối mạng bằng cách truy vấn danh sách phân đoạn đã nhận (`/api/upload/status/{uploadId}`).
* Backend lưu trữ các chunk trong thư mục tạm `uploads/temp/{uploadId}`. Khi hoàn tất, hệ thống sử dụng **Java NIO `FileChannel`** ghép nối tốc độ cao và kiểm tra toàn vẹn mã băm MD5.

### 3. Bộ Xử Lý Video FFmpeg & Phát Thích Ứng HLS ABR
* Tự động trích xuất thông số kỹ thuật (Resolution, Duration, Codec, Bitrate) qua `FFprobe` và tự chụp ảnh thumbnail đại diện.
* Chuyển đổi mã đa luồng (Multi-bitrate Transcoding) ra chuẩn **Apple HLS**:
  * **1080p Full HD:** 5000 kbps, 1920x1080
  * **720p HD:** 2800 kbps, 1280x720
  * **480p SD:** 1400 kbps, 842x480
  * **360p Low:** 800 kbps, 640x360
* **VIP Quality Gate (Dynamic Master Playlist):** Server kiểm tra quyền của tài khoản khi yêu cầu tệp `master.m3u8`. Tài khoản miễn phí (`ROLE_FREE_USER`) chỉ nhận manifest giới hạn tối đa 720p; chỉ thành viên VIP (`ROLE_VIP_USER`) mới được cấp luồng 1080p/4K Dolby Atmos.
* **Byte-Range Request (HTTP 206 Partial Content):** Hỗ trợ tua phim (seek) tức thì không cần tải lại toàn bộ nội dung.

### 4. Cổng Thanh Toán Gói VIP VietQR Napas 24/7 & Quản Lý Doanh Thu
* Tạo mã đơn hàng độc nhất (`CINE-XXXXXX`) và sinh mã VietQR Napas 24/7 động tích hợp số tiền, số tài khoản nhận (MBBank: `0345469878` - `HA DINH LUC`) và cú pháp chuyển khoản `CS CINE...`.
* Kích hoạt gói cước VIP và cấp quyền tự động ngay sau khi đối soát thành công.
* Trang quản trị tài chính (`/quan-ly-doanh-thu`): Thống kê tổng doanh thu, doanh số theo từng gói (1 Tháng, 6 Tháng, 1 Năm), quản lý hoàn tiền (*Refund*) và đối soát cổng thanh toán (*Reconciliation*).

### 5. Phòng Xem Phim Chung Thời Gian Thực (Watch Party)
* Cho phép người dùng VIP tạo phòng xem phim chung và gửi liên kết mời bạn bè.
* Đồng bộ trạng thái phát video (Play, Pause, Seek time) giữa tất cả người xem trong phòng qua **Server-Sent Events (SSE)** hoặc **Socket.IO**.
* Khung chat trực tiếp thời gian thực ngay bên cạnh khung phát video.

### 6. Trợ Lý Điện Ảnh Thông Minh (CineAI)
* Trợ lý ảo tích hợp công nghệ tìm kiếm ngữ nghĩa sâu (DeepSemantic Movie Search).
* Trò chuyện, phân tích nội dung, giải thích tình tiết phim và gợi ý danh sách xem phù hợp theo cảm xúc và sở thích của người dùng.

---

## 🔑 Bảng Tài Khoản Thử Nghiệm Mẫu (Demo Credentials)

Hệ thống được khởi tạo sẵn dữ liệu mẫu thông qua `DatabaseSeeder` với đầy đủ các vai trò nghiệp vụ:

| Vai Trò Hệ Thống | Tên Đăng Nhập | Mật Khẩu | Email Gắn Kèm | Quyền Hạn Nghiệp Vụ Nổi Bật |
|:---|:---|:---|:---|:---|
| **Tổng Quản Trị (Admin & PM)** | `admin` | `admin123` | `admin@vti.com.vn` | Toàn quyền cấu hình hệ thống, phân quyền người dùng, quản trị phim, xem doanh thu |
| **Project Manager & Tech Lead** | `hadinhluc_pm` | `123456` | `luc.hadinh@cinestreams.vn` | Tài khoản PM tích hợp đầy đủ quyền Admin, VIP 4K, Watch Party Host |
| **Biên Tập Nội Dung (Content Editor)** | `editor` | `editor123` | `editor@cinestreams.vn` | Quản trị CMS phim, upload video phân đoạn, cấu hình tập phim và phụ đề WebVTT |
| **Quản Lý Tài Chính (Finance Manager)** | `finance` | `finance123` | `finance@cinestreams.vn` | Xem báo cáo doanh thu, đối soát lịch sử giao dịch VietQR, xử lý hoàn tiền đơn hàng |
| **Thành Viên VIP (VIP User 4K)** | `vip_user` | `vip123` | `vip@cinestreams.vn` | Mở khóa xem chất lượng 1080p/4K Dolby Atmos, tạo phòng Watch Party, không quảng cáo |
| **Người Dùng Miễn Phí (Free User)** | `free_user` | `free123` | `free@cinestreams.vn` | Xem phim danh mục công khai, chất lượng tối đa 720p HD |
| **Đăng Ký Tài Khoản Mới** | *Tự đăng ký* | *Tự đặt* | *Gmail cá nhân* | Nhận mã OTP 6 số qua email thực tế để kích hoạt tài khoản |

---

## 🌐 Danh Mục Điều Hướng Giao Diện (Frontend Routes)

| Đường Dẫn (Route) | Tên Màn Hình / Chức Năng | Đối Tượng Sử Dụng |
|:---|:---|:---|
| `/` | **Trang Chủ (Home):** Hero banner, Top 10 thịnh hành, Phim mới cập nhật, Bento Tech | Tất cả khách truy cập |
| `/phim-le` | **Phim Lẻ (Movies):** Danh mục phim lẻ chiếu rạp tuyển chọn | Tất cả khách truy cập |
| `/phim-bo` | **Phim Bộ (Series):** Danh mục phim truyền hình dài tập | Tất cả khách truy cập |
| `/hoat-hinh` | **Hoạt Hình (Anime):** Danh mục hoạt hình & anime Nhật Bản | Tất cả khách truy cập |
| `/bo-loc` | **Bộ Lọc Phim Nâng Cao:** Lọc theo thể loại, năm phát hành, quốc gia, sắp xếp | Tất cả khách truy cập |
| `/bang-xep-hang` | **Bảng Xếp Hạng:** Top phim có lượt xem và đánh giá cao nhất | Tất cả khách truy cập |
| `/phim/:id` | **Chi Tiết Phim:** Thông tin tóm tắt, diễn viên, trailer, danh sách mùa & tập | Tất cả khách truy cập |
| `/xem-phim/:id` | **Trình Phát Phim 4K:** Trình phát HLS đa độ phân giải, lưu lịch sử xem | Thành viên đăng nhập |
| `/vip-goi-cuoc` | **Gói Cước VIP:** Bảng so sánh đặc quyền và quét mã VietQR tự động | Tất cả khách truy cập |
| `/watch-party` | **Phòng Xem Chung:** Tạo phòng và đồng bộ xem phim chung thời gian thực | Thành viên VIP |
| `/tro-ly-phim-ai` | **Trợ Lý CineAI:** Trò chuyện thông minh, phân tích và gợi ý phim | Tất cả khách truy cập |
| `/tai-khoan` | **Hồ Sơ Tài Khoản:** Thông tin cá nhân, lịch sử giao dịch và đổi mật khẩu | Thành viên đăng nhập |
| `/dang-nhap` | **Đăng Nhập:** Đăng nhập username/password, hỗ trợ 2FA OTP | Khách vãng lai |
| `/dang-ky` | **Đăng Ký:** Nhập thông tin & xác minh OTP qua Gmail | Khách vãng lai |
| `/ho-so` | **Chọn Hồ Sơ:** Lựa chọn profile thành viên trong gia đình | Thành viên đăng nhập |
| `/quan-tri-phim` | **CMS Quản Trị Phim:** Đăng tải phim, chunked upload, mùa & tập | Editor, Admin |
| `/quan-ly-phan-quyen` | **Quản Trị Người Dùng & Quyền:** Phân vai trò và cấp quyền hạn | Admin |
| `/quan-ly-doanh-thu` | **Quản Trị Doanh Thu & Đối Soát:** Biểu đồ doanh thu, đối soát VietQR, hoàn tiền | Finance, Admin |

---

## 🔌 Danh Sách REST API Endpoints Chính

### 1. Phân Hệ Xác Thực & Tài Khoản (`/api/auth`)
* `POST /api/auth/register` — Đăng ký tài khoản người dùng mới
* `POST /api/auth/login` — Đăng nhập hệ thống, cấp Access Token & Refresh Token
* `POST /api/auth/register-otp` — Đăng ký tài khoản kèm gửi mã OTP bất đồng bộ qua Gmail
* `POST /api/auth/verify-register-otp` — Xác thực OTP 6 số để kích hoạt tài khoản
* `POST /api/auth/login-2fa` — Bước 1 xác thực 2FA: Kiểm tra mật khẩu và gửi OTP về email
* `POST /api/auth/verify-login-2fa` — Bước 2 xác thực 2FA: Nhập OTP để nhận JWT Token
* `POST /api/auth/forgot-password-otp` — Gửi mã OTP khôi phục mật khẩu qua email
* `POST /api/auth/verify-forgot-password-otp` — Kiểm tra tính hợp lệ của OTP quên mật khẩu
* `POST /api/auth/reset-password` — Đặt lại mật khẩu mới
* `POST /api/auth/resend-otp` — Gửi lại mã OTP (áp dụng giới hạn 60s cooldown)
* `POST /api/auth/refreshtoken` — Cấp mới Access Token bằng Refresh Token
* `POST /api/auth/logout` — Đăng xuất an toàn và thu hồi Refresh Token trong DB

### 2. Phân Hệ Phim & Nội Dung (`/api/movies`)
* `GET /api/movies` — Lấy danh sách phim (hỗ trợ phân trang, tìm kiếm từ khóa, lọc theo thể loại)
* `GET /api/movies/genres` — Lấy danh mục các thể loại phim hiện có
* `GET /api/movies/{idOrSlug}` — Lấy thông tin chi tiết một bộ phim theo ID hoặc Slug
* `POST /api/movies/{idOrSlug}/view` — Tăng số lượt xem của bộ phim
* `GET /api/episodes/movie/{movieId}` — Lấy danh sách tập phim thuộc bộ phim
* `GET /api/admin/movies` — [CMS] Lấy danh sách phim phục vụ quản trị
* `POST /api/admin/movies` — [CMS] Tạo mới bản ghi phim (yêu cầu quyền `movie:manage`)
* `PUT /api/admin/movies/{id}` — [CMS] Cập nhật metadata thông tin phim
* `DELETE /api/admin/movies/{id}` — [CMS] Xóa phim khỏi hệ thống

### 3. Phân Hệ Tải Lên Phân Đoạn & Xử Lý Video (`/api/upload`)
* `POST /api/upload/init` — Khởi tạo phiên upload (trả về `uploadId` và kích thước phân đoạn)
* `POST /api/upload-chunk` (hoặc `/api/upload/chunk`) — Tải lên một phân đoạn cụ thể kèm thứ tự index
* `GET /api/upload/status/{uploadId}` — Kiểm tra danh sách các phân đoạn đã nhận để resume tải lên
* `POST /api/merge-chunks` (hoặc `/api/upload/complete`) — Kích hoạt ghép file bằng FileChannel & kích hoạt chuyển mã FFmpeg ngầm
* `GET /api/transcode-status/{videoId}` — Kiểm tra tiến độ chuyển mã video HLS
* `POST /api/{movieId}/subtitle` — Tải lên tệp phụ đề định dạng WebVTT

### 4. Phân Hệ Phát Luồng Trực Tuyến (`/api/stream`)
* `GET /api/stream/ticket` — Tạo vé Stream Ticket có chữ ký điện tử ngắn hạn
* `GET /api/stream/video/{videoId}` — Phát luồng video trực tiếp qua HTTP Byte-Range Request
* `GET /api/stream/hls/{movieId}/master.m3u8` — Trả về Dynamic Master Playlist (áp dụng VIP Quality Gate)
* `POST /api/user/history` — Lưu lại vị trí thời gian đang xem dở của người dùng
* `GET /api/user/history/{movieId}` — Lấy lại mốc thời gian đã xem gần nhất để tiếp tục phát

### 5. Phân Hệ Tài Chính & Gói Cước VIP (`/api/finance`)
* `GET /api/finance/overview` — Lấy tổng quan doanh thu, số lượng đơn hàng, số tiền đã hoàn
* `GET /api/finance/transactions` — Lấy danh sách lịch sử giao dịch mua gói VIP VietQR
* `POST /api/finance/refund` — Xử lý hoàn tiền cho giao dịch theo mã đơn hàng
* `POST /api/finance/reconciliation` — Chạy đối soát dữ liệu cổng thanh toán

### 6. Phân Hệ Phân Quyền & Quản Lý Người Dùng (`/api/roles`, `/api/permissions`)
* `GET /api/roles` — Lấy danh sách tất cả vai trò trong hệ thống
* `POST /api/roles` — Tạo mới vai trò
* `POST /api/roles/user/{userId}` — Gán vai trò cho người dùng cụ thể
* `GET /api/permissions` — Lấy danh sách các quyền hạn chức năng
* `POST /api/permissions/assign` — Gán quyền hạn vào vai trò

### 7. Phân Hệ Xem Phim Chung Watch Party (`/api/rooms`)
* `GET /api/rooms` — Lấy danh sách các phòng xem chung đang mở
* `POST /api/rooms` — Tạo phòng xem chung mới
* `GET /api/rooms/{roomId}` — Xem thông tin chi tiết phòng
* `GET /api/rooms/{roomId}/events` — Kết nối luồng Server-Sent Events (SSE) để đồng bộ thời gian thực
* `POST /api/rooms/{roomId}/action` — Gửi lệnh điều khiển (Play, Pause, Seek, Chat) tới phòng

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Local (Quick Start)

### 1. Yêu Cầu Môi Trường (Prerequisites)
* **Java Development Kit:** JDK 17 trở lên (`java -version`).
* **Node.js & npm:** Node.js v18 trở lên, khuyên dùng Node 20 LTS (`node -v`).
* **MongoDB:** Bản 6.0 hoặc 7.0 (chạy local cổng `27017` hoặc qua Docker).
* **FFmpeg:** Cài đặt FFmpeg và cấu hình biến môi trường PATH để thực thi lệnh chuyển mã video (`ffmpeg -version`).

---

### 2. Khởi Chạy Cơ Sở Dữ Liệu MongoDB
Khởi chạy dịch vụ MongoDB 7.0 bằng Docker Compose:
```bash
docker compose up -d mongodb
```
> Hoặc sử dụng dịch vụ MongoDB Community Server đã cài đặt sẵn trên máy tính của bạn tại địa chỉ: `mongodb://localhost:27017/cinestreams`.

---

### 3. Cấu Hình & Khởi Chạy Backend (Spring Boot 3)
Kiểm tra cấu hình trong tệp `server/src/main/resources/application.properties`:
* Cấu hình kết nối MongoDB (`spring.data.mongodb.uri`).
* Cấu hình tài khoản gửi thư Google Gmail SMTP (`spring.mail.username` và `spring.mail.password`).
* Chế độ lưu trữ: `storage.type=local` (mặc định) hoặc chuyển sang `minio` nếu sử dụng MinIO S3 Object Storage.

Di chuyển vào thư mục `server/` và khởi chạy ứng dụng:

**Trên Windows (PowerShell/CMD):**
```powershell
cd server
.\mvnw.cmd spring-boot:run
```

**Trên Linux / macOS:**
```bash
cd server
chmod +x ./mvnw
./mvnw spring-boot:run
```
> **Backend Service khởi chạy tại:** `http://localhost:8088`. Database Seeder sẽ tự động nạp toàn bộ danh mục thể loại, quyền hạn, vai trò và các tài khoản thử nghiệm mẫu.

---

### 4. Cài Đặt & Khởi Chạy Frontend (React + Vite Gateway)
Mở một cửa sổ Terminal mới tại thư mục gốc của dự án:

```bash
# Cài đặt toàn bộ dependencies cho Client
npm --prefix client install

# Khởi chạy ứng dụng (Express Gateway + Vite HMR)
npm run dev
```

> **Truy cập ứng dụng tại:** **[http://localhost:3000](http://localhost:3000)**  
> Cổng `3000` đóng vai trò vừa là giao diện Client, vừa tự động chuyển tiếp (*Reverse Proxy*) các lời gọi API tới Backend Spring Boot (`http://127.0.0.1:8088`).

---

### 5. Các Lệnh Tiện Ích Trong Monorepo (`package.json`)

| Câu Lệnh | Ý Nghĩa Chức Năng |
|:---|:---|
| `npm run dev` | Khởi chạy máy chủ phát triển Frontend Gateway (Port 3000) |
| `npm run build:client` | Đóng gói production bản build Frontend vào `client/dist` |
| `npm run build` | Đóng gói toàn diện cả Frontend (`dist`) và Backend (`jar`) |
| `npm run server:run` | Khởi chạy nhanh máy chủ Backend Spring Boot qua Maven Wrapper |
| `npm run server:test` | Chạy toàn bộ test suites kiểm thử tự động của Backend |
| `npm run deploy` | Thực thi script tự động hóa deploy toàn bộ dự án lên VPS |
| `npm run deploy:frontend` | Thực thi script build và deploy nhanh giao diện Frontend |

---

## ☁️ Hướng Dẫn Triển Khai Production (VPS Ubuntu Deployment)

Dự án đã được cấu hình sẵn sàng cho việc đưa lên môi trường máy chủ thực tế (Production VPS):
* **Địa chỉ máy chủ mẫu:** `150.95.111.156`
* **Tên miền cấu hình:** `cinestreams999.io.vn`

### 1. Cấu Hình Nginx Reverse Proxy
Cấu hình mẫu được lưu tại tệp `cinestreams.nginx.conf`:
* Giới hạn kích thước file upload: `client_max_body_size 500M;`
* Phục vụ trực tiếp thư mục tĩnh SPA: `root /var/www/cinestreams/dist;`
* Chuyển tiếp các request `/api/` tới Spring Boot chạy cục bộ tại cổng `8088`.
* Tắt buffering đối với endpoint `/api/watchparty` để phục vụ truyền dữ liệu SSE và realtime không bị trễ.
* Phục vụ luồng video HLS trực tiếp qua đường dẫn `/uploads/` và `/hls/`.

### 2. Tự Động Hóa Triển Khai Bằng Script
* **Triển khai toàn diện (Cả Frontend + Backend):**
  * Trên Windows: Chạy `.\deploy.ps1`
  * Trên Linux: Chạy `./deploy.sh`
* **Triển khai riêng giao diện Frontend:**
  * Trên Windows: Chạy `.\deploy-frontend.ps1`
  * Trên Linux: Chạy `./deploy-frontend.sh`
* **Tự chẩn đoán và khắc phục sự cố kết nối:**
  * Nếu gặp lỗi 502 Bad Gateway trên máy chủ, chạy script `./fix-502.sh` trên VPS để tự động kiểm tra trạng thái dịch vụ Spring Boot và reload lại cấu hình Nginx.

---

## 📊 Tài Liệu Kỹ Thuật & Quản Trị Dự Án

* **Tài liệu Đặc tả Yêu cầu Phần mềm (SRS):** Tệp `docs/SRS_CineStreams_Dac_Ta_Yeu_Cau_Phan_Mem.docx` biên soạn theo chuẩn IEEE Std 830-1998, bao gồm đầy đủ biểu đồ Use Case, ma trận yêu cầu chức năng/phi chức năng, quy chuẩn giao diện và lược đồ cơ sở dữ liệu.
* **Bộ Sưu Tập Postman Test Collection:** Tệp `docs/api/CineStreams_Postman_Collection.json` gồm 9 test suites kiểm thử toàn diện các API xác thực, upload phân đoạn, thanh toán VietQR và streaming HLS.
* **Kế Hoạch Quản Trị 65 Tasks:** Tệp `docs/management/Ke_hoach_du_an_CineStreams_65_Tasks_Chi_Tiet.xlsx` và `PROJECT_MANAGEMENT_CINESTREAMS_2026.csv` theo dõi tiến độ chi tiết từng phân hệ từ Sprint 1 đến nghiệm thu đồ án.

---

## 👥 Đội Ngũ Phát Triển (Engineering Team)

Dự án được xây dựng và hoàn thiện bởi nhóm sinh viên chuyên ngành **Fullstack Web Development** — **Viện Đào tạo Công nghệ Thông tin VTI Academy**:

* **Hà Đình Lực** — *Project Manager & Backend Lead / System Architect*
  * Quản trị dự án, thiết kế kiến trúc Monorepo đa tầng, kiến trúc bảo mật JWT/RBAC, pipeline chuyển mã FFmpeg HLS, tích hợp cổng thanh toán VietQR.
* **Triệu Văn Sơn** — *Backend Engineer & Transcoding Specialist*
  * Xây dựng phân hệ gửi mail OTP bất đồng bộ, cơ chế tải lên phân đoạn Chunked Resumable Upload, thiết kế cơ sở dữ liệu MongoDB và tối ưu hiệu năng streaming.
* **Đỗ Phạm Thanh Tùng** — *Frontend Lead & UI/UX Specialist*
  * Thiết kế toàn bộ giao diện người dùng phong cách điện ảnh cao cấp, tích hợp trình phát video `Hls.js`, quản lý state toàn cục Zustand, xây dựng giao diện phòng xem chung Watch Party và CMS quản trị.

---

## 📄 Bản Quyền & Giấy Phép (License)

Dự án được phát hành theo giấy phép **[MIT License](LICENSE)**. Toàn bộ mã nguồn được phát triển phục vụ mục đích học tập, nghiên cứu và bảo vệ đồ án tốt nghiệp chuyên ngành Lập trình Phần mềm & Fullstack Web Development tại **VTI Academy**.
