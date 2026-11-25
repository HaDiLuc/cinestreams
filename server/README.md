# Spring Boot 3 + Java 17 + MongoDB + JWT + Validation

Dự án mẫu Spring Boot sử dụng **Java 17**, tích hợp đầy đủ các thành phần:
- **Spring Web**: Xây dựng RESTful API.
- **Spring Data MongoDB**: Kết nối và thao tác với cơ sở dữ liệu MongoDB NoSQL.
- **Spring Boot Starter Validation (Jakarta Validation)**: Kiểm tra tính hợp lệ của dữ liệu đầu vào (`@NotBlank`, `@Email`, `@Size`, ...).
- **Spring Security + JJWT (0.12.6)**: Xác thực và phân quyền bằng JSON Web Token (Stateless).

---

## 💡 Vì Sao Lại Cần Cả AccessToken Và RefreshToken?

### 1. Vấn đề nan giải nếu chỉ dùng 1 Token
Nếu hệ thống chỉ sử dụng **duy nhất 1 JWT Token**, bạn sẽ gặp nghịch lý giữa **Bảo mật** và **Trải nghiệm người dùng (UX)**:
- **Nếu đặt thời hạn token dài (ví dụ: 30 ngày):**
  - **Ưu điểm:** Người dùng tiện lợi, không bị bắt đăng nhập lại liên tục.
  - **Nhược điểm (Rất nguy hiểm):** JWT bản chất là *Stateless* (Server không lưu DB). Nếu token bị lộ (qua tấn công XSS, nghe lén mạng Man-In-The-Middle, lộ ở LocalStorage), hacker có thể toàn quyền mạo danh người dùng trong suốt 30 ngày đó. Server **không có cách nào thu hồi (revoke/hủy)** token này sớm được, trừ khi đổi secret key toàn hệ thống (khiến tất cả người dùng khác bị văng ra).
- **Nếu đặt thời hạn token ngắn (ví dụ: 15 phút):**
  - **Ưu điểm:** An toàn cao, nếu hacker có trộm được thì sau 15 phút token cũng tự vô hiệu lực.
  - **Nhược điểm:** Trải nghiệm người dùng cực kỳ tệ vì cứ sau 15 phút họ lại bị văng ra màn hình đăng nhập và phải nhập lại username/mật khẩu.

---

### 2. Giải pháp: Mô hình kết hợp 2 Token

| Đặc tính | Access Token | Refresh Token |
| :--- | :--- | :--- |
| **Mục đích** | Dùng để truy cập tài nguyên API nghiệp vụ (`/api/test/user`,...) | Chỉ dùng duy nhất để xin cấp lại `accessToken` mới |
| **Thời hạn sống** | **Ngắn hạn** (15 phút) | **Dài hạn** (7 ngày - 30 ngày) |
| **Nơi lưu trữ phía Server**| **Không lưu DB** (Server chỉ verify bằng Secret Key trong RAM) | **Lưu trong Database (MongoDB)** |
| **Tần suất gửi qua mạng** | Rất thường xuyên (mỗi request API) | Rất ít (chỉ gửi khi `accessToken` hết hạn) |
| **Khả năng thu hồi (Revoke)**| Không thể hủy trước hạn | **Có thể hủy ngay lập tức** (xóa khỏi MongoDB) |

---

### 3. Những lợi ích vượt trội:
1. **Giảm thiểu tối đa rủi ro lộ Token**:
   - `accessToken` bay qua mạng liên tục ở mỗi request, nếu lỡ bị đánh cắp thì chỉ dùng được tối đa vài phút là tự hết hạn.
   - `refreshToken` có thời hạn dài nhưng tần suất bay qua mạng cực kỳ thấp (ví dụ: 15 phút mới gửi 1 lần tới endpoint `/api/auth/refreshtoken`), nên nguy cơ bị nghe lén giảm đi đáng kể.
2. **Hiệu năng (Performance) cao**:
   - Hầu hết các request chỉ cần kiểm tra `accessToken` bằng thuật toán mã hóa (không cần truy vấn Database), giảm tải tối đa cho MongoDB.
3. **Thực hiện được chức năng Đăng xuất (Logout) & Thu hồi quyền (Revoke)**:
   - Khi người dùng bấm **Đăng xuất (`/api/auth/logout`)** hoặc tài khoản bị khóa/đổi mật khẩu, Server chỉ cần **xóa `refreshToken` trong MongoDB**.
   - Khi đó, `accessToken` hiện tại sẽ hết hạn sau tối đa 15 phút và kẻ gian không thể dùng `refreshToken` để xin token mới được nữa. Người dùng bị ngắt kết nối an toàn!

---

## 1. Cấu Trúc Thư Mục Dự Án

```
├── pom.xml
├── mvnw / mvnw.cmd
├── .gitignore
├── README.md
└── src
    ├── main
    │   ├── java/com/vti/jwt
    │   │   ├── JwtMongoApplication.java           # Entry point
    │   │   ├── controller
    │   │   │   ├── AuthController.java            # /api/auth (login, register)
    │   │   │   └── TestController.java            # /api/test (public, user, mod, admin)
    │   │   ├── dto
    │   │   │   ├── request
    │   │   │   │   ├── LoginRequest.java          # Validation: @NotBlank
    │   │   │   │   └── SignupRequest.java         # Validation: @NotBlank, @Email, @Size
    │   │   │   └── response
    │   │   │       ├── JwtResponse.java
    │   │   │       └── MessageResponse.java
    │   │   ├── exception
    │   │   │   └── GlobalExceptionHandler.java    # Bắt lỗi validation trả về JSON chi tiết
    │   │   ├── model
    │   │   │   ├── ERole.java                     # ROLE_USER, ROLE_MODERATOR, ROLE_ADMIN
    │   │   │   └── User.java                      # MongoDB Document ("users")
    │   │   ├── repository
    │   │   │   └── UserRepository.java            # MongoRepository
    │   │   └── security
    │   │       ├── WebSecurityConfig.java         # Cấu hình SecurityFilterChain, CORS, Stateless
    │   │       ├── jwt
    │   │       │   ├── AuthEntryPointJwt.java     # Xử lý 401 Unauthorized
    │   │       │   ├── AuthTokenFilter.java       # Filter chặn request, check Bearer token
    │   │       │   └── JwtUtils.java              # Tạo và giải mã JWT token
    │   │       └── services
    │   │           ├── UserDetailsImpl.java       # Implement UserDetails
    │   │           └── UserDetailsServiceImpl.java# Load user từ MongoDB
    │   └── resources
    │       └── application.properties             # Cấu hình MongoDB & JWT secret
    └── test
        └── java/com/vti/jwt/JwtMongoApplicationTests.java
```

---

## 2. Cấu hình `application.properties`

File: `src/main/resources/application.properties`

```properties
server.port=8080

# Cấu hình kết nối MongoDB
spring.data.mongodb.uri=mongodb://localhost:27017/jwt_demo_db

# Cấu hình JWT
app.jwt.secret=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
app.jwt.expiration-ms=86400000
```

> **Gợi ý chạy MongoDB nhanh bằng Docker:**
> ```bash
> docker run -d --name mongodb -p 27017:27017 mongo:latest
> ```

---

## 3. Khởi Chạy Dự Án

Sử dụng Maven Wrapper hoặc Maven đã cài đặt:

```bash
# Sử dụng Maven Wrapper
./mvnw spring-boot:run

# Hoặc sử dụng Maven hệ thống
mvn spring-boot:run
```

---

## 4. Danh Sách API & Cách Test (Postman / cURL)

### 4.1. Đăng ký tài khoản (`POST /api/auth/register`)
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "dongvti",
  "email": "dongvti@example.com",
  "password": "password123",
  "roles": ["user"]
}
```

- **Ví dụ cURL**:
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dongvti",
    "email": "dongvti@example.com",
    "password": "password123",
    "roles": ["user"]
  }'
```

### 4.2. Đăng nhập lấy Token (`POST /api/auth/login`)
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "username": "dongvti",
  "password": "password123"
}
```

- **Response chuẩn `ResponseModel` (Trả về cả accessToken ngắn hạn & refreshToken dài hạn)**:
```json
{
  "success": 1,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "88a1b559-67d7-4ee4-90a4-3949cefd4ba2",
    "tokenType": "Bearer",
    "id": "67027d...",
    "username": "dongvti",
    "email": "dongvti@example.com",
    "roles": ["ROLE_USER"]
  },
  "message": "Đăng nhập thành công!"
}
```

### 4.3. Làm mới Access Token bằng Refresh Token (`POST /api/auth/refreshtoken`)
Khi accessToken ngắn hạn hết hạn (15 phút), client gửi refreshToken dài hạn lên để lấy accessToken mới mà không cần bắt user nhập lại mật khẩu:
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "refreshToken": "88a1b559-67d7-4ee4-90a4-3949cefd4ba2"
}
```

- **Response**:
```json
{
  "success": 1,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...NEW_ACCESS_TOKEN...",
    "refreshToken": "88a1b559-67d7-4ee4-90a4-3949cefd4ba2",
    "tokenType": "Bearer"
  },
  "message": "Làm mới Access Token thành công!"
}
```

### 4.4. Test API Public (Không cần token)
```bash
curl http://localhost:8080/api/test/public
```

### 4.5. Test API cần quyền User (`GET /api/test/user`)
Thêm header `Authorization: Bearer <accessToken>`:
```bash
curl http://localhost:8080/api/test/user \
  -H "Authorization: Bearer <ACCESS_TOKEN_NHẬN_ĐƯỢC>"
```

### 4.6. Đăng xuất (`POST /api/auth/logout`)
Xóa refreshToken khỏi MongoDB:
```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 4.7. Test Validation (Kiểm tra bắt lỗi - Thất bại: success = 0)
Thử gửi request đăng ký thiếu trường hoặc sai định dạng email:
```json
{
  "username": "",
  "email": "invalid-email",
  "password": "123"
}
```
Server sẽ trả về mã `400 Bad Request` dạng `ResponseModel`:
```json
{
  "success": 0,
  "data": {
    "username": "Username cannot be blank",
    "email": "Email must be valid format",
    "password": "Password must be between 6 and 40 characters"
  },
  "message": "Dữ liệu không hợp lệ"
}
```
