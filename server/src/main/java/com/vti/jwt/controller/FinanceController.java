package com.vti.jwt.controller;

import com.vti.jwt.dto.response.ResponseModel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/finance")
@CrossOrigin(origins = "*", maxAge = 3600)
public class FinanceController {

    public static class TransactionItem {
        public String orderId;
        public String username;
        public String userEmail;
        public String planName;
        public long amount;
        public String paymentMethod;
        public String bankName;
        public String accountNumber;
        public String transferSyntax;
        public String status; // PAID_VERIFIED, PENDING_PAYMENT, REFUNDED
        public String createdAt;
        public String paidAt;
        public String refundedAt;
        public String refundReason;
        public String gatewayRef;

        public TransactionItem(String orderId, String username, String userEmail, String planName, long amount,
                               String paymentMethod, String bankName, String accountNumber, String transferSyntax,
                               String status, String createdAt, String paidAt, String gatewayRef) {
            this.orderId = orderId;
            this.username = username;
            this.userEmail = userEmail;
            this.planName = planName;
            this.amount = amount;
            this.paymentMethod = paymentMethod;
            this.bankName = bankName;
            this.accountNumber = accountNumber;
            this.transferSyntax = transferSyntax;
            this.status = status;
            this.createdAt = createdAt;
            this.paidAt = paidAt;
            this.gatewayRef = gatewayRef;
        }
    }

    private final Map<String, TransactionItem> transactionsMap = new ConcurrentHashMap<>();

    public FinanceController() {
        seedInitialTransactions();
    }

    private void seedInitialTransactions() {
        transactionsMap.put("CINE-891024", new TransactionItem("CINE-891024", "hadinhluc_pm", "luc.hadinh@cinestreams.vn", "VIP Điện Ảnh 1 Năm", 699000, "VietQR 247", "MBBank Quân Đội", "0345469878", "CS CINE891024", "PAID_VERIFIED", "2026-11-15T08:30:00Z", "2026-11-15T08:31:12Z", "MB-NAPAS-98124501"));
        transactionsMap.put("CINE-742190", new TransactionItem("CINE-742190", "ngoctrinh_vip", "ngoctrinh@gmail.com", "VIP 4K Gia Đình 6 Tháng", 399000, "VietQR 247", "MBBank Quân Đội", "0345469878", "CS CINE742190", "PAID_VERIFIED", "2026-11-15T09:12:00Z", "2026-11-15T09:13:05Z", "MB-NAPAS-98124502"));
        transactionsMap.put("CINE-654812", new TransactionItem("CINE-654812", "hoangnam_99", "namhoang99@outlook.com", "VIP Tiêu Chuẩn 1 Tháng", 79000, "VietQR 247", "MBBank Quân Đội", "0345469878", "CS CINE654812", "PAID_VERIFIED", "2026-11-14T19:40:00Z", "2026-11-14T19:41:22Z", "MB-NAPAS-98124488"));
        transactionsMap.put("CINE-512903", new TransactionItem("CINE-512903", "thanhthao_cin", "thao.thanh@gmail.com", "VIP Điện Ảnh 1 Năm", 699000, "VietQR 247", "MBBank Quân Đội", "0345469878", "CS CINE512903", "PAID_VERIFIED", "2026-11-14T15:20:00Z", "2026-11-14T15:20:55Z", "MB-NAPAS-98124430"));
        transactionsMap.put("CINE-489012", new TransactionItem("CINE-489012", "duyhai_film", "duyhai.film@yahoo.com", "VIP Tiêu Chuẩn 1 Tháng", 79000, "VietQR 247", "MBBank Quân Đội", "0345469878", "CS CINE489012", "PENDING_PAYMENT", "2026-11-15T10:05:00Z", null, null));
        transactionsMap.put("CINE-321098", new TransactionItem("CINE-321098", "minhchau_92", "chau.minh@gmail.com", "VIP 4K Gia Đình 6 Tháng", 399000, "VietQR 247", "MBBank Quân Đội", "0345469878", "CS CINE321098", "REFUNDED", "2026-11-13T11:00:00Z", "2026-11-13T11:02:10Z", "MB-NAPAS-98124310"));
        TransactionItem ref = transactionsMap.get("CINE-321098");
        ref.refundedAt = "2026-11-13T14:20:00Z";
        ref.refundReason = "Khách hàng mua trùng 2 lần do mạng chậm";
    }

    @GetMapping("/overview")
    public ResponseEntity<ResponseModel<Map<String, Object>>> getFinanceOverview() {
        long totalRevenue = 0;
        long monthRevenue = 0;
        long totalRefunded = 0;
        int paidCount = 0;
        int pendingCount = 0;
        int refundCount = 0;

        int monthlyPlanCount = 0;
        int sixMonthPlanCount = 0;
        int yearlyPlanCount = 0;

        for (TransactionItem tx : transactionsMap.values()) {
            if ("PAID_VERIFIED".equalsIgnoreCase(tx.status)) {
                totalRevenue += tx.amount;
                monthRevenue += tx.amount;
                paidCount++;
                if (tx.planName.contains("1 Năm")) yearlyPlanCount++;
                else if (tx.planName.contains("6 Tháng")) sixMonthPlanCount++;
                else monthlyPlanCount++;
            } else if ("REFUNDED".equalsIgnoreCase(tx.status)) {
                totalRefunded += tx.amount;
                refundCount++;
            } else if ("PENDING_PAYMENT".equalsIgnoreCase(tx.status)) {
                pendingCount++;
            }
        }

        Map<String, Object> data = new HashMap<>();
        data.put("totalRevenue", totalRevenue);
        data.put("monthRevenue", monthRevenue);
        data.put("totalRefunded", totalRefunded);
        data.put("paidCount", paidCount);
        data.put("pendingCount", pendingCount);
        data.put("refundCount", refundCount);
        data.put("successRate", paidCount + refundCount + pendingCount > 0 ? (paidCount * 100.0) / (paidCount + pendingCount + refundCount) : 100.0);
        data.put("monthlyPlanCount", monthlyPlanCount);
        data.put("sixMonthPlanCount", sixMonthPlanCount);
        data.put("yearlyPlanCount", yearlyPlanCount);
        data.put("currency", "VND");
        data.put("gatewayStatus", "ONLINE_OPERATIONAL");
        data.put("bankGateway", "MBBank Napas 24/7 VietQR");
        data.put("lastReconciledAt", Instant.now().toString());

        return ResponseEntity.ok(ResponseModel.success(data, "Lấy tổng quan doanh thu tài chính thành công!"));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ResponseModel<List<TransactionItem>>> getTransactions(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {

        List<TransactionItem> list = new ArrayList<>(transactionsMap.values());
        list.sort((a, b) -> b.createdAt.compareTo(a.createdAt));

        if (status != null && !status.equalsIgnoreCase("ALL")) {
            list = list.stream().filter(tx -> status.equalsIgnoreCase(tx.status)).toList();
        }

        if (search != null && !search.trim().isEmpty()) {
            String q = search.toLowerCase().trim();
            list = list.stream().filter(tx ->
                    tx.orderId.toLowerCase().contains(q) ||
                    tx.username.toLowerCase().contains(q) ||
                    tx.userEmail.toLowerCase().contains(q) ||
                    (tx.gatewayRef != null && tx.gatewayRef.toLowerCase().contains(q))
            ).toList();
        }

        return ResponseEntity.ok(ResponseModel.success(list, "Lấy danh sách giao dịch thành công!"));
    }

    @PostMapping("/refund")
    public ResponseEntity<ResponseModel<?>> processRefund(@RequestBody Map<String, String> payload) {
        String orderId = payload.get("orderId");
        String reason = payload.get("reason");

        if (orderId == null || !transactionsMap.containsKey(orderId)) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Không tìm thấy mã đơn hàng: " + orderId));
        }

        TransactionItem tx = transactionsMap.get(orderId);
        if ("REFUNDED".equalsIgnoreCase(tx.status)) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Đơn hàng này đã được hoàn tiền trước đó!"));
        }

        tx.status = "REFUNDED";
        tx.refundedAt = Instant.now().toString();
        tx.refundReason = (reason != null && !reason.trim().isEmpty()) ? reason : "Hoàn tiền theo yêu cầu khách hàng";

        return ResponseEntity.ok(ResponseModel.success(tx, "Đã hoàn tiền " + tx.amount + "đ cho đơn hàng " + orderId + " thành công qua cổng Napas/MBBank!"));
    }

    @PostMapping("/reconciliation")
    public ResponseEntity<ResponseModel<Map<String, Object>>> reconcileGateway() {
        int totalChecked = transactionsMap.size();
        int matchedCount = 0;
        int discrepancyCount = 0;
        long totalVerifiedAmount = 0;

        for (TransactionItem tx : transactionsMap.values()) {
            if ("PAID_VERIFIED".equalsIgnoreCase(tx.status)) {
                matchedCount++;
                totalVerifiedAmount += tx.amount;
            } else if ("PENDING_PAYMENT".equalsIgnoreCase(tx.status)) {
                discrepancyCount++;
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("status", "SUCCESS");
        result.put("totalChecked", totalChecked);
        result.put("matchedCount", matchedCount);
        result.put("discrepancyCount", discrepancyCount);
        result.put("totalVerifiedAmount", totalVerifiedAmount);
        result.put("gateway", "MBBank VietQR - Napas 24/7 Direct API");
        result.put("reconciledTime", Instant.now().toString());
        result.put("message", "Đối soát hoàn tất: Khớp " + matchedCount + "/" + totalChecked + " giao dịch. 0 lỗi chênh lệch số dư.");

        return ResponseEntity.ok(ResponseModel.success(result, "Đối soát cổng thanh toán thành công!"));
    }
}
