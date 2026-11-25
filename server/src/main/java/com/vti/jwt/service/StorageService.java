package com.vti.jwt.service;

import java.io.File;

public interface StorageService {

    /**
     * Lưu trữ toàn bộ thư mục HLS (chứa master.m3u8, các thư mục profile, seg_xxx.ts)
     * @param hlsDirectory Thư mục cục bộ chứa các file HLS
     * @param relativePathPrefix Tiền tố đường dẫn (ví dụ: {movieId}/hls/{videoId})
     * @return URL truy cập tới file master.m3u8
     */
    String storeHlsDirectory(File hlsDirectory, String relativePathPrefix);

    /**
     * Lưu trữ file đơn lẻ (ví dụ: thumbnail, subtitle, raw video)
     * @param file File cần lưu
     * @param targetRelativePath Đường dẫn đích tương đối
     * @return URL truy cập tới file
     */
    String storeFile(File file, String targetRelativePath);

    /**
     * Lấy URL công khai của file theo đường dẫn tương đối
     * @param relativePath Đường dẫn tương đối
     * @return URL công khai
     */
    String getPublicUrl(String relativePath);

    /**
     * Xóa file hoặc thư mục lưu trữ
     * @param relativePath Đường dẫn tương đối
     * @return true nếu xóa thành công
     */
    boolean delete(String relativePath);
}

