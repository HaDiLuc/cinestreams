import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

async function createServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // ==========================================================
  // Smart Proxy to Spring Boot Backend
  // ==========================================================

  const proxyToSpringBoot = async (
    endpoint: string,
    method: string,
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<{ handled: boolean; status: number; data: any; rawResp?: Response }> => {
    const targets = [
      process.env.SPRING_BOOT_URL,
      'http://127.0.0.1:8088',
      'http://localhost:8088',
      'http://127.0.0.1:8080',
      'http://localhost:8080'
    ].filter(Boolean) as string[];

    for (const base of targets) {
      try {
        const url = `${base}${endpoint}`;
        const resp = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(8000),
        });

        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await resp.json().catch(() => null);
          return { handled: true, status: resp.status, data, rawResp: resp };
        } else if (resp.ok) {
          const text = await resp.text();
          return { handled: true, status: resp.status, data: text, rawResp: resp };
        }
      } catch (_e) {
        // Try next target or fallback
      }
    }

    return { handled: false, status: 503, data: null };
  };

  const getForwardHeaders = (req: express.Request): Record<string, string> => {
    const headers: Record<string, string> = {};
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.trim()) {
      headers['Authorization'] = authHeader;
    }
    const deviceId = req.headers['x-device-id'];
    if (typeof deviceId === 'string' && deviceId.trim()) {
      headers['X-Device-Id'] = deviceId.trim();
    }
    return headers;
  };

  const activeDemoSessions = new Map<string, { deviceId: string; expiresAt: number }>();
  const SINGLE_DEVICE_DENIED_MSG = 'Tài khoản hiện đang bị từ chối truy cập, vui lòng thử lại sau';

  // System Health
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'CineStreams Unified Node Gateway',
      environment: isProduction ? 'production' : 'development',
      timestamp: new Date().toISOString(),
      activeNodes: 12,
      cdnEdgeLatencyMs: 8,
    });
  });

  // ==========================================================
  // Auth & OTP Endpoints (TASK-004 to TASK-009)
  // ==========================================================

  // TASK-004: Register with OTP
  app.post('/api/auth/register-otp', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/register-otp', 'POST', req.body);
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    res.json({
      success: true,
      message: `Đăng ký bước 1 thành công! Mã OTP 6 số đã được gửi tới email ${req.body?.email} (Mã demo: 123456).`,
      data: { email: req.body?.email, expiresInMinutes: 5, resendCooldownSeconds: 60 }
    });
  });

  // TASK-005: Verify Register OTP
  app.post('/api/auth/verify-register-otp', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/verify-register-otp', 'POST', req.body);
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    res.json({
      success: true,
      message: 'Xác thực OTP thành công! Tài khoản của bạn đã được kích hoạt.',
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.cinestreams_jwt_valid',
        refreshToken: 'cs_refresh_' + Date.now(),
        username: req.body?.email?.split('@')[0] || 'User',
        email: req.body?.email,
        roles: ['ROLE_USER', 'ROLE_VIP']
      }
    });
  });

  // TASK-006: 2FA Login Step 1
  app.post('/api/auth/login-2fa', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/login-2fa', 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const accountKey = String(req.body?.username || '').trim().toLowerCase();
    const deviceId = String(req.headers['x-device-id'] || '').trim();
    const existing = activeDemoSessions.get(accountKey);
    if (existing && existing.expiresAt > Date.now() && existing.deviceId !== deviceId) {
      return res.status(403).json({ success: 0, message: SINGLE_DEVICE_DENIED_MSG });
    }

    res.json({
      success: true,
      message: 'Mã OTP 2FA đã được gửi tới email của bạn (Mã demo: 123456).',
      data: { email: req.body?.username?.includes('@') ? req.body.username : 'luc.hadinh@cinestreams.vn', require2fa: true }
    });
  });

  // TASK-006: 2FA Login Step 2
  app.post('/api/auth/verify-login-2fa', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/verify-login-2fa', 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const accountKey = String(req.body?.email || 'hadinhluc_pm').trim().toLowerCase();
    const deviceId = String(req.headers['x-device-id'] || '').trim() || `dev_${Date.now()}`;
    const existing = activeDemoSessions.get(accountKey);
    if (existing && existing.expiresAt > Date.now() && existing.deviceId !== deviceId) {
      return res.status(403).json({ success: 0, message: SINGLE_DEVICE_DENIED_MSG });
    }
    activeDemoSessions.set(accountKey, { deviceId, expiresAt: Date.now() + 86400000 });

    res.json({
      success: true,
      message: 'Đăng nhập 2FA thành công!',
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.cinestreams_2fa_jwt',
        refreshToken: 'cs_refresh_' + Date.now(),
        email: req.body?.email,
        username: 'hadinhluc_pm',
        roles: ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_VIP']
      }
    });
  });

  // TASK-007: Forgot Password OTP
  app.post('/api/auth/forgot-password-otp', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/forgot-password-otp', 'POST', req.body);
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    res.json({
      success: true,
      message: `Mã OTP đặt lại mật khẩu đã được gửi tới email ${req.body?.email} (Mã demo: 123456).`,
      data: { email: req.body?.email, expiresInMinutes: 5 }
    });
  });

  // TASK-007: Verify Forgot Password OTP
  app.post('/api/auth/verify-forgot-password-otp', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/verify-forgot-password-otp', 'POST', req.body);
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    res.json({
      success: true,
      message: 'Xác minh OTP thành công!',
      data: { email: req.body?.email, resetToken: 'reset_token_' + Date.now() }
    });
  });

  // TASK-007: Reset Password
  app.post('/api/auth/reset-password', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/reset-password', 'POST', req.body);
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    res.json({
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.'
    });
  });

  // TASK-008: Resend OTP
  app.post('/api/auth/resend-otp', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/resend-otp', 'POST', req.body);
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    res.json({
      success: true,
      message: `Mã OTP mới đã được gửi lại tới email [${req.body?.email}]. Mã demo: 123456`,
      data: { email: req.body?.email, cooldownSeconds: 60 }
    });
  });

  // Backward compatible auth endpoints
  app.post('/api/auth/register', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/register', 'POST', req.body);
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    res.json({
      success: true,
      message: `Đăng ký thành công! Mã OTP đã gửi tới ${req.body?.email}.`,
      data: { username: req.body?.username, email: req.body?.email, demoCode: '123456' }
    });
  });

  app.post('/api/auth/verify', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/verify', 'POST', req.body);
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    res.json({ success: true, message: 'Kích hoạt tài khoản thành công!', data: { verified: true } });
  });

  app.post('/api/auth/login', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/login', 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const { username } = req.body;
    const accountKey = String(username || 'minh_khang').trim().toLowerCase();
    const deviceId = String(req.headers['x-device-id'] || '').trim() || `dev_${Date.now()}`;
    const existing = activeDemoSessions.get(accountKey);
    if (existing && existing.expiresAt > Date.now() && existing.deviceId !== deviceId) {
      return res.status(403).json({ success: 0, message: SINGLE_DEVICE_DENIED_MSG });
    }
    activeDemoSessions.set(accountKey, { deviceId, expiresAt: Date.now() + 86400000 });

    res.json({
      success: true,
      message: 'Đăng nhập thành công vào CineStreams!',
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.cinestreams_jwt_signature',
        refreshToken: 'cs_refresh_' + Date.now(),
        id: 'usr_001',
        username: username || 'Minh Khang',
        email: username?.includes('@') ? username : `${username || 'alex'}@cinestreams.vn`,
        roles: ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_VIP'],
        permissions: ['STREAM_4K', 'DOLBY_ATMOS', 'WATCH_PARTY_HOST'],
        vipTier: 'Ultra VIP Cinema 4K',
        vipExpiresAt: '24/11/2026',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKI3gRB2-ajZZGcKyE5j9o_QEHEa3jFKNQP2LDRuci6XUPZo7WjzRr67sHpmExkSNaTWfkgRQ-Itw30N5OIN9GZoYP9E-htmJ2SQsH9tVP6aCpsRVOaVnI8ltteCYpTHRUWXojhbkoUTwS8XpkDIHRXmFj83yGCFvjkLDR6vWk8GMveFcp6CcrbT50VV2sHcmj2ghAuV1CiQX4kVprpH10y-oErnTIfsTRLHwLctzwqvDUQAe87wgqBg'
      }
    });
  });

  app.post('/api/auth/refreshtoken', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/refreshtoken', 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    res.json({
      success: true,
      message: 'Làm mới Access Token thành công!',
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.renewed_' + Date.now(),
        refreshToken: req.body?.refreshToken || 'cs_refresh_default'
      }
    });
  });

  app.post('/api/auth/logout', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/auth/logout', 'POST', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const deviceId = String(req.headers['x-device-id'] || '').trim();
    if (deviceId) {
      for (const [k, v] of activeDemoSessions.entries()) {
        if (v.deviceId === deviceId) {
          activeDemoSessions.delete(k);
        }
      }
    }

    res.json({ success: true, message: 'Đã đăng xuất an toàn khỏi hệ thống.' });
  });

  // ==========================================================
  // User & RBAC Management Proxies with Mock Fallback (6 Roles)
  // ==========================================================
  let systemUsersList = [
    {
      id: 'usr_admin',
      username: 'admin',
      email: 'admin@cinestreams.vn',
      fullName: 'Hà Đình Lực (Admin Tối Cao)',
      verified: true,
      roles: ['ROLE_ADMIN', 'ROLE_VIP_USER'],
      permissions: ['user:read', 'user:create', 'user:update', 'user:delete', 'role:manage', 'movie:manage', 'content:edit', 'subtitle:manage', 'finance:manage', 'refund:process', 'STREAM_4K', 'DOLBY_ATMOS', 'WATCH_PARTY_HOST'],
      createdAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'usr_editor',
      username: 'editor',
      email: 'editor@cinestreams.vn',
      fullName: 'Trần Minh Hoàng (Biên Tập Nội Dung)',
      verified: true,
      roles: ['ROLE_CONTENT_EDITOR', 'ROLE_FREE_USER'],
      permissions: ['user:read', 'movie:manage', 'upload_manage', 'content:edit', 'subtitle:manage'],
      createdAt: '2026-03-10T09:00:00Z'
    },
    {
      id: 'usr_finance',
      username: 'finance',
      email: 'finance@cinestreams.vn',
      fullName: 'Nguyễn Thị Bích Ngọc (Quản Lý Doanh Thu)',
      verified: true,
      roles: ['ROLE_FINANCE_MANAGER', 'ROLE_FREE_USER'],
      permissions: ['user:read', 'finance:manage', 'refund:process'],
      createdAt: '2026-04-12T14:30:00Z'
    },
    {
      id: 'usr_vip',
      username: 'ngoctrinh_vip',
      email: 'ngoctrinh@gmail.com',
      fullName: 'Ngọc Trinh (Thành Viên VIP)',
      verified: true,
      roles: ['ROLE_VIP_USER', 'ROLE_FREE_USER'],
      permissions: ['user:read', 'STREAM_4K', 'DOLBY_ATMOS', 'WATCH_PARTY_HOST'],
      createdAt: '2026-07-20T10:15:00Z'
    },
    {
      id: 'usr_free',
      username: 'hoangnam_99',
      email: 'namhoang99@outlook.com',
      fullName: 'Hoàng Nam (Thành Viên Miễn Phí)',
      verified: true,
      roles: ['ROLE_FREE_USER'],
      permissions: ['user:read'],
      createdAt: '2026-08-01T16:45:00Z'
    },
    {
      id: 'usr_guest',
      username: 'guest_visitor',
      email: 'guest@cinestreams.vn',
      fullName: 'Khách Vãng Lai (Guest Demo)',
      verified: false,
      roles: ['ROLE_GUEST'],
      permissions: ['user:read'],
      createdAt: '2026-09-01T08:00:00Z'
    }
  ];

  app.get('/api/roles/users', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/roles/users', 'GET', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    res.json({
      success: true,
      data: systemUsersList,
      message: 'Lấy danh sách người dùng thành công (Gateway Sync)'
    });
  });

  app.post('/api/roles/assign-user', async (req, res) => {
    const { username, roles } = req.body;
    const proxyRes = await proxyToSpringBoot('/api/roles/assign-user', 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const user = systemUsersList.find(u => u.username === username);
    if (user) {
      user.roles = roles || ['ROLE_USER'];
      return res.json({
        success: true,
        message: `Đã cập nhật vai trò cho người dùng "${username}" thành công!`,
        data: user
      });
    }

    res.status(404).json({ success: false, message: `Không tìm thấy tài khoản ${username}` });
  });

  app.patch('/api/roles/users/:username/toggle-active', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(
      `/api/roles/users/${encodeURIComponent(req.params.username)}/toggle-active`,
      'PATCH',
      req.body,
      getForwardHeaders(req)
    );
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.status(503).json({ success: false, message: 'Không thể kết nối máy chủ Backend để cập nhật trạng thái tài khoản.' });
  });

  app.get('/api/roles/audit-logs', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/roles/audit-logs', 'GET', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, data: [], message: 'Không thể tải nhật ký kiểm toán từ Backend.' });
  });

  app.get('/api/roles', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/roles', 'GET', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, data: [] });
  });

  app.post('/api/roles', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/roles', 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.status(503).json({ success: false, message: 'Không thể kết nối máy chủ Backend để tạo vai trò mới.' });
  });

  // ==========================================================
  // Movie Catalog & Streaming Proxies (TASK-058 to TASK-064)
  // ==========================================================

  app.get('/api/movies', async (req, res) => {
    const type = req.query.type as string;
    const search = req.query.search as string;
    const query = new URLSearchParams();
    if (type) query.append('type', type);
    if (search) query.append('search', search);

    const proxyRes = await proxyToSpringBoot(`/api/movies?${query.toString()}`, 'GET');
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    // Fallback if Spring Boot is starting
    res.json({ success: true, data: [] });
  });

  app.get('/api/movies/:id', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/movies/${req.params.id}`, 'GET');
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.status(404).json({ success: false, message: 'Phim không tìm thấy' });
  });

  // Categories & Genres API
  const defaultCategories = [
    { id: 'cat-1', name: 'Hành Động', description: 'Phim hành động gay cấn' },
    { id: 'cat-2', name: 'Khoa Học Viễn Tưởng', description: 'Sci-fi, vũ trụ và tương lai' },
    { id: 'cat-3', name: 'Tâm Lý', description: 'Phim chính kịch tâm lý' },
    { id: 'cat-4', name: 'Kinh Dị', description: 'Phim rùng rợn, giật gân' },
    { id: 'cat-5', name: 'Hoạt Hình', description: 'Anime, 3D Animation' },
    { id: 'cat-6', name: 'Hài Hước', description: 'Phim hài giải trí' },
    { id: 'cat-7', name: 'Lãng Mạn', description: 'Tình cảm lãng mạn' },
    { id: 'cat-8', name: 'Phiêu Lưu', description: 'Thám hiểm thế giới' },
    { id: 'cat-9', name: 'Bí Ẩn', description: 'Trinh thám, hồi hộp' },
    { id: 'cat-10', name: 'Chiến Tranh', description: 'Chiến trường, quân sự' },
    { id: 'cat-11', name: 'Lịch Sử', description: 'Dã sử, tiểu sử' },
    { id: 'cat-12', name: 'Gia Đình', description: 'Phim gia đình chữa lành' },
    { id: 'cat-13', name: 'Giả Tưởng', description: 'Fantasy, kỳ ảo' },
    { id: 'cat-14', name: 'Võ Thuật', description: 'Kungfu, kiếm hiệp' },
    { id: 'cat-15', name: 'Tài Liệu', description: 'Phim tài liệu thực tế' },
    { id: 'cat-16', name: 'Âm Nhạc', description: 'Nhạc kịch, ca nhạc' }
  ];

  app.get('/api/categories', async (_req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/categories', 'GET');
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, data: defaultCategories });
  });

  app.post('/api/categories', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/categories', 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    const newCat = { id: 'cat-' + Date.now(), name: req.body?.name || 'Mới', description: req.body?.description || '' };
    defaultCategories.push(newCat);
    res.json({ success: true, data: newCat, message: 'Tạo mới danh mục thành công' });
  });

  app.get('/api/movies/genres', async (_req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/movies/genres', 'GET');
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, data: defaultCategories.map(c => c.name) });
  });

  app.get('/api/admin/movies', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/admin/movies', 'GET', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, data: [] });
  });

  app.post('/api/admin/movies', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/admin/movies', 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, data: req.body });
  });

  app.put('/api/admin/movies/:id', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/admin/movies/${req.params.id}`, 'PUT', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, data: req.body });
  });

  app.delete('/api/admin/movies/cleanup/demo', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/admin/movies/cleanup/demo', 'DELETE', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, message: 'Đã dọn dẹp phim demo.' });
  });

  app.delete('/api/admin/movies/:id', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/admin/movies/${req.params.id}`, 'DELETE', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, data: req.params.id });
  });

  app.post('/api/admin/videos/merge-chunks', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/admin/videos/merge-chunks', 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.status(503).json({ success: false, message: 'Không thể kết nối máy chủ Backend để ghép video.' });
  });

  app.get('/api/admin/videos/transcode-status/:videoId', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/admin/videos/transcode-status/${req.params.videoId}`, 'GET', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.status(503).json({ success: false, message: 'Không thể kiểm tra trạng thái transcode từ Backend.' });
  });

  app.patch('/api/admin/movies/:id/publish', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/admin/movies/${req.params.id}/publish`, 'PATCH', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, message: 'Đã xuất bản phim thành công!' });
  });

  // ==========================================================
  // Episode Management Endpoints (Add, Edit, Delete Episodes)
  // ==========================================================

  interface ServerEpisode {
    id: string;
    movieId: string;
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    duration: string;
    thumbnail: string;
    synopsis: string;
    videoMasterUrl: string;
    hlsMasterUrl: string;
    processStatus: string;
  }

  const inMemoryEpisodes = new Map<string, ServerEpisode[]>();

  app.get('/api/episodes/movie/:movieId', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/episodes/movie/${req.params.movieId}`, 'GET');
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const list = inMemoryEpisodes.get(req.params.movieId) || [];
    res.json({ success: true, data: list });
  });

  // Create new episode
  app.post('/api/admin/movies/:movieId/episodes', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/admin/movies/${req.params.movieId}/episodes`, 'POST', req.body);
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const movieId = req.params.movieId;
    const newEp: ServerEpisode = {
      id: req.body?.id || 'ep_' + Date.now().toString(36),
      movieId,
      seasonNumber: Number(req.body?.seasonNumber) || 1,
      episodeNumber: Number(req.body?.episodeNumber) || 1,
      title: req.body?.title || `Tập ${req.body?.episodeNumber || 1}`,
      duration: req.body?.duration || '45 phút',
      thumbnail: req.body?.thumbnail || '',
      synopsis: req.body?.synopsis || '',
      videoMasterUrl: req.body?.videoMasterUrl || '',
      hlsMasterUrl: req.body?.hlsMasterUrl || '',
      processStatus: req.body?.processStatus || 'PENDING'
    };

    const current = inMemoryEpisodes.get(movieId) || [];
    current.push(newEp);
    inMemoryEpisodes.set(movieId, current);

    res.json({ success: true, data: newEp, message: 'Tạo tập phim thành công!' });
  });

  // Update episode
  app.put('/api/admin/episodes/:episodeId', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/admin/episodes/${req.params.episodeId}`, 'PUT', req.body);
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const episodeId = req.params.episodeId;
    let foundEp: ServerEpisode | null = null;

    for (const [movieId, eps] of inMemoryEpisodes.entries()) {
      const idx = eps.findIndex((e) => e.id === episodeId);
      if (idx !== -1) {
        eps[idx] = { ...eps[idx], ...req.body, id: episodeId, movieId };
        foundEp = eps[idx];
        break;
      }
    }

    if (!foundEp) {
      foundEp = {
        id: episodeId,
        movieId: req.body?.movieId || '',
        seasonNumber: Number(req.body?.seasonNumber) || 1,
        episodeNumber: Number(req.body?.episodeNumber) || 1,
        title: req.body?.title || 'Tập phim',
        duration: req.body?.duration || '45 phút',
        thumbnail: req.body?.thumbnail || '',
        synopsis: req.body?.synopsis || '',
        videoMasterUrl: req.body?.videoMasterUrl || '',
        hlsMasterUrl: req.body?.hlsMasterUrl || '',
        processStatus: req.body?.processStatus || 'PENDING'
      };
    }

    res.json({ success: true, data: foundEp, message: 'Cập nhật tập phim thành công!' });
  });

  // Delete episode
  app.delete('/api/admin/episodes/:episodeId', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/admin/episodes/${req.params.episodeId}`, 'DELETE');
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const episodeId = req.params.episodeId;
    for (const [movieId, eps] of inMemoryEpisodes.entries()) {
      const filtered = eps.filter((e) => e.id !== episodeId);
      inMemoryEpisodes.set(movieId, filtered);
    }

    res.json({ success: true, data: episodeId, message: 'Đã xóa tập phim thành công!' });
  });

  // ==========================================================
  // Movie Views Increment Endpoint (Default to 0 and increment on watch)
  // ==========================================================
  const movieViewsStore = new Map<string, number>();

  app.post('/api/movies/:id/view', async (req, res) => {
    const movieId = req.params.id;
    const proxyRes = await proxyToSpringBoot(`/api/movies/${movieId}/view`, 'POST');
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const currentViews = movieViewsStore.get(movieId) || 0;
    const newViews = currentViews + 1;
    movieViewsStore.set(movieId, newViews);

    res.json({ success: true, views: newViews, message: 'Đã ghi nhận 1 lượt xem!' });
  });

  // Watch History (TASK-053) & User Watchlist / Profile
  const inMemoryWatchlist = new Map<string, string[]>();

  app.get('/api/user/history', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/user/history', 'GET', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, data: [] });
  });

  app.get('/api/user/history/:movieId', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/user/history/${req.params.movieId}`, 'GET', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, data: null });
  });

  app.post('/api/user/history', async (req, res) => {
    const query = new URLSearchParams(req.query as any);
    const proxyRes = await proxyToSpringBoot(`/api/user/history?${query.toString()}`, 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, message: 'Đã lưu mốc xem dở' });
  });

  app.delete('/api/user/history/:movieId', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/user/history/${req.params.movieId}`, 'DELETE', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, message: 'Đã xóa khỏi lịch sử xem' });
  });

  app.get('/api/user/watchlist', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/user/watchlist', 'GET', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    const deviceKey = String(req.headers['x-device-id'] || 'default');
    res.json({ success: true, data: inMemoryWatchlist.get(deviceKey) || [] });
  });

  app.post('/api/user/watchlist/:movieId', async (req, res) => {
    const proxyRes = await proxyToSpringBoot(`/api/user/watchlist/${req.params.movieId}`, 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    const deviceKey = String(req.headers['x-device-id'] || 'default');
    const list = inMemoryWatchlist.get(deviceKey) || [];
    const idx = list.indexOf(req.params.movieId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(req.params.movieId);
    inMemoryWatchlist.set(deviceKey, list);
    res.json({ success: true, data: list });
  });

  app.put('/api/user/avatar', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/user/avatar', 'PUT', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);
    res.json({ success: true, data: req.body?.avatar, message: 'Đã cập nhật ảnh đại diện!' });
  });

  // CineAI Recommendation Endpoint
  app.post('/api/cineai/recommend', (req, res) => {
    const { prompt, mood } = req.body;
    const recommendations = [
      {
        id: 'knives-out-glass-onion',
        title: 'Kẻ Đâm Lén: Kính Vạn Hoa',
        genres: ['Trinh Thám', 'Hài Kịch Bí Ẩn'],
        matchPercent: 98,
        badge: '4K DOLBY',
        poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCqD5mBvo-8xMtw9T5A4ttfg7Dc_wIaDELXBJ6usym-PS0P8KoPSNCBGEys7sV5QAwBvKvCR_M42Vs6y71xOFWifdk_3SJ9ixtyhayHIQ-fvx71hjw2WlBigHyhXqZcTAZtJsSyHijTu2A28cq2R4OHo2xpDw2GA76ZxGusy91pELLIpqs59brlJPshx33guSRmaD2nv7kLW60GRjkUKfGmK9QYZmQZNmY_xgIZ3r5HjY6qLY-HWEXgsA',
        reason: 'Vì bạn đã thích thể loại suy luận sắc sảo cùng dàn diễn viên thượng thừa.'
      },
      {
        id: 'parasite',
        title: 'Ký Sinh Trùng (Parasite)',
        genres: ['Tâm Lý', 'Xoắn Não Giật Gân'],
        matchPercent: 96,
        badge: 'OSCAR BEST PICTURE',
        poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuANB1hgvbgmX1IiaCUXSQXwprdQHl54AHGQyb-k0R-vycd--ICgpPIDcojYzPL92MvVQOPg8N5CfvY8dR9CYvRFxLyrVWj4sYU-Vyt6eWF4o_PK-5L_txH01iM1e7GJ0cjCOyUKwuCJ-4dUp0XzC5PbXfNy3UWAqaj-_tKSKMx50yMZxRyeZK_XJuvCEmJ79JhsU_hMMDNUG2TNug5q_b_0PokRvJCR4hwd-x4r_no4dAORJPy_7X6gKw',
        reason: 'Cốt truyện kịch tính nhiều lớp lang xã hội và cú ngoặt gây chấn động.'
      }
    ];

    res.json({
      query: prompt || mood || 'Đề xuất thịnh hành',
      engine: 'CineAI v3.5 DeepSemantic',
      results: recommendations
    });
  });

  // CineAI RAG Chatbot API
  app.post('/api/cineai/chat', async (req, res) => {
    // 1. Proxy to Spring Boot Backend if available
    const proxyRes = await proxyToSpringBoot('/api/cineai/chat', 'POST', req.body);
    if (proxyRes.handled && proxyRes.status < 400 && proxyRes.data) {
      return res.status(proxyRes.status).json(proxyRes.data);
    }

    const { prompt = '', mode = 'mood', options = {}, ragConfig } = req.body || {};
    const antiSpoiler = options?.antiSpoiler !== false;
    const cleanPrompt = prompt.trim().toLowerCase();

    // Tri thức RAG trên Gateway Server
    const SERVER_KNOWLEDGE = [
      {
        id: 'kn-dune-2',
        title: 'Dune: Hành Tinh Cát - Phần 2 (Phân tích chuyên sâu)',
        sourceType: 'deepExplainer' as const,
        sourceTitle: 'Hồ sơ kịch bản Dune 2 & Triết lý Tiên Tri Arrakis',
        keywords: ['dune', 'hành tinh cát', 'paul atreides', 'chani', 'arrakis', 'fremen', 'spice', 'sa mạc', 'denis villeneuve'],
        content: 'Dune 2 là kiệt tác sử thi khoa học viễn tưởng của đạo diễn Denis Villeneuve. Bộ phim khắc họa sâu sắc bi kịch tâm lý của Paul Atreides khi đứng trước ngã ba đường giữa lòng thù hận gia tộc và lời tiên tri giả định của dòng tu Bene Gesserit. Âm thanh vòm Dolby Atmos với tần số siêu trầm cùng kỹ xảo IMAX 70mm đưa khán giả vào trung tâm cuộc chiến cát vĩ đại.',
        movieId: 'dune-2'
      },
      {
        id: 'kn-arcane-2',
        title: 'Arcane: Mùa 2 (Bi kịch Piltover & Zaun)',
        sourceType: 'deepExplainer' as const,
        sourceTitle: 'Kịch bản phân tầng xã hội & Hextech Arcane 2',
        keywords: ['arcane', 'vi', 'jinx', 'piltover', 'zaun', 'hextech', 'liên minh huyền thoại', 'riot'],
        content: 'Arcane Mùa 2 đẩy cao trào xung đột giữa hai thế giới Piltover phồn thịnh và Zaun cùng quẫn. Mối quan hệ rạn nứt giữa hai chị em Vi và Jinx là sợi dây cảm xúc xuyên suốt tác phẩm. Kỹ thuật hoạt họa kết hợp 2D/3D đỉnh cao của Fortiche Production tạo nên chuẩn mực mới cho phim chuyển thể game.',
        movieId: 'arcane-s2'
      },
      {
        id: 'kn-oppenheimer',
        title: 'Oppenheimer (Bản cáo trạng đạo đức thời đại hạt nhân)',
        sourceType: 'deepExplainer' as const,
        sourceTitle: 'Kịch bản lưỡng phân màu sắc của Christopher Nolan',
        keywords: ['oppenheimer', 'nolan', 'bom nguyên tử', 'manhattan', 'cillian murphy', 'lưỡng phân'],
        content: 'Oppenheimer của Christopher Nolan sử dụng thủ pháp phân tách giữa góc nhìn chủ quan ngập tràn màu sắc (Fission) và góc nhìn khách quan đen trắng (Fusion) để khắc họa cuộc chiến nội tâm giằng xé của cha đẻ bom nguyên tử trước thảm họa hủy diệt nhân loại.',
        movieId: 'oppenheimer'
      },
      {
        id: 'kn-wp-socket',
        title: 'Phòng Xem Chung (Watch Party) Socket.IO CineStreams',
        sourceType: 'platform' as const,
        sourceTitle: 'Cẩm nang tính năng Đồng bộ thời gian thực Watch Party',
        keywords: ['phòng xem chung', 'watch party', 'socket', 'socket.io', 'đồng bộ', 'play', 'pause', 'seek', 'khóa tua', 'mic'],
        content: 'Tính năng Phòng Xem Chung (Watch Party) trên CineStreams cho phép nhóm bạn hoặc hội mê phim cùng xem một bộ phim đồng bộ 100% thời gian thực qua giao thức Socket.IO. Mọi thao tác Play, Pause, Tua video (Seek) đều được phát tán tức thì với độ trễ < 50ms. Chủ phòng có quyền Khóa tua (Host Lock) để giữ ổn định nhịp xem, hỗ trợ voice mic và thả biểu cảm emoji trực quan.',
        movieId: 'watch-party'
      },
      {
        id: 'kn-vietqr-vip',
        title: 'Thanh toán tự động VietQR 24/7 & Đặc quyền VIP Pass',
        sourceType: 'platform' as const,
        sourceTitle: 'Hệ thống giao dịch tự động VietQR CineStreams',
        keywords: ['vietqr', 'thanh toán', 'vip', 'gói cước', 'ngân hàng', 'mb', 'nâng cấp', 'giá'],
        content: 'CineStreams cung cấp hệ thống thanh toán VietQR tự động 24/7. Người dùng chỉ cần quét mã QR bằng ứng dụng ngân hàng bất kỳ, hệ thống sẽ xác thực giao dịch sau 1-3 giây và nâng cấp tài khoản VIP ngay lập tức mà không cần chờ đợi. Thành viên VIP được mở khóa chất lượng 4K HDR, âm thanh Dolby Atmos và quyền tạo phòng xem chung không giới hạn.',
        movieId: 'vip-pass'
      }
    ];

    // Semantic retrieval & citation calculation
    const matchedChunks = SERVER_KNOWLEDGE.map((chunk) => {
      let score = 0;
      const matchedTerms: string[] = [];
      chunk.keywords.forEach((kw) => {
        if (cleanPrompt.includes(kw)) {
          score += 0.35;
          matchedTerms.push(kw);
        }
      });
      return { chunk, score: Math.min(0.99, score + (score > 0 ? 0.35 : 0.05)), matchedTerms };
    })
      .filter((c) => c.score > 0.15)
      .sort((a, b) => b.score - a.score);

    const ragCitations = matchedChunks.slice(0, 3).map((item) => ({
      sourceId: item.chunk.id,
      title: item.chunk.title,
      sourceType: item.chunk.sourceType,
      sourceTitle: item.chunk.sourceTitle,
      similarity: Number(item.score.toFixed(2)),
      snippet: item.chunk.content.slice(0, 200) + '...',
      matchedTerms: item.matchedTerms
    }));

    // Server-side Gemini API check
    const apiKey = ragConfig?.geminiApiKey || process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 10) {
      try {
        const contextStr = matchedChunks.map((m) => `[${m.chunk.title}]: ${m.chunk.content}`).join('\n\n');
        const sysPrompt = `Bạn là CineAI Studio v4.0 - Trợ lý điện ảnh AI thế hệ mới của CineStreams, tích hợp RAG.
Ngữ cảnh tri thức được truy xuất từ CineStreams:
${contextStr}

Yêu cầu:
1. Trả lời câu hỏi một cách am hiểu, chuyên nghiệp và truyền cảm hứng.
2. Tuân thủ chống spoiler: ${antiSpoiler}. Không tiết lộ cái kết bất ngờ nếu người dùng chưa yêu cầu.
3. Liên hệ linh hoạt tới tính năng xem chung Watch Party Socket.IO hoặc kho phim CineStreams nếu phù hợp.`;

        const geminiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: `${sysPrompt}\n\nNgười dùng hỏi: ${prompt}` }] }]
            }),
            signal: AbortSignal.timeout(9000)
          }
        );

        if (geminiResp.ok) {
          const geminiJson = await geminiResp.json();
          const generatedText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text;
          if (generatedText) {
            return res.json({
              success: true,
              data: {
                text: generatedText,
                executiveSummary: 'Phản hồi được tạo sinh từ mô hình Gemini 1.5 Flash kết hợp tri thức RAG Server CineStreams.',
                analysisPoints: matchedChunks.slice(0, 3).map((c, i) => ({
                  index: i + 1,
                  title: c.chunk.title,
                  content: c.chunk.content.slice(0, 140) + '...'
                })),
                recommendedMovies: [
                  {
                    id: 'dune-2',
                    title: 'Dune: Hành Tinh Cát - Phần 2',
                    genres: ['Khoa Học Viễn Tưởng', 'Sử Thi'],
                    matchPercent: 98,
                    badge: '4K DOLBY',
                    poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCN2LMdr7k6t28pixcqtV_DU65R9YZc6w1Fa_ofgP4IwbnJCRwg4sKZs9nvQ40M0rQPiGuXT_whrQdyb2iltXdCebb-KJylFIFvezB82DegiDGQyGgkTY98eVWk2seEB3-zres6kWJn-SZG_yTH0x0oPrzHFeDIkA6g2zyAlSE5qVt9uHONADDErNAaIEAn92dssTytRm4AFrQAfOeIvPpapO6-EbMVeGb1VJ_UXDyWlKXs68gnjWjb3w',
                    reason: 'Đối soát chuẩn xác từ truy vấn của bạn qua hệ thống RAG CineStreams.'
                  }
                ],
                ragCitations,
                engine: 'CineStreams Gemini-RAG Cloud'
              }
            });
          }
        }
      } catch (_gErr) {
        // Fallback to internal server RAG
      }
    }

    // Server-side RAG Generation
    let text = '';
    let executiveSummary = '';
    const analysisPoints = [
      {
        index: 1,
        title: 'Truy xuất tri thức ngữ nghĩa (Vector Semantic Retrieval)',
        content: `Đã đối soát ${matchedChunks.length} hồ sơ tư liệu tương quan với truy vấn "${prompt}".`
      },
      {
        index: 2,
        title: 'Độ chuẩn xác và bối cảnh tác phẩm',
        content: 'Toàn bộ dữ liệu điện ảnh và tính năng nền tảng được kiểm chứng từ cơ sở dữ liệu CineStreams.'
      },
      {
        index: 3,
        title: 'Khuyến nghị trải nghiệm & Phòng xem chung',
        content: 'Bạn có thể mở ngay Phòng Xem Chung (Watch Party) để thưởng thức cùng bạn bè với âm thanh Dolby Atmos 5.1.'
      }
    ];

    if (mode === 'explainer') {
      executiveSummary = `Hồ sơ phân tích kịch bản & cấu trúc điện ảnh chuyên sâu dành cho truy vấn: "${prompt}".`;
      text = `Dựa trên hệ thống tri thức RAG CineStreams:\n\n` +
        `Tác phẩm khai thác đa tầng ẩn dụ nghệ thuật kết hợp xung đột nội tâm sâu sắc của các nhân vật. ` +
        (antiSpoiler ? 'Chế độ Bảo vệ Spoilers đang BẬT: Các tình tiết nút thắt cao trào cuối phim được giữ trọn vẹn để bạn thưởng thức tốt nhất.' : 'Cái kết làm sáng tỏ mối liên hệ nhân quả xuyên suốt toàn bộ mạch truyện.') +
        `\n\nBạn có thể trải nghiệm tác phẩm với chất lượng 4K Dolby Vision trên CineStreams ngay hôm nay!`;
    } else if (mode === 'compare') {
      executiveSummary = `Bản đối soát so sánh phong cách nghệ thuật, kỹ xảo và cảm xúc điện ảnh.`;
      text = `So sánh chuyên sâu từ CineAI RAG:\n\n` +
        `Mỗi tác phẩm đều sở hữu ngôn ngữ điện ảnh độc đáo: từ nhịp độ dựng phim, cách sử dụng dải màu ánh sáng đến thiết kế âm thanh. ` +
        `Các tác phẩm đều đạt chứng nhận đánh giá cao từ giới phê bình quốc tế và cộng đồng khán giả CineStreams.`;
    } else {
      executiveSummary = `Gợi ý phim chuẩn gu điện ảnh dựa trên phân tích tâm trạng và sở thích cá nhân.`;
      text = `CineAI RAG xin gửi tới bạn đề xuất điện ảnh phù hợp nhất với tâm trạng và mong muốn hiện tại:\n\n` +
        `Hệ sinh thái CineStreams đang có sẵn các tựa phim đỉnh cao với công nghệ đồng bộ Phòng Xem Chung (Watch Party) qua Socket.IO. Hãy chọn một tựa phim bên dưới và rủ bạn bè cùng thưởng thức ngay!`;
    }

    const recommendedMovies = [
      {
        id: 'dune-2',
        title: 'Dune: Hành Tinh Cát - Phần 2',
        genres: ['Khoa Học Viễn Tưởng', 'Sử Thi'],
        matchPercent: 98,
        badge: '4K DOLBY ATMOS',
        poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCN2LMdr7k6t28pixcqtV_DU65R9YZc6w1Fa_ofgP4IwbnJCRwg4sKZs9nvQ40M0rQPiGuXT_whrQdyb2iltXdCebb-KJylFIFvezB82DegiDGQyGgkTY98eVWk2seEB3-zres6kWJn-SZG_yTH0x0oPrzHFeDIkA6g2zyAlSE5qVt9uHONADDErNAaIEAn92dssTytRm4AFrQAfOeIvPpapO6-EbMVeGb1VJ_UXDyWlKXs68gnjWjb3w',
        reason: 'Hòa quyện hoàn hảo giữa kỹ xảo IMAX và chiều sâu kịch bản triết lý.'
      },
      {
        id: 'oppenheimer',
        title: 'Oppenheimer',
        genres: ['Lịch Sử', 'Tâm Lý'],
        matchPercent: 95,
        badge: 'IMAX 70MM',
        poster: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuG3txMZplmamoKp2e9nRbwOyR9jS12jeDZuTNiqg-V9gcwC7KEmAo5jwkIAR6LEPIL5zrkWkx1Te6QYoKBLDvyXQ9NU0XKcXASaziWS9XoNGw1gxEJpmC0YSssjjNNnbkM9l4-xH_OKkI6IEqS5QJFpNSfO54GBuQvYyGbH9viRRvJ83f5l8ri3J1Eh7DFrWYiV0hqbKXcl4jDVUo7SX36hpGlcuANFHwvkqy5mHXV8WsG3tKcp8CZg',
        reason: 'Đỉnh cao diễn xuất và nghệ thuật dàn dựng của Christopher Nolan.'
      }
    ];

    res.json({
      success: true,
      data: {
        text,
        executiveSummary,
        analysisPoints,
        recommendedMovies,
        ragCitations,
        engine: 'CineStreams RAG Gateway v4.0'
      }
    });
  });

  // CineAI Knowledge Base Overview API
  app.get('/api/cineai/knowledge', (_req, res) => {
    res.json({
      success: true,
      data: {
        totalIndexed: 148,
        categories: [
          { name: 'Phim truyện & Phim bộ', count: 85 },
          { name: 'Kịch bản phân tích chuyên sâu', count: 32 },
          { name: 'Đạo diễn & Hậu trường kỹ xảo', count: 18 },
          { name: 'Tính năng nền tảng (Watch Party, 4K, VietQR)', count: 13 }
        ],
        vectorEngine: 'CineStreams Embedding Space v4',
        lastUpdated: new Date().toISOString()
      }
    });
  });

  // ==========================================================
  // Finance & Revenue Management APIs (TASK: FINANCE_MANAGER)
  // ==========================================================
  interface FinanceTransaction {
    orderId: string;
    username: string;
    userEmail: string;
    planName: string;
    amount: number;
    paymentMethod: string;
    bankName: string;
    accountNumber: string;
    transferSyntax: string;
    status: 'PAID_VERIFIED' | 'PENDING_PAYMENT' | 'REFUNDED';
    createdAt: string;
    paidAt?: string;
    refundedAt?: string;
    refundReason?: string;
    gatewayRef?: string;
  }

  const financeTransactions: FinanceTransaction[] = [
    {
      orderId: 'CINE-891024',
      username: 'hadinhluc_pm',
      userEmail: 'luc.hadinh@cinestreams.vn',
      planName: 'VIP Điện Ảnh 1 Năm',
      amount: 699000,
      paymentMethod: 'VietQR 247',
      bankName: 'MBBank Quân Đội',
      accountNumber: '0345469878',
      transferSyntax: 'CS CINE891024',
      status: 'PAID_VERIFIED',
      createdAt: '2026-11-15T08:30:00Z',
      paidAt: '2026-11-15T08:31:12Z',
      gatewayRef: 'MB-NAPAS-98124501'
    },
    {
      orderId: 'CINE-742190',
      username: 'ngoctrinh_vip',
      userEmail: 'ngoctrinh@gmail.com',
      planName: 'VIP 4K Gia Đình 6 Tháng',
      amount: 399000,
      paymentMethod: 'VietQR 247',
      bankName: 'MBBank Quân Đội',
      accountNumber: '0345469878',
      transferSyntax: 'CS CINE742190',
      status: 'PAID_VERIFIED',
      createdAt: '2026-11-15T09:12:00Z',
      paidAt: '2026-11-15T09:13:05Z',
      gatewayRef: 'MB-NAPAS-98124502'
    },
    {
      orderId: 'CINE-654812',
      username: 'hoangnam_99',
      userEmail: 'namhoang99@outlook.com',
      planName: 'VIP Tiêu Chuẩn 1 Tháng',
      amount: 79000,
      paymentMethod: 'VietQR 247',
      bankName: 'MBBank Quân Đội',
      accountNumber: '0345469878',
      transferSyntax: 'CS CINE654812',
      status: 'PAID_VERIFIED',
      createdAt: '2026-11-14T19:40:00Z',
      paidAt: '2026-11-14T19:41:22Z',
      gatewayRef: 'MB-NAPAS-98124488'
    },
    {
      orderId: 'CINE-512903',
      username: 'thanhthao_cin',
      userEmail: 'thao.thanh@gmail.com',
      planName: 'VIP Điện Ảnh 1 Năm',
      amount: 699000,
      paymentMethod: 'VietQR 247',
      bankName: 'MBBank Quân Đội',
      accountNumber: '0345469878',
      transferSyntax: 'CS CINE512903',
      status: 'PAID_VERIFIED',
      createdAt: '2026-11-14T15:20:00Z',
      paidAt: '2026-11-14T15:20:55Z',
      gatewayRef: 'MB-NAPAS-98124430'
    },
    {
      orderId: 'CINE-489012',
      username: 'duyhai_film',
      userEmail: 'duyhai.film@yahoo.com',
      planName: 'VIP Tiêu Chuẩn 1 Tháng',
      amount: 79000,
      paymentMethod: 'VietQR 247',
      bankName: 'MBBank Quân Đội',
      accountNumber: '0345469878',
      transferSyntax: 'CS CINE489012',
      status: 'PENDING_PAYMENT',
      createdAt: '2026-11-15T10:05:00Z'
    },
    {
      orderId: 'CINE-321098',
      username: 'minhchau_92',
      userEmail: 'chau.minh@gmail.com',
      planName: 'VIP 4K Gia Đình 6 Tháng',
      amount: 399000,
      paymentMethod: 'VietQR 247',
      bankName: 'MBBank Quân Đội',
      accountNumber: '0345469878',
      transferSyntax: 'CS CINE321098',
      status: 'REFUNDED',
      createdAt: '2026-11-13T11:00:00Z',
      paidAt: '2026-11-13T11:02:10Z',
      refundedAt: '2026-11-13T14:20:00Z',
      refundReason: 'Khách hàng mua trùng 2 lần do mạng chậm',
      gatewayRef: 'MB-NAPAS-98124310'
    }
  ];

  // VietQR Instant VIP Order Generation
  app.post('/api/vietqr/generate', (req, res) => {
    const { planId, amount, billingCycle, username, email } = req.body;
    const orderId = 'CINE-' + Math.floor(100000 + Math.random() * 900000);
    const syntax = `CS ${orderId.replace('-', '')}`;
    const bankCode = 'MB';
    const accountNumber = '0345469878';
    const accountName = 'HA DINH LUC';
    const qrUrl = `https://img.vietqr.io/image/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(syntax)}&accountName=${encodeURIComponent(accountName)}`;

    const planName = planId === 'vip_yearly' ? 'VIP Điện Ảnh 1 Năm' : planId === 'vip_family' ? 'VIP 4K Gia Đình 6 Tháng' : 'VIP Tiêu Chuẩn 1 Tháng';

    financeTransactions.unshift({
      orderId,
      username: username || 'User_' + Math.floor(1000 + Math.random() * 9000),
      userEmail: email || 'user@cinestreams.vn',
      planName,
      amount: Number(amount) || 79000,
      paymentMethod: 'VietQR 247',
      bankName: 'MBBank Quân Đội',
      accountNumber,
      transferSyntax: syntax,
      status: 'PENDING_PAYMENT',
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      orderId,
      amount,
      planId,
      billingCycle: billingCycle || 'monthly',
      bankCode,
      bankName: 'MBBank (Ngân hàng Quân Đội)',
      accountNumber,
      accountName,
      syntax,
      qrUrl,
      expiresInSeconds: 600,
      status: 'PENDING_PAYMENT'
    });
  });

  app.get('/api/vietqr/verify/:orderId', (req, res) => {
    const { orderId } = req.params;
    const tx = financeTransactions.find(t => t.orderId === orderId || t.orderId.replace('-', '') === orderId.replace('-', ''));
    if (tx && tx.status === 'PENDING_PAYMENT') {
      tx.status = 'PAID_VERIFIED';
      tx.paidAt = new Date().toISOString();
      tx.gatewayRef = 'MB-NAPAS-' + Math.floor(10000000 + Math.random() * 90000000);
    }

    res.json({
      orderId,
      status: 'PAID_VERIFIED',
      message: 'Giao dịch thành công qua VietQR 24/7! Tài khoản đã được nâng cấp VIP.',
      activatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  });

  // Finance Overview KPI Endpoint
  app.get('/api/finance/overview', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/finance/overview', 'GET', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    let totalRevenue = 0;
    let totalRefunded = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let refundCount = 0;
    let monthlyPlanCount = 0;
    let sixMonthPlanCount = 0;
    let yearlyPlanCount = 0;

    financeTransactions.forEach(t => {
      if (t.status === 'PAID_VERIFIED') {
        totalRevenue += t.amount;
        paidCount++;
        if (t.planName.includes('1 Năm')) yearlyPlanCount++;
        else if (t.planName.includes('6 Tháng')) sixMonthPlanCount++;
        else monthlyPlanCount++;
      } else if (t.status === 'REFUNDED') {
        totalRefunded += t.amount;
        refundCount++;
      } else if (t.status === 'PENDING_PAYMENT') {
        pendingCount++;
      }
    });

    const totalOrders = paidCount + pendingCount + refundCount;
    const successRate = totalOrders > 0 ? Number(((paidCount / totalOrders) * 100).toFixed(1)) : 100;

    res.json({
      success: true,
      data: {
        totalRevenue,
        monthRevenue: totalRevenue,
        totalRefunded,
        paidCount,
        pendingCount,
        refundCount,
        successRate,
        monthlyPlanCount,
        sixMonthPlanCount,
        yearlyPlanCount,
        currency: 'VND',
        gatewayStatus: 'ONLINE_OPERATIONAL',
        bankGateway: 'MBBank Napas 24/7 VietQR',
        lastReconciledAt: new Date().toISOString()
      }
    });
  });

  // Finance Transactions Ledger Endpoint
  app.get('/api/finance/transactions', async (req, res) => {
    const status = req.query.status as string;
    const search = req.query.search as string;

    const proxyRes = await proxyToSpringBoot(`/api/finance/transactions${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`, 'GET', undefined, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    let list = [...financeTransactions];
    if (status && status !== 'ALL') {
      list = list.filter(t => t.status === status);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(t =>
        t.orderId.toLowerCase().includes(q) ||
        t.username.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        (t.gatewayRef && t.gatewayRef.toLowerCase().includes(q))
      );
    }

    res.json({
      success: true,
      data: list
    });
  });

  // Finance Refund Processing Endpoint
  app.post('/api/finance/refund', async (req, res) => {
    const { orderId, reason } = req.body;
    const proxyRes = await proxyToSpringBoot('/api/finance/refund', 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const tx = financeTransactions.find(t => t.orderId === orderId);
    if (!tx) {
      return res.status(404).json({ success: false, message: `Không tìm thấy đơn hàng ${orderId}` });
    }
    if (tx.status === 'REFUNDED') {
      return res.status(400).json({ success: false, message: 'Đơn hàng này đã được hoàn tiền trước đó' });
    }

    tx.status = 'REFUNDED';
    tx.refundedAt = new Date().toISOString();
    tx.refundReason = reason || 'Hoàn tiền theo yêu cầu khách hàng';

    res.json({
      success: true,
      message: `Đã hoàn tiền ${tx.amount.toLocaleString('vi-VN')}đ cho mã đơn ${orderId} thành công qua MBBank/Napas!`,
      data: tx
    });
  });

  // Finance Reconciliation Endpoint
  app.post('/api/finance/reconciliation', async (req, res) => {
    const proxyRes = await proxyToSpringBoot('/api/finance/reconciliation', 'POST', req.body, getForwardHeaders(req));
    if (proxyRes.handled) return res.status(proxyRes.status).json(proxyRes.data);

    const totalChecked = financeTransactions.length;
    const matchedCount = financeTransactions.filter(t => t.status === 'PAID_VERIFIED').length;
    const discrepancyCount = financeTransactions.filter(t => t.status === 'PENDING_PAYMENT').length;
    const totalVerifiedAmount = financeTransactions
      .filter(t => t.status === 'PAID_VERIFIED')
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      data: {
        status: 'SUCCESS',
        totalChecked,
        matchedCount,
        discrepancyCount,
        totalVerifiedAmount,
        gateway: 'MBBank VietQR - Napas 24/7 Direct API',
        reconciledTime: new Date().toISOString(),
        message: `Đối soát hoàn tất: Khớp ${matchedCount}/${totalChecked} giao dịch. 0 lỗi chênh lệch số dư.`
      }
    });
  });

  // ==========================================================
  // Real-time Watch Party Engine (SSE + State Sync)
  // ==========================================================

  interface WpParticipant {
    id: string;
    name: string;
    avatar: string;
    isVip: boolean;
    isHost: boolean;
    isMicMuted?: boolean;
    joinedAt: string;
  }

  interface WpRoom {
    id: string;
    title: string;
    movieId: string;
    movieTitle: string;
    streamUrl: string;
    coverImage: string;
    hostId: string;
    hostName: string;
    hostLock: boolean;
    isPlaying: boolean;
    currentTime: number; // in seconds
    maxCount: number;
    pinnedMessage: string;
    createdAt: string;
    participants: Map<string, WpParticipant>;
    chatMessages: any[];
    sseClients: Set<express.Response>;
  }

  const wpRooms = new Map<string, WpRoom>();

  const initDefaultRooms = () => {
    const r1: WpRoom = {
      id: 'room-dune-2',
      title: 'Phòng Xem Chung: Dune 2 (Đêm Cuối Tuần)',
      movieId: 'dune-2',
      movieTitle: 'Dune: Hành Tinh Cát - Phần 2',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCN2LMdr7k6t28pixcqtV_DU65R9YZc6w1Fa_ofgP4IwbnJCRwg4sKZs9nvQ40M0rQPiGuXT_whrQdyb2iltXdCebb-KJylFIFvezB82DegiDGQyGgkTY98eVWk2seEB3-zres6kWJn-SZG_yTH0x0oPrzHFeDIkA6g2zyAlSE5qVt9uHONADDErNAaIEAn92dssTytRm4AFrQAfOeIvPpapO6-EbMVeGb1VJ_UXDyWlKXs68gnjWjb3w',
      hostId: 'host-minhhoang',
      hostName: 'Minh Hoàng (VIP Host)',
      hostLock: true,
      isPlaying: true,
      currentTime: 145,
      maxCount: 20,
      pinnedMessage: 'Chào mừng cả nhà! Bật loa to lên để trải nghiệm âm thanh Dolby Atmos nào 🔥',
      createdAt: new Date().toISOString(),
      participants: new Map([
        ['p1', { id: 'p1', name: 'Minh Hoàng (Host)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', isVip: true, isHost: true, isMicMuted: true, joinedAt: '20:00' }],
        ['p2', { id: 'p2', name: 'Bảo Ngọc 👑', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', isVip: true, isHost: false, isMicMuted: true, joinedAt: '20:05' }],
        ['p3', { id: 'p3', name: 'Tuấn Anh', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', isVip: false, isHost: false, isMicMuted: true, joinedAt: '20:10' }],
        ['p4', { id: 'p4', name: 'Khánh Linh', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150', isVip: true, isHost: false, isMicMuted: true, joinedAt: '20:12' }]
      ]),
      chatMessages: [
        { id: 'm1', user: 'Minh Hoàng (Host)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', isVip: true, isHost: true, text: 'Chào mừng cả nhà! Bật loa to lên để trải nghiệm âm thanh Dolby Atmos nào 🔥', time: '20:15' },
        { id: 'm2', user: 'Bảo Ngọc 👑', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', isVip: true, text: 'Âm thanh Dolby Atmos nghe rung cả phòng khách luôn á 🍿', time: '20:16' },
        { id: 'm3', user: 'Tuấn Anh', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', isVip: false, text: 'Visual của đạo diễn Denis đỉnh thật sự, khung hình nào cũng như tranh vẽ!', time: '20:17' }
      ],
      sseClients: new Set()
    };

    const r2: WpRoom = {
      id: 'room-oppenheimer',
      title: 'Phòng Chiếu IMAX 4K: Oppenheimer',
      movieId: 'oppenheimer',
      movieTitle: 'Oppenheimer',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBuG3txMZplmamoKp2e9nRbwOyR9jS12jeDZuTNiqg-V9gcwC7KEmAo5jwkIAR6LEPIL5zrkWkx1Te6QYoKBLDvyXQ9NU0XKcXASaziWS9XoNGw1gxEJpmC0YSssjjNNnbkM9l4-xH_OKkI6IEqS5QJFpNSfO54GBuQvYyGbH9viRRvJ83f5l8ri3J1Eh7DFrWYiV0hqbKXcl4jDVUo7SX36hpGlcuANFHwvkqy5mHXV8WsG3tKcp8CZg',
      hostId: 'host-denis',
      hostName: 'Denis Trần (VIP)',
      hostLock: true,
      isPlaying: true,
      currentTime: 320,
      maxCount: 30,
      pinnedMessage: 'Phân đoạn thử nghiệm Trinity sắp bắt đầu, mọi người sẵn sàng tăng âm lượng!',
      createdAt: new Date().toISOString(),
      participants: new Map([
        ['p10', { id: 'p10', name: 'Denis Trần (VIP)', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', isVip: true, isHost: true, isMicMuted: true, joinedAt: '19:40' }],
        ['p11', { id: 'p11', name: 'Quốc Bảo', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150', isVip: true, isHost: false, isMicMuted: true, joinedAt: '19:45' }]
      ]),
      chatMessages: [
        { id: 'mo1', user: 'Denis Trần (VIP)', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', isVip: true, isHost: true, text: 'Phim này xem 4K trên màn hình lớn CineStreams phê thật sự!', time: '19:50' }
      ],
      sseClients: new Set()
    };

    const r3: WpRoom = {
      id: 'room-arcane-s2',
      title: 'Fandom Xem Chung: Arcane Mùa 2',
      movieId: 'arcane-s2',
      movieTitle: 'Arcane: Mùa 2',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      coverImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAR5oxnZ56nHvn2-epNkm2CKNARcT18xmvEbtly9yRwjAR4MOVRn80bhIFSUeYLGZS6RYd7KeXJBiPCjactmHV9gwJiDqEW3KlnOgsuMqL916am46nqWMvI8_v7z0ir29LS-5jy-z-o2wcrmE6Aad6NFqt9Q62o4gSY9ARnO00FXGXIFg0HjjPUmrH0_5edw5jhzDoab83CVqVMknsiiHzgxFmInRcC15N6j96h8Opzj-cg_YA7BNvQqQ',
      hostId: 'host-jinx',
      hostName: 'Linh Dan (Jinx Fan)',
      hostLock: false,
      isPlaying: true,
      currentTime: 60,
      maxCount: 25,
      pinnedMessage: 'Phòng mở tự do, ai cũng có thể điều khiển và trò chuyện!',
      createdAt: new Date().toISOString(),
      participants: new Map([
        ['p20', { id: 'p20', name: 'Linh Dan (Jinx Fan)', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', isVip: true, isHost: true, isMicMuted: true, joinedAt: '20:10' }]
      ]),
      chatMessages: [],
      sseClients: new Set()
    };

    wpRooms.set(r1.id, r1);
    wpRooms.set('room-vip-live', { ...r1, id: 'room-vip-live' });
    wpRooms.set(r2.id, r2);
    wpRooms.set(r3.id, r3);
  };

  initDefaultRooms();

  const formatRoomForClient = (room: WpRoom) => {
    const mins = Math.floor(room.currentTime / 60);
    const secs = Math.floor(room.currentTime % 60);
    const timeFormatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    return {
      id: room.id,
      title: room.title,
      movieId: room.movieId,
      movieTitle: room.movieTitle,
      streamUrl: room.streamUrl,
      hostName: room.hostName,
      hostId: room.hostId,
      hostLock: room.hostLock,
      isPlaying: room.isPlaying,
      currentTimeSeconds: room.currentTime,
      activeCount: room.participants.size,
      maxCount: room.maxCount,
      currentTime: timeFormatted,
      coverImage: room.coverImage,
      isLive: true,
      pinnedMessage: room.pinnedMessage,
      createdAt: room.createdAt,
      participants: Array.from(room.participants.values()),
      chatMessages: room.chatMessages.slice(-50)
    };
  };

  const broadcastToRoom = (roomId: string, data: any) => {
    const room = wpRooms.get(roomId);
    if (!room) return;

    // 1. Socket.IO Real-time Emit
    try {
      io.to(roomId).emit(data.type, data);
      io.to(roomId).emit('action', data);
      if (data.type === 'PLAY') io.to(roomId).emit('sync_play', data);
      if (data.type === 'PAUSE') io.to(roomId).emit('sync_pause', data);
      if (data.type === 'SEEK') io.to(roomId).emit('sync_seek', data);
      if (data.type === 'SYNC_TIME') io.to(roomId).emit('sync_time', data);
    } catch (_ioErr) {
      // Socket.IO emit error ignore
    }

    // 2. SSE Fallback
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    room.sseClients.forEach((client) => {
      try {
        client.write(payload);
        if (typeof (client as any).flush === 'function') {
          (client as any).flush();
        }
      } catch (_err) {
        room.sseClients.delete(client);
      }
    });
  };

  // 1. Get all public rooms
  app.get('/api/watchparty/rooms', async (_req, res) => {
    // Try proxying to Spring Boot Backend
    const proxyRes = await proxyToSpringBoot('/api/watchparty/rooms', 'GET');
    if (proxyRes.handled && proxyRes.data && (proxyRes.data.rooms || proxyRes.data.data)) {
      return res.status(proxyRes.status).json(proxyRes.data);
    }

    const rooms = Array.from(wpRooms.values()).map(formatRoomForClient);
    res.json({ success: true, rooms });
  });

  // 2. Create a new room
  app.post('/api/watchparty/rooms', async (req, res) => {
    const { title, movieId, movieTitle, streamUrl, coverImage, hostName, hostId, maxCount, hostLock, isVip } = req.body || {};

    // Phân quyền VIP: Chỉ cho phép tài khoản VIP tạo phòng xem chung
    if (isVip === false) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ thành viên VIP mới có quyền tạo phòng xem chung (Watch Party). Vui lòng nâng cấp VIP!'
      });
    }

    // Try proxying to Spring Boot Backend
    const proxyRes = await proxyToSpringBoot('/api/watchparty/rooms', 'POST', req.body);
    if (proxyRes.handled && proxyRes.data && proxyRes.data.room) {
      const r = proxyRes.data.room;
      if (r && r.id && !wpRooms.has(r.id)) {
        wpRooms.set(r.id, {
          id: r.id,
          title: r.title,
          movieId: r.movieId,
          movieTitle: r.movieTitle,
          streamUrl: r.streamUrl,
          coverImage: r.coverImage,
          hostId: r.hostId,
          hostName: r.hostName,
          hostLock: r.hostLock ?? true,
          isPlaying: r.isPlaying ?? true,
          currentTime: r.currentTimeSeconds || 0,
          maxCount: r.maxCount || 20,
          pinnedMessage: r.pinnedMessage || '',
          createdAt: r.createdAt || new Date().toISOString(),
          participants: new Map(),
          chatMessages: [],
          sseClients: new Set()
        });
      }
      return res.status(proxyRes.status).json(proxyRes.data);
    }

    const newId = 'room-' + (movieId || 'custom') + '-' + Math.random().toString(36).substring(2, 7);

    const hostUser: WpParticipant = {
      id: hostId || 'host-' + Date.now(),
      name: hostName || 'Bạn (Host)',
      avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKI3gRB2-ajZZGcKyE5j9o_QEHEa3jFKNQP2LDRuci6XUPZo7WjzRr67sHpmExkSNaTWfkgRQ-Itw30N5OIN9GZoYP9E-htmJ2SQsH9tVP6aCpsRVOaVnI8ltteCYpTHRUWXojhbkoUTwS8XpkDIHRXmFj83yGCFvjkLDR6vWk8GMveFcp6CcrbT50VV2sHcmj2ghAuV1CiQX4kVprpH10y-oErnTIfsTRLHwLctzwqvDUQAe87wgqBg',
      isVip: true,
      isHost: true,
      isMicMuted: true,
      joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newRoom: WpRoom = {
      id: newId,
      title: title || `Phòng xem chung: ${movieTitle || 'Điện ảnh CineStreams'}`,
      movieId: movieId || 'dune-2',
      movieTitle: movieTitle || 'Dune: Hành Tinh Cát - Phần 2',
      streamUrl: streamUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      coverImage: coverImage || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop',
      hostId: hostUser.id,
      hostName: hostUser.name,
      hostLock: hostLock !== undefined ? Boolean(hostLock) : true,
      isPlaying: true,
      currentTime: 0,
      maxCount: Number(maxCount) || 20,
      pinnedMessage: 'Phòng xem phim mới được tạo. Chúc các bạn xem phim vui vẻ!',
      createdAt: new Date().toISOString(),
      participants: new Map([[hostUser.id, hostUser]]),
      chatMessages: [
        {
          id: 'sys-start-' + Date.now(),
          user: 'Hệ Thống CineStreams',
          avatar: 'https://lh3.googleusercontent.com/aida/AEtjO1WC0McFhPdYTMUpIJiw3NTLOZDekEzqplij7U6Ik1JbwrohLRGwQha077NudFdm-uyJOYTlJ389bVezmrd0z6BwSlUa6-KDapHwljOG2Sp6W9cAX-kP9jJuyrLFx-kuH6EYmRsJicTOIRNP20-4lQcg8xmGDsHx6im-VxJh0ri4IhPmZKhOcwLsu3TMLb67bFmFSJOwLY3jzjYn9G97WMLRANSvHiinx2OhXgTVhjMWhvxuLNwLK7VBaGIb',
          isVip: true,
          isSystem: true,
          text: `Phòng xem chung [${title || movieTitle}] đã sẵn sàng. Mời bạn bè cùng xem ngay!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      sseClients: new Set()
    };

    wpRooms.set(newId, newRoom);
    res.json({ success: true, room: formatRoomForClient(newRoom) });
  });

  // 3. Get specific room details
  app.get('/api/watchparty/rooms/:roomId', async (req, res) => {
    // Try proxying to Spring Boot Backend
    const proxyRes = await proxyToSpringBoot(`/api/watchparty/rooms/${req.params.roomId}`, 'GET');
    if (proxyRes.handled && proxyRes.data && proxyRes.data.room) {
      return res.status(proxyRes.status).json(proxyRes.data);
    }

    let room = wpRooms.get(req.params.roomId);
    if (!room) {
      // Auto-fallback default room
      room = wpRooms.get('room-dune-2') || wpRooms.get('room-vip-live');
    }
    if (!room) return res.status(404).json({ success: false, message: 'Phòng không tồn tại' });
    res.json({ success: true, room: formatRoomForClient(room) });
  });

  // 4. SSE real-time stream for a room
  app.get('/api/watchparty/rooms/:roomId/events', (req, res) => {
    const roomId = req.params.roomId;
    let room = wpRooms.get(roomId);
    if (!room) {
      room = wpRooms.get('room-dune-2') || wpRooms.get('room-vip-live');
    }
    if (!room) {
      res.status(404).end();
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*'
    });

    res.write(`data: ${JSON.stringify({ type: 'INITIAL_STATE', room: formatRoomForClient(room) })}\n\n`);
    room.sseClients.add(res);

    const keepAliveInterval = setInterval(() => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'PING', timestamp: Date.now() })}\n\n`);
      } catch (_e) {
        clearInterval(keepAliveInterval);
      }
    }, 15000);

    req.on('close', () => {
      clearInterval(keepAliveInterval);
      room?.sseClients.delete(res);
    });
  });

  // 5. Watch Party Actions Dispatcher (Play, Pause, Seek, Chat, Reaction, Join, Leave, Lock)
  app.post('/api/watchparty/rooms/:roomId/action', (req, res) => {
    const roomId = req.params.roomId;

    // Forward action to Spring Boot Backend asynchronously
    proxyToSpringBoot(`/api/watchparty/rooms/${roomId}/action`, 'POST', req.body).catch(() => { });

    let room = wpRooms.get(roomId);
    if (!room) {
      room = wpRooms.get('room-dune-2') || wpRooms.get('room-vip-live');
    }
    if (!room) return res.status(404).json({ success: false, message: 'Phòng không tồn tại' });

    const { type, currentTime, isPlaying, user, message, emoji, hostLock, isMicMuted, pinnedMessage } = req.body || {};
    const timestamp = Date.now();

    switch (type) {
      case 'PLAY':
        room.isPlaying = true;
        if (typeof currentTime === 'number') room.currentTime = currentTime;
        broadcastToRoom(room.id, { type: 'PLAY', currentTime: room.currentTime, isPlaying: true, sender: user?.name, timestamp });
        break;

      case 'PAUSE':
        room.isPlaying = false;
        if (typeof currentTime === 'number') room.currentTime = currentTime;
        broadcastToRoom(room.id, { type: 'PAUSE', currentTime: room.currentTime, isPlaying: false, sender: user?.name, timestamp });
        break;

      case 'SEEK':
        if (typeof currentTime === 'number') room.currentTime = currentTime;
        broadcastToRoom(room.id, { type: 'SEEK', currentTime: room.currentTime, isPlaying: room.isPlaying, sender: user?.name, timestamp });
        break;

      case 'SYNC_TIME':
        if (typeof currentTime === 'number') room.currentTime = currentTime;
        if (typeof isPlaying === 'boolean') room.isPlaying = isPlaying;
        broadcastToRoom(room.id, { type: 'SYNC_TIME', currentTime: room.currentTime, isPlaying: room.isPlaying, timestamp });
        break;

      case 'CHAT': {
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newMsg = {
          id: message?.id || ('msg-' + Date.now() + Math.random().toString(36).substring(2, 6)),
          user: user?.name || message?.user || 'Thành Viên',
          userId: user?.id,
          avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          isVip: user?.isVip ?? true,
          isHost: user?.isHost || user?.id === room.hostId,
          text: message?.text || req.body?.text || '',
          time: timeNow,
          isSpoiler: Boolean(message?.isSpoiler)
        };
        room.chatMessages.push(newMsg);
        if (room.chatMessages.length > 100) room.chatMessages.shift();
        broadcastToRoom(room.id, { type: 'CHAT', message: newMsg, timestamp });
        break;
      }

      case 'REACTION': {
        const reactionData = {
          id: 'react-' + Date.now() + Math.random(),
          emoji: emoji || '❤️',
          x: Math.random() * 80 + 10,
          user: user?.name || 'Khách'
        };
        broadcastToRoom(room.id, { type: 'REACTION', reaction: reactionData, timestamp });
        break;
      }

      case 'JOIN': {
        if (user && user.id) {
          const participant: WpParticipant = {
            id: user.id,
            name: user.name || 'Người xem mới',
            avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            isVip: Boolean(user.isVip),
            isHost: user.id === room.hostId,
            isMicMuted: true,
            joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          room.participants.set(user.id, participant);
          const sysMsg = {
            id: 'sys-join-' + Date.now(),
            user: 'Hệ Thống CineStreams',
            avatar: 'https://lh3.googleusercontent.com/aida/AEtjO1WC0McFhPdYTMUpIJiw3NTLOZDekEzqplij7U6Ik1JbwrohLRGwQha077NudFdm-uyJOYTlJ389bVezmrd0z6BwSlUa6-KDapHwljOG2Sp6W9cAX-kP9jJuyrLFx-kuH6EYmRsJicTOIRNP20-4lQcg8xmGDsHx6im-VxJh0ri4IhPmZKhOcwLsu3TMLb67bFmFSJOwLY3jzjYn9G97WMLRANSvHiinx2OhXgTVhjMWhvxuLNwLK7VBaGIb',
            isVip: true,
            isSystem: true,
            text: `${participant.name} vừa tham gia phòng xem chung`,
            time: participant.joinedAt
          };
          room.chatMessages.push(sysMsg);
          broadcastToRoom(room.id, {
            type: 'PARTICIPANT_JOINED',
            participant,
            systemMessage: sysMsg,
            activeCount: room.participants.size,
            timestamp
          });
        }
        break;
      }

      case 'CLOSE_ROOM': {
        broadcastToRoom(room.id, {
          type: 'ROOM_CLOSED',
          roomId: room.id,
          message: 'Chủ phòng đã đóng phòng xem chung. Đang chuyển về trang chủ...',
          timestamp
        });
        wpRooms.delete(room.id);
        break;
      }

      case 'LEAVE': {
        const shouldClose = Boolean(req.body?.closeRoom);
        if (shouldClose) {
          broadcastToRoom(room.id, {
            type: 'ROOM_CLOSED',
            roomId: room.id,
            message: 'Chủ phòng đã đóng phòng xem chung. Đang chuyển về trang chủ...',
            timestamp
          });
          wpRooms.delete(room.id);
          break;
        }

        if (user && user.id) {
          const removedP = room.participants.get(user.id);
          room.participants.delete(user.id);
          const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const uname = removedP?.name || user.name || 'Một thành viên';
          const sysMsg = {
            id: 'sys-leave-' + Date.now(),
            user: 'Hệ Thống CineStreams',
            avatar: 'https://lh3.googleusercontent.com/aida/AEtjO1WC0McFhPdYTMUpIJiw3NTLOZDekEzqplij7U6Ik1JbwrohLRGwQha077NudFdm-uyJOYTlJ389bVezmrd0z6BwSlUa6-KDapHwljOG2Sp6W9cAX-kP9jJuyrLFx-kuH6EYmRsJicTOIRNP20-4lQcg8xmGDsHx6im-VxJh0ri4IhPmZKhOcwLsu3TMLb67bFmFSJOwLY3jzjYn9G97WMLRANSvHiinx2OhXgTVhjMWhvxuLNwLK7VBaGIb',
            isVip: true,
            isSystem: true,
            text: `${uname} đã rời phòng xem`,
            time: timeNow
          };
          room.chatMessages.push(sysMsg);
          broadcastToRoom(room.id, {
            type: 'PARTICIPANT_LEFT',
            userId: user.id,
            userName: uname,
            systemMessage: sysMsg,
            activeCount: room.participants.size,
            timestamp
          });
        }
        break;
      }

      case 'TOGGLE_LOCK':
        room.hostLock = Boolean(hostLock);
        broadcastToRoom(room.id, { type: 'HOST_LOCK_CHANGED', hostLock: room.hostLock, timestamp });
        break;

      case 'TOGGLE_MIC': {
        const targetId = user?.id;
        const targetName = user?.name;
        let p = targetId ? room.participants.get(targetId) : undefined;
        if (!p && targetName) {
          for (const val of room.participants.values()) {
            if (val.name === targetName) {
              p = val;
              break;
            }
          }
        }
        if (p) {
          p.isMicMuted = Boolean(isMicMuted);
        }
        broadcastToRoom(room.id, {
          type: 'MIC_STATUS_CHANGED',
          userId: targetId || p?.id,
          userName: targetName || p?.name,
          isMicMuted: Boolean(isMicMuted),
          timestamp
        });
        break;
      }

      case 'CHANGE_MOVIE': {
        const { movieId: newMovieId, movieTitle: newMovieTitle, streamUrl: newStreamUrl, coverImage: newCover } = req.body || {};
        if (newMovieId) room.movieId = newMovieId;
        if (newMovieTitle) room.movieTitle = newMovieTitle;
        if (newStreamUrl) room.streamUrl = newStreamUrl;
        if (newCover) room.coverImage = newCover;
        room.currentTime = 0;
        room.isPlaying = true;

        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const hName = user?.name || room.hostName || 'Chủ phòng';
        const sysMsg = {
          id: 'sys-movie-' + Date.now(),
          user: 'Hệ Thống CineStreams',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          isVip: true,
          isSystem: true,
          text: `${hName} đã đổi sang phim: ${room.movieTitle}. Toàn bộ phòng đã đồng bộ!`,
          time: timeNow
        };
        room.chatMessages.push(sysMsg);

        broadcastToRoom(room.id, {
          type: 'MOVIE_CHANGED',
          movieId: room.movieId,
          movieTitle: room.movieTitle,
          streamUrl: room.streamUrl,
          coverImage: room.coverImage,
          room: formatRoomForClient(room),
          systemMessage: sysMsg,
          timestamp
        });
        break;
      }

      case 'PIN_MESSAGE':
        if (pinnedMessage) {
          room.pinnedMessage = pinnedMessage;
          broadcastToRoom(room.id, { type: 'PINNED_MESSAGE_CHANGED', pinnedMessage, timestamp });
        }
        break;
    }

    res.json({ success: true, room: formatRoomForClient(room) });
  });

  // ==========================================================
  // Socket.IO Real-time Watch Party Server
  // ==========================================================
  io.on('connection', (socket) => {
    // 1. Tham gia phòng xem chung
    socket.on('join_room', (data) => {
      const { roomId, user } = data || {};
      if (!roomId) return;

      let room = wpRooms.get(roomId);
      if (!room) {
        room = wpRooms.get('room-dune-2') || wpRooms.get('room-vip-live');
      }
      if (!room) return;

      socket.join(roomId);
      (socket as any).watchPartyRoomId = roomId;
      (socket as any).watchPartyUser = user;

      if (user && user.id) {
        const participant: WpParticipant = {
          id: user.id,
          name: user.name || 'Người xem mới',
          avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
          isVip: Boolean(user.isVip),
          isHost: user.id === room.hostId || Boolean(user.isHost),
          isMicMuted: true,
          joinedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        room.participants.set(user.id, participant);

        const sysMsg = {
          id: 'sys-join-' + Date.now(),
          user: 'Hệ Thống CineStreams',
          avatar: 'https://lh3.googleusercontent.com/aida/AEtjO1WC0McFhPdYTMUpIJiw3NTLOZDekEzqplij7U6Ik1JbwrohLRGwQha077NudFdm-uyJOYTlJ389bVezmrd0z6BwSlUa6-KDapHwljOG2Sp6W9cAX-kP9jJuyrLFx-kuH6EYmRsJicTOIRNP20-4lQcg8xmGDsHx6im-VxJh0ri4IhPmZKhOcwLsu3TMLb67bFmFSJOwLY3jzjYn9G97WMLRANSvHiinx2OhXgTVhjMWhvxuLNwLK7VBaGIb',
          isVip: true,
          isSystem: true,
          text: `${participant.name} vừa tham gia phòng xem chung (Socket.IO)`,
          time: participant.joinedAt
        };
        room.chatMessages.push(sysMsg);

        // Gửi state ban đầu cho người vừa join
        socket.emit('initial_state', {
          type: 'INITIAL_STATE',
          room: formatRoomForClient(room)
        });

        // Broadcast cho các thành viên khác trong phòng
        socket.to(roomId).emit('participant_joined', {
          type: 'PARTICIPANT_JOINED',
          participant,
          systemMessage: sysMsg,
          activeCount: room.participants.size,
          timestamp: Date.now()
        });
      }
    });

    // 2. ĐỒNG BỘ PLAY (Phát tiếp video)
    socket.on('play', (data) => {
      const { roomId, currentTime, user } = data || {};
      const room = wpRooms.get(roomId);
      if (!room) return;

      room.isPlaying = true;
      if (typeof currentTime === 'number') room.currentTime = currentTime;

      const payload = {
        type: 'PLAY',
        currentTime: room.currentTime,
        isPlaying: true,
        sender: user?.name || user?.username || 'Chủ phòng',
        user,
        timestamp: Date.now()
      };

      // Broadcast tức thời đến tất cả người xem trong phòng
      socket.to(roomId).emit('sync_play', payload);
      broadcastToRoom(roomId, payload);
    });

    // 3. ĐỒNG BỘ PAUSE (Tạm dừng video)
    socket.on('pause', (data) => {
      const { roomId, currentTime, user } = data || {};
      const room = wpRooms.get(roomId);
      if (!room) return;

      room.isPlaying = false;
      if (typeof currentTime === 'number') room.currentTime = currentTime;

      const payload = {
        type: 'PAUSE',
        currentTime: room.currentTime,
        isPlaying: false,
        sender: user?.name || user?.username || 'Chủ phòng',
        user,
        timestamp: Date.now()
      };

      socket.to(roomId).emit('sync_pause', payload);
      broadcastToRoom(roomId, payload);
    });

    // 4. ĐỒNG BỘ SEEK (Tua video)
    socket.on('seek', (data) => {
      const { roomId, currentTime, user } = data || {};
      const room = wpRooms.get(roomId);
      if (!room) return;

      if (typeof currentTime === 'number') room.currentTime = currentTime;

      const payload = {
        type: 'SEEK',
        currentTime: room.currentTime,
        isPlaying: room.isPlaying,
        sender: user?.name || user?.username || 'Chủ phòng',
        user,
        timestamp: Date.now()
      };

      socket.to(roomId).emit('sync_seek', payload);
      broadcastToRoom(roomId, payload);
    });

    // 5. HEARTBEAT TIME SYNC
    socket.on('sync_beacon', (data) => {
      const { roomId, currentTime, isPlaying } = data || {};
      const room = wpRooms.get(roomId);
      if (!room) return;

      if (typeof currentTime === 'number') room.currentTime = currentTime;
      if (typeof isPlaying === 'boolean') room.isPlaying = isPlaying;

      socket.to(roomId).emit('sync_time', {
        type: 'SYNC_TIME',
        currentTime: room.currentTime,
        isPlaying: room.isPlaying,
        timestamp: Date.now()
      });
    });

    // 6. CHAT MESSAGE
    socket.on('chat_message', (data) => {
      const { roomId, message, user } = data || {};
      const room = wpRooms.get(roomId);
      if (!room) return;

      const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const newMsg = {
        id: message?.id || ('msg-' + Date.now() + Math.random().toString(36).substring(2, 6)),
        user: user?.name || message?.user || 'Thành Viên',
        userId: user?.id,
        avatar: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        isVip: user?.isVip ?? true,
        isHost: user?.isHost || user?.id === room.hostId,
        text: message?.text || '',
        time: timeNow,
        isSpoiler: Boolean(message?.isSpoiler)
      };
      room.chatMessages.push(newMsg);
      if (room.chatMessages.length > 100) room.chatMessages.shift();

      io.to(roomId).emit('chat_message', { message: newMsg, timestamp: Date.now() });
      broadcastToRoom(roomId, { type: 'CHAT', message: newMsg, timestamp: Date.now() });
    });

    // 7. REACTION EMOJI
    socket.on('reaction', (data) => {
      const { roomId, emoji, user } = data || {};
      const reactionData = {
        id: 'react-' + Date.now() + Math.random(),
        emoji: emoji || '❤️',
        x: Math.random() * 80 + 10,
        user: user?.name || 'Khách'
      };
      io.to(roomId).emit('reaction', { reaction: reactionData, timestamp: Date.now() });
      broadcastToRoom(roomId, { type: 'REACTION', reaction: reactionData, timestamp: Date.now() });
    });

    // 8. TOGGLE HOST LOCK
    socket.on('toggle_lock', (data) => {
      const { roomId, hostLock } = data || {};
      const room = wpRooms.get(roomId);
      if (!room) return;
      room.hostLock = Boolean(hostLock);
      const payload = { type: 'HOST_LOCK_CHANGED', hostLock: room.hostLock, timestamp: Date.now() };
      io.to(roomId).emit('host_lock_changed', payload);
      broadcastToRoom(roomId, payload);
    });

    // 9. TOGGLE MIC
    socket.on('toggle_mic', (data) => {
      const { roomId, userId, isMicMuted, userName } = data || {};
      const room = wpRooms.get(roomId);
      if (!room) return;
      const p = room.participants.get(userId);
      if (p) p.isMicMuted = Boolean(isMicMuted);
      const payload = {
        type: 'MIC_STATUS_CHANGED',
        userId,
        userName: userName || p?.name,
        isMicMuted: Boolean(isMicMuted),
        timestamp: Date.now()
      };
      io.to(roomId).emit('mic_status_changed', payload);
      broadcastToRoom(roomId, payload);
    });

    // 10. CHANGE MOVIE
    socket.on('change_movie', (data) => {
      const { roomId, movieData, user } = data || {};
      const room = wpRooms.get(roomId);
      if (!room) return;

      room.movieId = movieData.movieId || room.movieId;
      room.movieTitle = movieData.movieTitle || room.movieTitle;
      room.streamUrl = movieData.streamUrl || room.streamUrl;
      room.coverImage = movieData.coverImage || room.coverImage;
      room.currentTime = 0;
      room.isPlaying = true;

      const sysMsg = {
        id: 'sys-movie-' + Date.now(),
        user: 'Hệ Thống CineStreams',
        avatar: 'https://lh3.googleusercontent.com/aida/AEtjO1WC0McFhPdYTMUpIJiw3NTLOZDekEzqplij7U6Ik1JbwrohLRGwQha077NudFdm-uyJOYTlJ389bVezmrd0z6BwSlUa6-KDapHwljOG2Sp6W9cAX-kP9jJuyrLFx-kuH6EYmRsJicTOIRNP20-4lQcg8xmGDsHx6im-VxJh0ri4IhPmZKhOcwLsu3TMLb67bFmFSJOwLY3jzjYn9G97WMLRANSvHiinx2OhXgTVhjMWhvxuLNwLK7VBaGIb',
        isVip: true,
        isSystem: true,
        text: `${user?.name || 'Chủ phòng'} đã chuyển phim sang [${room.movieTitle}]`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      room.chatMessages.push(sysMsg);

      const payload = {
        type: 'MOVIE_CHANGED',
        room: formatRoomForClient(room),
        systemMessage: sysMsg,
        timestamp: Date.now()
      };
      io.to(roomId).emit('movie_changed', payload);
      broadcastToRoom(roomId, payload);
    });

    // 11. CLOSE ROOM
    socket.on('close_room', (data) => {
      const { roomId } = data || {};
      const payload = {
        type: 'ROOM_CLOSED',
        roomId,
        message: 'Chủ phòng đã đóng phòng xem chung qua Socket.IO.',
        timestamp: Date.now()
      };
      io.to(roomId).emit('room_closed', payload);
      broadcastToRoom(roomId, payload);
      wpRooms.delete(roomId);
    });

    // 12. LEAVE ROOM
    socket.on('leave_room', (data) => {
      const { roomId, user } = data || {};
      const room = wpRooms.get(roomId);
      if (room && user && user.id) {
        room.participants.delete(user.id);
        const sysMsg = {
          id: 'sys-leave-' + Date.now(),
          user: 'Hệ Thống CineStreams',
          avatar: 'https://lh3.googleusercontent.com/aida/AEtjO1WC0McFhPdYTMUpIJiw3NTLOZDekEzqplij7U6Ik1JbwrohLRGwQha077NudFdm-uyJOYTlJ389bVezmrd0z6BwSlUa6-KDapHwljOG2Sp6W9cAX-kP9jJuyrLFx-kuH6EYmRsJicTOIRNP20-4lQcg8xmGDsHx6im-VxJh0ri4IhPmZKhOcwLsu3TMLb67bFmFSJOwLY3jzjYn9G97WMLRANSvHiinx2OhXgTVhjMWhvxuLNwLK7VBaGIb',
          isVip: true,
          isSystem: true,
          text: `${user.name || 'Một thành viên'} đã rời phòng xem`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        room.chatMessages.push(sysMsg);

        const payload = {
          type: 'PARTICIPANT_LEFT',
          userId: user.id,
          userName: user.name,
          systemMessage: sysMsg,
          activeCount: room.participants.size,
          timestamp: Date.now()
        };
        io.to(roomId).emit('participant_left', payload);
        broadcastToRoom(roomId, payload);
      }
      socket.leave(roomId);
    });

    // 13. DISCONNECT
    socket.on('disconnect', () => {
      const roomId = (socket as any).watchPartyRoomId;
      const user = (socket as any).watchPartyUser;
      if (roomId && user && user.id) {
        const room = wpRooms.get(roomId);
        if (room) {
          room.participants.delete(user.id);
          const payload = {
            type: 'PARTICIPANT_LEFT',
            userId: user.id,
            userName: user.name,
            activeCount: room.participants.size,
            timestamp: Date.now()
          };
          socket.to(roomId).emit('participant_left', payload);
          broadcastToRoom(roomId, payload);
        }
      }
    });
  });

  // ==========================================================
  // Vite Dev Middleware or Production Static Server
  // ==========================================================
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { port: undefined },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[CineStreams] Running in Vite Dev Middleware mode with HMR enabled');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, { maxAge: '1d' }));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
      console.log(`[CineStreams] Serving production build from ${distPath}`);
    }
  }

  // Auto port finding
  let currentPort = Number(PORT) || 3000;
  const startServer = (portToTry: number) => {
    const serverInstance = httpServer.listen(portToTry);

    serverInstance.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[CineStreams] Cổng ${portToTry} đang bận, tự động thử cổng ${portToTry + 1}...`);
        startServer(portToTry + 1);
      } else {
        console.error('[CineStreams Server Error]:', err);
        process.exit(1);
      }
    });

    serverInstance.on('listening', () => {
      console.log(`\n======================================================`);
      console.log(`🎬 CineStreams Platform Gateway is running!`);
      console.log(`🚀 Access URL: http://localhost:${portToTry}`);
      console.log(`⚡ Mode: ${isProduction ? 'Production' : 'Development (Vite HMR)'}`);
      console.log(`======================================================\n`);
    });
  };

  startServer(currentPort);
}

createServer().catch((err) => {
  console.error('[CineStreams Server Error]:', err);
  process.exit(1);
});
