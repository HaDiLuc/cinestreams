package com.vti.jwt.controller;

import com.vti.jwt.dto.request.CategoryRequest;
import com.vti.jwt.dto.response.ResponseModel;
import com.vti.jwt.model.Category;
import com.vti.jwt.service.CategoryService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    /**
     * Lấy danh sách toàn bộ danh mục / thể loại phim
     */
    @GetMapping
    public ResponseEntity<ResponseModel<List<Category>>> getAllCategories() {
        List<Category> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(ResponseModel.success(categories, "Lấy danh sách danh mục thành công"));
    }

    /**
     * Lấy chi tiết danh mục theo ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<ResponseModel<Category>> getCategoryById(@PathVariable String id) {
        Category category = categoryService.getCategoryById(id);
        return ResponseEntity.ok(ResponseModel.success(category, "Lấy chi tiết danh mục thành công"));
    }

    /**
     * Tạo mới danh mục
     * Yêu cầu quyền: category:create
     */
    @PostMapping
    @PreAuthorize("hasAuthority('category:create')")
    public ResponseEntity<ResponseModel<Category>> createCategory(@Valid @RequestBody CategoryRequest request) {
        Category category = categoryService.createCategory(request);
        return ResponseEntity.ok(ResponseModel.success(category, "Tạo mới danh mục thành công"));
    }

    /**
     * Cập nhật danh mục
     * Yêu cầu quyền: category:update
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('category:update')")
    public ResponseEntity<ResponseModel<Category>> updateCategory(
            @PathVariable String id,
            @Valid @RequestBody CategoryRequest request) {
        Category category = categoryService.updateCategory(id, request);
        return ResponseEntity.ok(ResponseModel.success(category, "Cập nhật danh mục thành công"));
    }

    /**
     * Xóa danh mục
     * Yêu cầu quyền: category:delete
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('category:delete')")
    public ResponseEntity<ResponseModel<?>> deleteCategory(@PathVariable String id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.ok(ResponseModel.success(null, "Xóa danh mục thành công"));
    }
}
