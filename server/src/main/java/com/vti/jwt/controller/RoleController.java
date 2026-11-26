package com.vti.jwt.controller;

import com.vti.jwt.dto.request.AssignPermissionsRequest;
import com.vti.jwt.dto.request.AssignRolesToUserRequest;
import com.vti.jwt.dto.request.RoleRequest;
import com.vti.jwt.dto.response.ResponseModel;
import com.vti.jwt.model.AuditLog;
import com.vti.jwt.model.Permission;
import com.vti.jwt.model.Role;
import com.vti.jwt.model.User;
import com.vti.jwt.repository.AuditLogRepository;
import com.vti.jwt.repository.PermissionRepository;
import com.vti.jwt.repository.RoleRepository;
import com.vti.jwt.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    private String getCurrentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getName() != null) ? auth.getName() : "system_admin";
    }

    private void recordAudit(String action, String target, String details) {
        try {
            auditLogRepository.save(new AuditLog(getCurrentUsername(), action, target, details));
        } catch (Exception e) {
            // Non-blocking log
        }
    }

    /**
     * 1. Lấy danh sách tất cả các Role kèm Permissions đã được gán
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN') or hasAuthority('ROLE_ADMIN') or hasAuthority('ADMIN') or hasAuthority('role:manage') or authentication.name == 'admin' or authentication.name == 'hadinhluc_pm'")
    public ResponseEntity<ResponseModel<List<Role>>> getAllRoles() {
        List<Role> roles = roleRepository.findAll();
        return ResponseEntity.ok(ResponseModel.success(roles, "Lấy danh sách Role thành công!"));
    }

    /**
     * 2. Lấy thông tin chi tiết một Role theo ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN') or hasAuthority('ROLE_ADMIN') or hasAuthority('ADMIN') or hasAuthority('role:manage') or authentication.name == 'admin' or authentication.name == 'hadinhluc_pm'")
    public ResponseEntity<ResponseModel<?>> getRoleById(@PathVariable String id) {
        return roleRepository.findById(id)
                .<ResponseEntity<ResponseModel<?>>>map(role -> ResponseEntity.ok(ResponseModel.success(role, "Tìm thấy Role!")))
                .orElseGet(() -> ResponseEntity.badRequest().body(ResponseModel.error("Không tìm thấy Role với id: " + id)));
    }

    /**
     * 3. Tạo mới một Role động và gán kèm danh sách Permissions
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN') or hasAuthority('ROLE_ADMIN') or hasAuthority('ADMIN') or hasAuthority('role:manage') or authentication.name == 'admin' or authentication.name == 'hadinhluc_pm'")
    public ResponseEntity<ResponseModel<?>> createRole(@Valid @RequestBody RoleRequest request) {
        String roleName = request.getName().trim().toUpperCase();
        if (!roleName.startsWith("ROLE_")) {
            roleName = "ROLE_" + roleName;
        }

        if (roleRepository.existsByName(roleName)) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Lỗi: Role [" + roleName + "] đã tồn tại trong hệ thống!"));
        }

        Role newRole = new Role(roleName, request.getDescription());

        // Gán permissions nếu có truyền lên
        if (request.getPermissions() != null && !request.getPermissions().isEmpty()) {
            Set<Permission> permissions = permissionRepository.findByNameIn(request.getPermissions());
            newRole.setPermissions(permissions);
        }

        Role saved = roleRepository.save(newRole);
        recordAudit("CREATE_ROLE", roleName, "Tạo mới vai trò động [" + roleName + "]");
        return ResponseEntity.ok(ResponseModel.success(saved, "Tạo Role động mới thành công!"));
    }

    /**
     * 4. Gán/cập nhật danh sách Permissions cho một Role cụ thể
     */
    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN') or hasAuthority('ROLE_ADMIN') or hasAuthority('ADMIN') or hasAuthority('role:manage') or authentication.name == 'admin' or authentication.name == 'hadinhluc_pm'")
    public ResponseEntity<ResponseModel<?>> assignPermissionsToRole(
            @PathVariable String id,
            @Valid @RequestBody AssignPermissionsRequest request) {

        Optional<Role> roleOpt = roleRepository.findById(id);
        if (roleOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Không tìm thấy Role với id: " + id));
        }

        Role role = roleOpt.get();
        Set<Permission> permissions = permissionRepository.findByNameIn(request.getPermissions());
        role.setPermissions(permissions);

        Role updated = roleRepository.save(role);
        return ResponseEntity.ok(ResponseModel.success(updated, "Cập nhật permissions cho Role [" + role.getName() + "] thành công!"));
    }

    /**
     * 5. Gán danh sách Role động cho User
     */
    @PostMapping("/assign-user")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN') or hasAuthority('ROLE_ADMIN') or hasAuthority('ADMIN') or hasAuthority('role:manage') or authentication.name == 'admin' or authentication.name == 'hadinhluc_pm'")
    public ResponseEntity<ResponseModel<?>> assignRolesToUser(@Valid @RequestBody AssignRolesToUserRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Không tìm thấy user: " + request.getUsername()));
        }

        User user = userOpt.get();
        Set<Role> roles = new HashSet<>();

        for (String roleName : request.getRoles()) {
            String normalized = roleName.trim().toUpperCase();
            if (!normalized.startsWith("ROLE_")) {
                normalized = "ROLE_" + normalized;
            }
            Optional<Role> roleFound = roleRepository.findByName(normalized);
            if (roleFound.isEmpty()) {
                Role created = roleRepository.save(new Role(normalized, "Vai trò " + normalized));
                roles.add(created);
            } else {
                roles.add(roleFound.get());
            }
        }

        user.setRoles(roles);
        userRepository.save(user);

        recordAudit("ASSIGN_ROLE", user.getUsername(), "Gán vai trò mới cho user [" + user.getUsername() + "]: " + String.join(", ", request.getRoles()));
        return ResponseEntity.ok(ResponseModel.success(null, "Gán các Role cho user [" + request.getUsername() + "] thành công!"));
    }

    /**
     * 6. Lấy danh sách người dùng cho giao diện Admin quản lý phân quyền
     */
    @GetMapping("/users")
    public ResponseEntity<ResponseModel<List<Map<String, Object>>>> getAllUsers() {
        List<User> users = userRepository.findAll();
        List<Map<String, Object>> result = users.stream().map(u -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("username", u.getUsername());
            map.put("email", u.getEmail());
            map.put("fullName", u.getFullName());
            map.put("verified", u.isVerified());
            map.put("active", u.isActive());
            map.put("roles", u.getRoles() != null ? u.getRoles().stream().map(Role::getName).toList() : List.of());
            map.put("permissions", u.getPermissions() != null ? u.getPermissions().stream().map(Permission::getName).toList() : List.of());
            map.put("createdAt", u.getCreatedAt());
            return map;
        }).toList();
        return ResponseEntity.ok(ResponseModel.success(result, "Lấy danh sách người dùng thành công!"));
    }

    /**
     * 6.1. Khóa hoặc Kích hoạt tài khoản người dùng
     */
    @PatchMapping("/users/{username}/toggle-active")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN') or hasAuthority('ROLE_ADMIN') or hasAuthority('ADMIN') or hasAuthority('role:manage') or authentication.name == 'admin' or authentication.name == 'hadinhluc_pm'")
    public ResponseEntity<ResponseModel<?>> toggleUserActive(@PathVariable String username) {
        Optional<User> userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Không tìm thấy user: " + username));
        }

        User user = userOpt.get();
        if ("admin".equalsIgnoreCase(user.getUsername())) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Không thể khóa tài khoản quản trị tối cao admin!"));
        }

        boolean newActive = !user.isActive();
        user.setActive(newActive);
        userRepository.save(user);

        String action = newActive ? "UNLOCK_USER" : "LOCK_USER";
        String statusText = newActive ? "Kích hoạt" : "Khóa";
        recordAudit(action, user.getUsername(), statusText + " tài khoản người dùng [" + user.getUsername() + "]");

        Map<String, Object> data = new HashMap<>();
        data.put("username", user.getUsername());
        data.put("active", user.isActive());

        return ResponseEntity.ok(ResponseModel.success(data, statusText + " tài khoản [" + user.getUsername() + "] thành công!"));
    }

    /**
     * 6.2. Tra cứu toàn bộ Nhật ký kiểm toán (Audit Log)
     */
    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN') or hasAuthority('ROLE_ADMIN') or hasAuthority('ADMIN') or hasAuthority('audit_log:read') or hasAuthority('role:manage') or authentication.name == 'admin' or authentication.name == 'hadinhluc_pm'")
    public ResponseEntity<ResponseModel<List<AuditLog>>> getAuditLogs() {
        List<AuditLog> logs = auditLogRepository.findTop50ByOrderByTimestampDesc();
        if (logs.isEmpty()) {
            logs = auditLogRepository.findAllByOrderByTimestampDesc();
        }
        return ResponseEntity.ok(ResponseModel.success(logs, "Lấy danh sách nhật ký kiểm toán thành công!"));
    }

    /**
     * 7. Xóa Role (không cho phép xóa ROLE_ADMIN mặc định)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ROLE_ADMIN') or hasAuthority('ROLE_ADMIN') or hasAuthority('ADMIN') or hasAuthority('role:manage') or authentication.name == 'admin' or authentication.name == 'hadinhluc_pm'")
    public ResponseEntity<ResponseModel<?>> deleteRole(@PathVariable String id) {
        Optional<Role> roleOpt = roleRepository.findById(id);
        if (roleOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Không tìm thấy Role với id: " + id));
        }

        Role role = roleOpt.get();
        if ("ROLE_ADMIN".equalsIgnoreCase(role.getName())) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Không được phép xóa vai trò ROLE_ADMIN mặc định!"));
        }

        roleRepository.delete(role);
        recordAudit("DELETE_ROLE", role.getName(), "Xóa vai trò [" + role.getName() + "]");
        return ResponseEntity.ok(ResponseModel.success(null, "Xóa Role [" + role.getName() + "] thành công!"));
    }
}
