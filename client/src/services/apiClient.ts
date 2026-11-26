// API Client with automatic Bearer Token Injection and unified Error Handling

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export interface ApiResponse<T = any> {
  success?: number | boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface RequestConfig extends RequestInit {
  params?: Record<string, any>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  }

  private getDeviceId(): string {
    if (typeof window === 'undefined') return 'server';
    let deviceId = localStorage.getItem('cinestreams_device_id');
    if (!deviceId) {
      deviceId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('cinestreams_device_id', deviceId);
    }
    return deviceId;
  }

  private getHeaders(customHeaders: Record<string, any> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Device-Id': this.getDeviceId(),
    };

    if (customHeaders) {
      for (const [key, value] of Object.entries(customHeaders)) {
        if (typeof value === 'string' && key.toLowerCase() !== 'params') {
          headers[key] = value;
        }
      }
    }

    if (!headers['Authorization']) {
      const token = localStorage.getItem('cinestreams_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request<T>(endpoint: string, options: RequestConfig = {}): Promise<ApiResponse<T>> {
    let url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    // Append options.params to query string if present
    if (options.params && typeof options.params === 'object') {
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(options.params)) {
        if (v !== undefined && v !== null) {
          searchParams.append(k, String(v));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        url += (url.includes('?') ? '&' : '?') + qs;
      }
    }

    const headers = this.getHeaders(options.headers as Record<string, any>);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type');
      let data: any = null;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (text && text.toLowerCase().includes('<html')) {
          if (response.status === 502) {
            data = { message: 'Máy chủ Backend đang khởi động lại hoặc chưa phản hồi (502 Bad Gateway). Vui lòng thử lại sau vài giây!' };
          } else if (response.status === 504) {
            data = { message: 'Kết nối máy chủ quá hạn (504 Gateway Timeout). Vui lòng thử lại!' };
          } else {
            data = { message: `Lỗi kết nối máy chủ (${response.status} ${response.statusText || 'Error'})` };
          }
        } else {
          data = { message: text };
        }
      }

      if (!response.ok) {
        // Auto refresh token if 401 Unauthorized and refresh token is available
        if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refreshtoken')) {
          const refreshToken = localStorage.getItem('cinestreams_refresh');
          if (refreshToken) {
            try {
              const refreshRes = await fetch(`${this.baseUrl}/auth/refreshtoken`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
              });
              if (refreshRes.ok) {
                const refreshData = await refreshRes.json();
                const newAccessToken = refreshData?.data?.accessToken || refreshData?.accessToken;
                if (newAccessToken) {
                  localStorage.setItem('cinestreams_token', newAccessToken);
                  const retryHeaders = this.getHeaders(options.headers as Record<string, any>);
                  retryHeaders['Authorization'] = `Bearer ${newAccessToken}`;
                  const retryRes = await fetch(url, {
                    ...options,
                    headers: retryHeaders,
                  });
                  if (retryRes.ok) {
                    const retryData = await retryRes.json();
                    const isSuccess = retryData?.success !== undefined
                      ? (retryData.success === 1 || retryData.success === true)
                      : true;
                    return {
                      success: isSuccess,
                      data: retryData?.data !== undefined ? retryData.data : retryData,
                      message: retryData?.message || 'Thao tác thành công!',
                    };
                  }
                }
              }
            } catch (refreshErr) {
              console.warn('[apiClient] Refresh token failed:', refreshErr);
            }
          }

          // Nếu 401 mà không thể làm mới token (hết hạn hoặc thiếu token hợp lệ)
          return {
            success: false,
            message: 'Phiên đăng nhập đã hết hạn hoặc thiếu quyền xác thực (401). Vui lòng đăng xuất và đăng nhập lại!',
            data: data?.data || null,
          };
        }

        const errorMessage =
          data?.message ||
          data?.error ||
          `Lỗi hệ thống (${response.status}): ${response.statusText}`;

        return {
          success: false,
          message: errorMessage,
          data: data?.data || null,
        };
      }

      // Spring Boot ResponseModel: success is 1 (success) or 0 (failure)
      const isSuccess = data?.success !== undefined
        ? (data.success === 1 || data.success === true)
        : true;

      return {
        success: isSuccess,
        data: data?.data !== undefined ? data.data : data,
        message: data?.message || (isSuccess ? 'Thao tác thành công!' : 'Thao tác không thành công!'),
      };
    } catch (err: any) {
      console.error(`[API Error ${endpoint}]:`, err);
      return {
        success: false,
        message: err.message || 'Không thể kết nối đến máy chủ API. Vui lòng kiểm tra lại kết nối mạng!',
      };
    }
  }

  private normalizeConfig(config?: RequestConfig | Record<string, string>): RequestConfig {
    if (!config) return {};
    if ('headers' in config || 'params' in config || 'signal' in config) {
      return config as RequestConfig;
    }
    return { headers: config as Record<string, string> };
  }

  get<T>(endpoint: string, config?: RequestConfig | Record<string, string>) {
    return this.request<T>(endpoint, { method: 'GET', ...this.normalizeConfig(config) });
  }

  post<T>(endpoint: string, body?: any, config?: RequestConfig | Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...this.normalizeConfig(config),
    });
  }

  put<T>(endpoint: string, body?: any, config?: RequestConfig | Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...this.normalizeConfig(config),
    });
  }

  patch<T>(endpoint: string, body?: any, config?: RequestConfig | Record<string, string>) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...this.normalizeConfig(config),
    });
  }

  delete<T>(endpoint: string, config?: RequestConfig | Record<string, string>) {
    return this.request<T>(endpoint, { method: 'DELETE', ...this.normalizeConfig(config) });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
export default apiClient;
