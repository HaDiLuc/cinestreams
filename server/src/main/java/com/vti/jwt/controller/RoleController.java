package com.vti.jwt.controller;

import com.vti.jwt.dto.request.AssignPermissionsRequest;
import com.vti.jwt.dto.request.AssignRolesToUserRequest;
import com.vti.jwt.dto.request.RoleRequest;
import com.vti.jwt.dto.response.ResponseModel;
import com.vti.jwt.model.Permission;
import com.vti.jwt.model.Role;
import com.vti.jwt.model.User;
import com.vti.jwt.repository.PermissionRepository;
import com.vti.jwt.repository.RoleRepository;
import com.vti.jwt.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    /**
     * 1. Lấy danh sách tất cả các Role kèm Permissions đã được gán
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('role:manage')")
    public ResponseEntity<ResponseModel<List<Role>>> getAllRoles() {
        List<Role> roles = roleRepository.findAll();
        return ResponseEntity.ok(ResponseModel.success(roles, "Lấy danh sách Role thành công!"));
    }

    /**
     * 2. Lấy thông tin chi tiết một Role theo ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('role:manage')")
    public ResponseEntity<ResponseModel<?>> getRoleById(@PathVariable String id) {
        return roleRepository.findById(id)
                .<ResponseEntity<ResponseModel<?>>>map(role -> ResponseEntity.ok(ResponseModel.success(role, "Tìm thấy Role!")))
                .orElseGet(() -> ResponseEntity.badRequest().body(ResponseModel.error("Không tìm thấy Role với id: " + id)));
    }

    /**
     * 3. Tạo mới một Role động và gán kèm danh sách Permissions
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('role:manage')")
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
        return ResponseEntity.ok(ResponseModel.success(saved, "Tạo Role động mới thành công!"));
    }

    /**
     * 4. Gán/cập nhật danh sách Permissions cho một Role cụ thể
     */
    @PutMapping("/{id}/permissions")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('role:manage')")
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
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('role:manage')")
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
            map.put("roles", u.getRoles() != null ? u.getRoles().stream().map(Role::getName).toList() : List.of());
            map.put("permissions", u.getPermissions() != null ? u.getPermissions().stream().map(Permission::getName).toList() : List.of());
            map.put("createdAt", u.getCreatedAt());
            return map;
        }).toList();
        return ResponseEntity.ok(ResponseModel.success(result, "Lấy danh sách người dùng thành công!"));
    }

    /**
     * 7. Xóa Role (không cho phép xóa ROLE_ADMIN mặc định)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('role:manage')")
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
        return ResponseEntity.ok(ResponseModel.success(null, "Xóa Role [" + role.getName() + "] thành công!"));
    }
}
