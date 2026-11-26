# 🎬 CineStreams — High Performance Movie Streaming Platform

<p align="center">
  <img src="https://img.shields.io/badge/Spring%20Boot-3.3.5-brightgreen.svg" alt="Spring Boot 3" />
  <img src="https://img.shields.io/badge/Java-21-orange.svg" alt="Java 21" />
  <img src="https://img.shields.io/badge/React-18-blue.svg" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue.svg" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-6-purple.svg" alt="Vite 6" />
  <img src="https://img.shields.io/badge/MongoDB-7.0-green.svg" alt="MongoDB" />
  <img src="https://img.shields.io/badge/FFmpeg-HLS%20ABR-red.svg" alt="FFmpeg" />
  <img src="https://img.shields.io/badge/VietQR-Auto%20Payment-yellow.svg" alt="VietQR" />
</p>

**CineStreams** là nền tảng xem phim trực tuyến chất lượng cao theo mô hình OTT (Over-The-Top), được xây dựng theo kiến trúc **Client–Server Monorepo** chuẩn mực. Dự án tích hợp công nghệ truyền phát video thích ứng băng thông **HLS Adaptive Bitrate (ABR)**, hệ thống xác thực đa lớp (JWT, Email OTP Asynchronous, 2FA), cổng Quản trị nội dung (CMS) hỗ trợ upload video dung lượng lớn qua cơ chế phân đoạn (Chunked Upload), cùng cổng thanh toán tự động gói VIP qua **VietQR 24/7**.

---

## 🏛️ Kiến Trúc Hệ Thống (Architecture)

```text
                               +-----------------------------------+
                               |     Client Browser / Mobile       |
                               |    (React 18, Vite, Tailwind)     |
                               +-----------------+-----------------+
                                                 |
                                       HTTP / REST / HLS Stream
                                                 |
                                                 v
                               +-----------------------------------+
                               |   Client Gateway (Node.js/Express)|
                               |         Port: 3000 / Vite HMR     |
                               +-----------------+-----------------+
                                                 |
                                      Reverse Proxy / API Forward
                                                 |
                                                 v
                               +-----------------------------------+
                               |    CineStreams Backend Service    |
                               |       (Spring Boot 3 / Java 17)   |
                               |             Port: 8088            |
                               +--------+-----------------+--------+
                                        |                 |
                        +---------------+                 +---------------+
                        v                                                 v
      +-----------------------------------+             +-----------------------------------+
      |         MongoDB Database          |             |   FFmpeg Transcoder & Storage     |
      |   - Users, Roles, Permissions     |             |   - Chunk Assembler (5GB+)        |
      |   - Movies, Episodes, Watch Hist  |             |   - HLS Multi-Bitrate Transcoding |
      |   - EmailOtp (TTL Auto-expire)    |             |   - Dynamic Master Playlist (VIP) |
      +-----------------------------------+             +-----------------------------------+
```

---

## 📁 Cấu Trúc Thư Mục Chuẩn (Project Structure)

```text
cinestreams-platform/
├── .github/                       # Tự động hóa CI/CD
│   └── workflows/
│       └── ci.yml                 # Pipeline tự động kiểm thử Backend & Frontend
├── docs/                          # Tài liệu & Thiết kế dự án
│   ├── api/                       # Bộ sưu tập Postman Collection
│   ├── design/                    # Bản thiết kế UI/UX Stitch CineStreams
│   └── management/                # File kế hoạch quản trị 65 Tasks (.xlsx & .csv)
├── client/                        # Toàn bộ Frontend (React + Vite + TypeScript)
│   ├── public/                    # Static assets công khai
│   ├── src/
│   │   ├── assets/                # Hình ảnh, icons, logo
│   │   ├── components/            # UI components dùng chung (Navbar, Footer, Modals)
│   │   ├── data/                  # Dữ liệu tĩnh mẫu (Movies, Plans)
│   │   ├── features/              # Feature modules theo nghiệp vụ:
│   │   │   ├── account/           # Quản lý thông tin & lịch sử xem
│   │   │   ├── admin/             # CMS quản trị phim & chunked upload
│   │   │   ├── auth/              # Đăng nhập, Đăng ký OTP, 2FA
│   │   │   ├── catalog/           # Bộ lọc phim & danh mục
│   │   │   ├── cineai/            # Trợ lý phim thông minh
│   │   │   ├── home/              # Trang chủ, Hero banner, Bento
│   │   │   ├── movie/             # Chi tiết phim & Trình phát Player HLS
│   │   │   ├── ranking/           # Bảng xếp hạng Top 10 thịnh hành
│   │   │   ├── vip/               # Bảng gói VIP & thanh toán VietQR
│   │   │   └── watchparty/        # Phòng xem phim chung thời gian thực
│   │   ├── hooks/                 # Custom React hooks (useDebounce,...)
│   │   ├── services/              # API Client (Axios/Fetch instances)
│   │   ├── stores/                # Zustand State Stores (Auth, Movies, VIP)
│   │   ├── types/                 # TypeScript interfaces & types
│   │   ├── utils/                 # Formatters & helper functions
│   │   ├── App.tsx                # Client Routing (React Router v6)
│   │   ├── index.css              # Tailwind CSS styles & animations
│   │   └── main.tsx               # Entry point
│   ├── index.html                 # Single Page Application HTML
│   ├── package.json               # Frontend dependencies & scripts
│   ├── server.ts                  # Gateway Server (Node.js/Express)
│   ├── tailwind.config.js         # Cấu hình Tailwind CSS Dark/Red theme
│   ├── tsconfig.json              # TypeScript compiler configuration
│   └── vite.config.ts             # Vite build & plugin configuration
├── server/                        # Toàn bộ Backend (Java 17 Spring Boot 3)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/vti/jwt/  # Mã nguồn ứng dụng:
│   │   │   │   ├── config/        # Security, AsyncConfig, MongoConfig
│   │   │   │   ├── controller/    # REST API Controllers (Auth, Movie, Stream, CMS)
│   │   │   │   ├── dto/           # Request/Response models & validation
│   │   │   │   ├── exception/     # Global Exception Handling
│   │   │   │   ├── model/         # MongoDB Documents (User, Movie, EmailOtp)
│   │   │   │   ├── repository/    # Spring Data MongoDB Repositories
│   │   │   │   ├── security/      # JWT filter, UserDetailsService, AuthEntryPoint
│   │   │   │   └── service/       # Business logic (Transcode, Stream, Email, OTP)
│   │   │   └── resources/
│   │   │       ├── application.properties # Cấu hình MongoDB, Gmail SMTP, Upload
│   │   │       └── static/        # Static resources
│   │   └── test/                  # Test suites (JUnit 5, MockMvc, Suite Tests)
│   ├── uploads/                   # Thư mục lưu trữ Video & Chunks
│   │   ├── temp/                  # Chunks tạm thời khi đang tải lên
│   │   └── videos/                # Video đã ghép & transcode HLS
│   ├── mvnw / mvnw.cmd            # Maven Wrappers
│   └── pom.xml                    # Maven configuration (cinestreams-server)
├── .gitignore                     # Bỏ qua node_modules, target, logs, zip
├── docker-compose.yml             # Khởi chạy MongoDB 7.0 & Network
├── package.json                   # Monorepo Workspace configuration
└── README.md                      # Tài liệu tổng quan dự án
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy (Quick Start)

### 1. Yêu Cầu Môi Trường (Prerequisites)
* **Java:** JDK 17 trở lên.
* **Node.js:** v18 trở lên (khuyên dùng Node 20 LTS).
* **MongoDB:** Bản 6.0 hoặc 7.0 chạy tại `localhost:27017` (hoặc chạy qua Docker).
* **FFmpeg:** Cài đặt FFmpeg để phục vụ chuyển mã video HLS (`ffmpeg -version`).

---

### 2. Khởi chạy cơ sở dữ liệu MongoDB
Sử dụng Docker Compose để khởi chạy MongoDB nhanh chóng:
```bash
docker compose up -d mongodb
```
*(Hoặc khởi động service MongoDB có sẵn trên máy của bạn).*

---

### 3. Khởi chạy Backend (Spring Boot 3)
Di chuyển vào thư mục `server/` và chạy bằng Maven Wrapper:

**Trên Windows (PowerShell/CMD):**
```powershell
cd server
.\mvnw.cmd spring-boot:run
```

**Trên Linux / macOS:**
```bash
cd server
./mvnw spring-boot:run
```
> **Backend chạy tại:** `http://localhost:8088` (Database Seeder sẽ tự động tạo dữ liệu phim mẫu: Dune 2, House of the Dragon, Parasite, Interstellar,...).

---

### 4. Khởi chạy Frontend (React + Vite)
Mở một cửa sổ Terminal mới, di chuyển vào thư mục `client/`:

```bash
cd client
npm install
npm run dev
```

Hoặc đứng từ thư mục gốc Monorepo:
```bash
npm run dev
```
> **Truy cập ứng dụng:** Mở trình duyệt tại **[http://localhost:3000](http://localhost:3000)**.

---

## 🔑 Tài Khoản Thử Nghiệm Mẫu (Demo Credentials)

| Vai trò | Tên đăng nhập | Mật khẩu | Quyền hạn nổi bật |
|:---|:---|:---|:---|
| **Quản trị viên (CMS Admin)** | `admin` | `admin123` | Upload phim phân đoạn, chuyển mã FFmpeg, xuất bản phim ra trang chủ |
| **Thành viên VIP Cinema 4K** | `hadinhluc_pm` | `123456` | Xem luồng phát 1080p Full HD & 4K Dolby Atmos, Watch Party |
| **Đăng ký người dùng mới** | *Email bất kỳ* | *Mật khẩu tự chọn* | Xác thực mã OTP 6 chữ số gửi trực tiếp qua Gmail |

---

## 🛡️ Điểm Nhấn Kỹ Thuật (Engineering Highlights)

1. **Email OTP Bất Đồng Bộ (`@Async` ThreadPool):**
   * Tách riêng `mailTaskExecutor` với `ThreadPoolTaskExecutor` (5-20 threads, queue 100).
   * Giúp HTTP response trả về tức thì (< 50ms) không bị nghẽn bởi máy chủ SMTP.
   * Rate limiting 60s cooldown chống spam và tự hủy bản ghi sau 5 phút bằng **MongoDB TTL Index**.

2. **Chuyển Mã Video HLS & Quality Gate:**
   * Tự động phân đoạn video MP4 thành chuẩn HLS `.m3u8` và các file segment `.ts`.
   * Dynamic Master Playlist: Người dùng thông thường bị giới hạn tối đa 720p; nâng cấp VIP mở khóa luồng chất lượng cao 1080p/4K.

3. **Cổng Thanh Toán Tự Động VietQR:**
   * Sinh mã QR động chuẩn Napas 24/7 theo từng mã đơn hàng `CS CINE...` (MB Bank: `0345469878` - `HA DINH LUC`).
   * Trạng thái thanh toán kích hoạt tức thì.

---

## 📄 Bản Quyền & Giấy Phép (License)
Dự án được phát triển phục vụ mục đích học tập và làm đồ án tốt nghiệp chuyên ngành Fullstack Web Development. Mọi thắc mắc xin vui lòng liên hệ CineStreams Engineering Team.

