/**
 * CineStreams Chunked Video Uploader Utility
 * Cắt nhỏ file ở Client -> Gửi tuần tự -> Ghép file bằng Stream ở Backend
 */

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB per chunk

export interface UploadProgressInfo {
  percent: number;
  completedChunks: number;
  totalChunks: number;
  speedMb: number;
  etaSecs: number;
  uploadedBytes: number;
  totalBytes: number;
}

export interface ChunkUploadOptions {
  file: File;
  movieId: string;
  episodeNumber?: number;
  episodeId?: string;
  token?: string;
  uploadId?: string;
  onProgress?: (percent: number, info: UploadProgressInfo) => void;
  onStatusChange?: (status: 'uploading' | 'merging' | 'completed' | 'error', message: string) => void;
  signal?: AbortSignal;
  maxRetries?: number;
}

export interface MergeResponseData {
  success: boolean;
  uploadId: string;
  videoId: string;
  movieId: string;
  episodeId?: string;
  status: string;
  fileName: string;
  fileSize: number;
  message: string;
}

/**
 * Tải lên video theo cơ chế Chunking tuần tự & kích hoạt ghép file
 */
export async function uploadVideoChunks(options: ChunkUploadOptions): Promise<MergeResponseData> {
  const {
    file,
    movieId,
    episodeNumber,
    episodeId,
    token,
    onProgress,
    onStatusChange,
    signal,
    maxRetries = 3,
  } = options;

  // 1. Khởi tạo thông tin phiên upload
  const uploadId = options.uploadId || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  const startTime = Date.now();
  let bytesUploaded = 0;

  onStatusChange?.('uploading', `Bắt đầu tải lên ${totalChunks} chunks (5MB/chunk)...`);

  // 2. Vòng lặp gửi tuần tự từng chunk
  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) {
      throw new DOMException('Phiên tải lên đã bị tạm dừng hoặc hủy bởi người dùng.', 'AbortError');
    }

    const startByte = i * CHUNK_SIZE;
    const endByte = Math.min(startByte + CHUNK_SIZE, file.size);
    const chunkBlob = file.slice(startByte, endByte);

    let attempt = 0;
    let chunkUploaded = false;
    let lastError: any = null;

    while (attempt < maxRetries && !chunkUploaded) {
      if (signal?.aborted) {
        throw new DOMException('Phiên tải lên đã bị tạm dừng hoặc hủy bởi người dùng.', 'AbortError');
      }

      attempt++;
      try {
        const formData = new FormData();
        formData.append('file', chunkBlob, `chunk_${i}`);
        formData.append('uploadId', uploadId);
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', totalChunks.toString());

        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/admin/videos/upload-chunk', {
          method: 'POST',
          body: formData,
          headers,
          signal,
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.message || `Mã lỗi HTTP ${response.status}: ${response.statusText}`);
        }

        const resData = await response.json().catch(() => ({ success: true }));
        if (resData.success === false) {
          throw new Error(resData.message || `Lỗi lưu chunk ${i}`);
        }

        chunkUploaded = true;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          throw err;
        }
        lastError = err;
        console.warn(`[ChunkUploader] Lỗi gửi chunk ${i} (Lần thử ${attempt}/${maxRetries}):`, err.message);
        if (attempt < maxRetries) {
          // Chờ 1 giây trước khi thử lại
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    if (!chunkUploaded) {
      const errMsg = `Lỗi gián đoạn mạng khi tải chunk ${i + 1}/${totalChunks}: ${lastError?.message || 'Không có kết nối mạng'}`;
      onStatusChange?.('error', errMsg);
      throw new Error(errMsg);
    }

    bytesUploaded += chunkBlob.size;
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    const speedMb = elapsedSeconds > 0 ? (bytesUploaded / (1024 * 1024)) / elapsedSeconds : 0;
    const remainingBytes = file.size - bytesUploaded;
    const etaSecs = speedMb > 0 ? Math.round(remainingBytes / (speedMb * 1024 * 1024)) : 0;
    const percent = Math.round(((i + 1) / totalChunks) * 100);

    onProgress?.(percent, {
      percent,
      completedChunks: i + 1,
      totalChunks,
      speedMb: parseFloat(speedMb.toFixed(1)),
      etaSecs,
      uploadedBytes: bytesUploaded,
      totalBytes: file.size,
    });
  }

  // 3. Toàn bộ chunks đã gửi thành công -> Kích hoạt Ghép file & Transcode HLS ngầm
  onStatusChange?.('merging', 'Đang ghép file và xử lý HLS trên máy chủ, vui lòng đợi...');

  const mergeHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    mergeHeaders['Authorization'] = `Bearer ${token}`;
  }

  const mergePayload = {
    uploadId,
    fileName: file.name,
    totalChunks,
    movieId,
    ...(episodeNumber ? { episodeNumber } : {}),
    ...(episodeId ? { episodeId } : {}),
  };

  try {
    const mergeResponse = await fetch('/api/admin/videos/merge-chunks', {
      method: 'POST',
      headers: mergeHeaders,
      body: JSON.stringify(mergePayload),
      signal,
    });

    if (!mergeResponse.ok) {
      const errJson = await mergeResponse.json().catch(() => ({}));
      throw new Error(errJson.message || `Lỗi ghép file: HTTP ${mergeResponse.status}`);
    }

    const mergeResult: MergeResponseData = await mergeResponse.json();
    onStatusChange?.('completed', 'Ghép file thành công! Đã chuyển sang luồng nén HLS ngầm.');
    return mergeResult;
  } catch (err: any) {
    const errMsg = `Lỗi trong quá trình ghép file trên máy chủ: ${err?.message || 'Không xác định'}`;
    onStatusChange?.('error', errMsg);
    throw new Error(errMsg);
  }
}

