package com.vti.jwt.controller;

import com.vti.jwt.dto.request.PermissionRequest;
import com.vti.jwt.dto.response.ResponseModel;
import com.vti.jwt.model.Permission;
import com.vti.jwt.repository.PermissionRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/permissions")
public class PermissionController {

    @Autowired
    private PermissionRepository permissionRepository;

    /**
     * 1. Lấy danh sách tất cả các Permission có trong hệ thống
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('role:manage')")
    public ResponseEntity<ResponseModel<List<Permission>>> getAllPermissions() {
        List<Permission> list = permissionRepository.findAll();
        return ResponseEntity.ok(ResponseModel.success(list, "Lấy danh sách Permission thành công!"));
    }

    /**
     * 2. Tạo mới một Permission động
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('role:manage')")
    public ResponseEntity<ResponseModel<?>> createPermission(@Valid @RequestBody PermissionRequest request) {
        String permName = request.getName().trim().toLowerCase();

        if (permissionRepository.existsByName(permName)) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Lỗi: Permission [" + permName + "] đã tồn tại!"));
        }

        Permission permission = new Permission(permName, request.getDescription(), request.getModule());
        Permission saved = permissionRepository.save(permission);

        return ResponseEntity.ok(ResponseModel.success(saved, "Tạo Permission mới thành công!"));
    }

    /**
     * 3. Xóa Permission
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasAuthority('role:manage')")
    public ResponseEntity<ResponseModel<?>> deletePermission(@PathVariable String id) {
        Optional<Permission> permOpt = permissionRepository.findById(id);
        if (permOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(ResponseModel.error("Không tìm thấy Permission với id: " + id));
        }

        permissionRepository.delete(permOpt.get());
        return ResponseEntity.ok(ResponseModel.success(null, "Xóa Permission thành công!"));
    }
}
