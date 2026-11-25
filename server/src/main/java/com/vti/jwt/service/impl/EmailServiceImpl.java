package com.vti.jwt.service.impl;

import com.vti.jwt.model.OtpType;
import com.vti.jwt.service.EmailService;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Service xử lý tạo và gửi Email bất đồng bộ (Non-blocking Asynchronous) qua Gmail SMTP.
 * Sử dụng mailTaskExecutor chuyên dụng từ AsyncConfig để không ảnh hưởng đến HTTP worker thread.
 */
@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailServiceImpl.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@cinestreams.vn}")
    private String fromEmail;

    @Override
    @Async("mailTaskExecutor")
    public void sendVerificationEmail(String toEmail, String username, String code) {
        sendOtpEmail(toEmail, username, code, OtpType.REGISTER, 5);
    }

    /**
     * Gửi email mã OTP bất đồng bộ với định dạng HTML chuẩn phong cách Dark/Red của CineStreams
     *
     * @param toEmail       Email người nhận
     * @param username      Tên hiển thị người dùng
     * @param code          Mã OTP 6 số
     * @param type          Mục đích gửi OTP (REGISTER, LOGIN, FORGOT_PASSWORD, ...)
     * @param expiryMinutes Thời gian hết hạn của OTP (thường là 5 phút)
     */
    @Override
    @Async("mailTaskExecutor")
    public void sendOtpEmail(String toEmail, String username, String code, OtpType type, int expiryMinutes) {
        String actionTitle;
        String actionDescription;

        switch (type) {
            case REGISTER:
                actionTitle = "Kích Hoạt Tài Khoản CineStreams";
                actionDescription = "Chào mừng bạn đến với CineStreams! Bạn đang tiến hành kích hoạt tài khoản xem phim trực tuyến mới.";
                break;
            case LOGIN:
            case LOGIN_2FA:
                actionTitle = "Xác Thực Đăng Nhập 2 Lớp (2FA)";
                actionDescription = "Hệ thống phát hiện yêu cầu đăng nhập vào tài khoản CineStreams của bạn.";
                break;
            case FORGOT_PASSWORD:
            case FORGOT_PWD:
                actionTitle = "Đặt Lại Mật Khẩu CineStreams";
                actionDescription = "Bạn đã gửi yêu cầu cấp lại mật khẩu cho tài khoản CineStreams của mình.";
                break;
            default:
                actionTitle = "Mã Xác Thực Bảo Mật";
                actionDescription = "Mã xác thực dùng một lần phục vụ thao tác bảo mật trên tài khoản CineStreams của bạn.";
                break;
        }

        String subject = "[CineStreams] " + code + " là mã xác thực " + actionTitle + " của bạn";
        String htmlContent = buildCineStreamsDarkRedTemplate(username, code, actionTitle, actionDescription, expiryMinutes);

        try {
            if (mailSender == null) {
                logger.warn("[MOCK/FALLBACK] JavaMailSender chưa được nạp. Mã OTP cho [{}]: {}", toEmail, code);
                return;
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "CineStreams Security Center");
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("[mailTaskExecutor] Đã gửi thành công email OTP tới: {} (Loại: {})", toEmail, type);

        } catch (MessagingException e) {
            logger.error("Lỗi định dạng MimeMessage khi gửi tới {}: {}", toEmail, e.getMessage());
            logger.warn("[CONSOLE FALLBACK] Mã OTP dự phòng: {} cho {}", code, toEmail);
        } catch (Exception e) {
            logger.error("Không thể kết nối máy chủ Gmail SMTP: {}", e.getMessage());
            logger.warn("[CONSOLE FALLBACK] Mã OTP dự phòng: {} cho {}", code, toEmail);
        }
    }

    /**
     * Tạo template Email HTML chuyên nghiệp, phong cách Dark/Red hiện đại của nền tảng xem phim CineStreams
     */
    private String buildCineStreamsDarkRedTemplate(
            String username,
            String code,
            String actionTitle,
            String actionDescription,
            int expiryMinutes) {

        String displayName = (username != null && !username.isBlank()) ? username : "Khán giả CineStreams";

        return "<!DOCTYPE html>"
                + "<html lang='vi'>"
                + "<head>"
                + "  <meta charset='UTF-8'>"
                + "  <meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                + "  <title>" + actionTitle + "</title>"
                + "  <style>"
                + "    body { margin: 0; padding: 0; background-color: #0b0c10; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e5e7eb; -webkit-font-smoothing: antialiased; }"
                + "    .wrapper { width: 100%; background-color: #0b0c10; padding: 40px 10px; }"
                + "    .container { max-width: 580px; margin: 0 auto; background: linear-gradient(180deg, #16181f 0%, #111217 100%); border: 1px solid #2a1b22; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 45px rgba(0,0,0,0.85); }"
                + "    .brand-header { background: radial-gradient(circle at center, #780811 0%, #200407 100%); padding: 36px 20px 26px; text-align: center; border-bottom: 2px solid #e50914; }"
                + "    .brand-title { font-size: 30px; font-weight: 900; letter-spacing: 5px; color: #ffffff; text-transform: uppercase; margin: 0; text-shadow: 0 2px 10px rgba(229,9,20,0.5); }"
                + "    .brand-subtitle { font-size: 11px; font-weight: 600; letter-spacing: 2px; color: #ff8a93; margin-top: 8px; text-transform: uppercase; }"
                + "    .content { padding: 35px 32px; }"
                + "    .greeting { font-size: 18px; font-weight: 700; color: #ffffff; margin-bottom: 14px; }"
                + "    .description { font-size: 14px; line-height: 1.6; color: #9ca3af; margin-bottom: 25px; }"
                + "    .otp-card { background: linear-gradient(135deg, rgba(229, 9, 20, 0.12) 0%, rgba(20, 20, 26, 0.95) 100%); border: 1.5px solid #e50914; border-radius: 16px; padding: 26px 16px; text-align: center; margin: 26px 0; box-shadow: 0 0 30px rgba(229, 9, 20, 0.25); }"
                + "    .otp-label { font-size: 12px; font-weight: 700; letter-spacing: 2.5px; color: #f87171; text-transform: uppercase; margin-bottom: 10px; }"
                + "    .otp-digits { font-size: 44px; font-weight: 900; letter-spacing: 14px; color: #ffffff; font-family: 'Consolas', 'Courier New', monospace; text-shadow: 0 0 18px rgba(229, 9, 20, 0.85); padding-left: 14px; }"
                + "    .expiry-badge { display: inline-block; margin-top: 14px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.4); color: #fca5a5; font-size: 12px; font-weight: 600; padding: 5px 14px; border-radius: 999px; }"
                + "    .security-notice { background-color: #171821; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 18px; margin: 26px 0 15px; font-size: 13px; color: #d1d5db; line-height: 1.5; }"
                + "    .footer { background-color: #0b0c10; padding: 24px; text-align: center; font-size: 11px; color: #6b7280; border-top: 1px solid #1f222e; line-height: 1.6; }"
                + "  </style>"
                + "</head>"
                + "<body>"
                + "  <div class='wrapper'>"
                + "    <div class='container'>"
                + "      <div class='brand-header'>"
                + "        <div class='brand-title'>CINESTREAMS</div>"
                + "        <div class='brand-subtitle'>Nền Tảng Điện Ảnh Trực Tuyến 4K & Dolby Atmos</div>"
                + "      </div>"
                + "      <div class='content'>"
                + "        <div class='greeting'>Kính chào " + displayName + ",</div>"
                + "        <div class='description'>" + actionDescription + "<br>Vui lòng nhập mã xác thực OTP gồm 6 chữ số dưới đây vào hệ thống để tiếp tục:</div>"
                + "        <div class='otp-card'>"
                + "          <div class='otp-label'>Mã Xác Thực Bảo Mật (OTP)</div>"
                + "          <div class='otp-digits'>" + code + "</div>"
                + "          <div class='expiry-badge'>⏱ Mã có hiệu lực trong vòng " + expiryMinutes + " phút</div>"
                + "        </div>"
                + "        <div class='security-notice'>"
                + "          <strong> Cảnh báo an toàn:</strong> Tuyệt đối không tiết lộ mã xác thực này cho bất kỳ ai, bao gồm cả nhân viên hỗ trợ của CineStreams. Nếu bạn không gửi yêu cầu này, vui lòng bỏ qua email hoặc đổi mật khẩu tài khoản ngay lập tức."
                + "        </div>"
                + "      </div>"
                + "      <div class='footer'>"
                + "        © 2026 CineStreams Entertainment VN. Bản quyền thuộc về hệ thống rạp phim số CineStreams.<br>"
                + "        Email này được tạo tự động từ hệ thống bảo mật xác thực danh tính."
                + "      </div>"
                + "    </div>"
                + "  </div>"
                + "</body>"
                + "</html>";
    }
}
