package com.vti.jwt.controller;

import com.vti.jwt.dto.response.ResponseModel;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/test")
public class TestController {

    // ==========================================
    // 1. PUBLIC ENDPOINT (Không cần Token)
    // ==========================================
    @GetMapping("/public")
    public ResponseModel<String> allAccess() {
        return ResponseModel.success("Public Content - Anyone can view this.", "Lấy dữ liệu public thành công");
    }

    // ==========================================
    // 2. ROLE-BASED ACCESS CONTROL (RBAC Cấp 1)
    // ==========================================
    @GetMapping("/user")
    @PreAuthorize("hasRole('FREE_USER') or hasRole('VIP_USER') or hasRole('CONTENT_EDITOR') or hasRole('FINANCE_MANAGER') or hasRole('ADMIN')")
    public ResponseModel<String> userAccess() {
        return ResponseModel.success("User Content - Requires valid JWT token with CineStreams Roles.", "Xác thực user thành công");
    }

    @GetMapping("/editor")
    @PreAuthorize("hasRole('CONTENT_EDITOR') or hasRole('ADMIN')")
    public ResponseModel<String> editorAccess() {
        return ResponseModel.success("Content Editor Board - Requires ROLE_CONTENT_EDITOR or ROLE_ADMIN.", "Truy cập quyền Content Editor thành công");
    }

    @GetMapping("/finance")
    @PreAuthorize("hasRole('FINANCE_MANAGER') or hasRole('ADMIN')")
    public ResponseModel<String> financeAccess() {
        return ResponseModel.success("Finance Manager Board - Requires ROLE_FINANCE_MANAGER or ROLE_ADMIN.", "Truy cập quyền Finance Manager thành công");
    }

    @GetMapping("/vip")
    @PreAuthorize("hasRole('VIP_USER') or hasRole('ADMIN')")
    public ResponseModel<String> vipAccess() {
        return ResponseModel.success("VIP Member Board - Requires ROLE_VIP_USER or ROLE_ADMIN.", "Truy cập quyền VIP Member thành công");
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseModel<String> adminAccess() {
        return ResponseModel.success("Admin Board - Requires ROLE_ADMIN.", "Truy cập quyền Admin thành công");
    }

    // ==========================================
    // 3. PERMISSION-BASED ACCESS CONTROL (Fine-grained)
    // ==========================================

    /**
     * Quyền ĐỌC (user:read):
     * Cả ROLE_USER, ROLE_MODERATOR, ROLE_ADMIN đều có quyền này.
     */
    @GetMapping("/permission/read")
    @PreAuthorize("hasAuthority('user:read')")
    public ResponseModel<String> readPermission() {
        return ResponseModel.success("Data read successfully.", "Kiểm tra quyền [user:read] thành công (USER, MODERATOR, ADMIN)");
    }

    /**
     * Quyền TẠO (user:create):
     * Chỉ ROLE_ADMIN mới có quyền này. (ROLE_USER và ROLE_MODERATOR sẽ bị 403 Forbidden)
     */
    @PostMapping("/permission/create")
    @PreAuthorize("hasAuthority('user:create')")
    public ResponseModel<String> createPermission() {
        return ResponseModel.success("Resource created successfully.", "Kiểm tra quyền [user:create] thành công (Chỉ ADMIN)");
    }

    /**
     * Quyền CẬP NHẬT (user:update):
     * Cả ROLE_MODERATOR và ROLE_ADMIN có quyền này. (ROLE_USER sẽ bị 403 Forbidden)
     */
    @PutMapping("/permission/update")
    @PreAuthorize("hasAuthority('user:update')")
    public ResponseModel<String> updatePermission() {
        return ResponseModel.success("Resource updated successfully.", "Kiểm tra quyền [user:update] thành công (MODERATOR và ADMIN)");
    }

    /**
     * Quyền XÓA (user:delete):
     * Chỉ ROLE_ADMIN mới có quyền này. (ROLE_USER và ROLE_MODERATOR sẽ bị 403 Forbidden)
     */
    @DeleteMapping("/permission/delete")
    @PreAuthorize("hasAuthority('user:delete')")
    public ResponseModel<String> deletePermission() {
        return ResponseModel.success("Resource deleted successfully.", "Kiểm tra quyền [user:delete] thành công (Chỉ ADMIN)");
    }

    /**
     * Kiểm tra nhiều Permission (hasAnyAuthority):
     * Cho phép truy cập nếu có ít nhất một trong các quyền [user:update] hoặc [user:delete].
     */
    @GetMapping("/permission/manage")
    @PreAuthorize("hasAnyAuthority('user:update', 'user:delete')")
    public ResponseModel<String> managePermission() {
        return ResponseModel.success("Access granted to management area.", "Kiểm tra hasAnyAuthority('user:update', 'user:delete') thành công (MODERATOR và ADMIN)");
    }

    /**
     * Kết hợp cả Role và Permission:
     * Cho phép nếu có ROLE_ADMIN HOẶC có quyền [user:update].
     */
    @GetMapping("/permission/combined")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('user:update')")
    public ResponseModel<String> combinedRoleAndPermission() {
        return ResponseModel.success("Combined check passed.", "Kiểm tra kết hợp hasRole('ADMIN') or hasAuthority('user:update') thành công");
    }
}
