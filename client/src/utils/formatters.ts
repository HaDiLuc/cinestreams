/**
 * Các hàm tiện ích định dạng dữ liệu hiển thị trên CineStreams
 */

/**
 * Định dạng tiền tệ VND (ví dụ: 99.000 đ)
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
}

/**
 * Định dạng thời lượng video từ giây sang phút:giây (ví dụ: 125s -> 02:05)
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Định dạng số lượt xem (ví dụ: 1250000 -> 1.25M)
 */
export function formatViews(views: number): string {
  if (views >= 1_000_000) {
    return (views / 1_000_000).toFixed(1) + 'M';
  }
  if (views >= 1_000) {
    return (views / 1_000).toFixed(1) + 'K';
  }
  return views.toString();
}

/**
 * Trích xuất số lượt xem dưới dạng số nguyên từ string hoặc number
 */
export function parseViewCount(views?: string | number | null): number {
  if (typeof views === 'number') return isNaN(views) ? 0 : views;
  if (!views || typeof views !== 'string') return 0;
  const clean = views.trim();
  if (/M/i.test(clean)) {
    const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 1_000_000);
  }
  if (/K/i.test(clean)) {
    const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 1_000);
  }
  const digitsOnly = clean.replace(/[^0-9]/g, '');
  const parsed = parseInt(digitsOnly, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Định dạng số lượt xem đầy đủ (ví dụ: 3.8M lượt xem, 450K lượt xem, hoặc 1.250 lượt xem)
 */
export function formatFullViews(views?: number | string | null): string {
  const count = typeof views === 'number' ? views : parseViewCount(views);
  if (count <= 0) return '0 lượt xem';
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M lượt xem`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(0)}K lượt xem`;
  }
  return `${count.toLocaleString('vi-VN')} lượt xem`;
}


