import { useState, useEffect } from 'react';

/**
 * Hook hỗ trợ hoãn thực thi (debounce) giá trị nhập vào,
 * tối ưu cho ô tìm kiếm phim theo thời gian thực (real-time search) tránh gọi API liên tục.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

