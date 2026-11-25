package com.vti.jwt.controller;

import com.vti.jwt.dto.request.ProductRequest;
import com.vti.jwt.dto.response.ResponseModel;
import com.vti.jwt.model.Product;
import com.vti.jwt.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    /**
     * Lấy danh sách toàn bộ sản phẩm
     * Yêu cầu quyền: product:read
     */
    @GetMapping
    @PreAuthorize("hasAuthority('product:read')")
    public ResponseEntity<ResponseModel<List<Product>>> getAllProducts() {
        List<Product> products = productService.getAllProducts();
        return ResponseEntity.ok(ResponseModel.success(products, "Lấy danh sách sản phẩm thành công"));
    }

    /**
     * Lấy chi tiết sản phẩm theo ID
     * Yêu cầu quyền: product:read
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product:read')")
    public ResponseEntity<ResponseModel<Product>> getProductById(@PathVariable String id) {
        Product product = productService.getProductById(id);
        return ResponseEntity.ok(ResponseModel.success(product, "Lấy chi tiết sản phẩm thành công"));
    }

    /**
     * Lấy danh sách sản phẩm theo Category ID
     * Yêu cầu quyền: product:read
     */
    @GetMapping("/category/{categoryId}")
    @PreAuthorize("hasAuthority('product:read')")
    public ResponseEntity<ResponseModel<List<Product>>> getProductsByCategory(@PathVariable String categoryId) {
        List<Product> products = productService.getProductsByCategoryId(categoryId);
        return ResponseEntity.ok(ResponseModel.success(products, "Lấy danh sách sản phẩm theo danh mục thành công"));
    }

    /**
     * Tạo mới sản phẩm
     * Yêu cầu quyền: product:create
     */
    @PostMapping
    @PreAuthorize("hasAuthority('product:create')")
    public ResponseEntity<ResponseModel<Product>> createProduct(@Valid @RequestBody ProductRequest request) {
        Product product = productService.createProduct(request);
        return ResponseEntity.ok(ResponseModel.success(product, "Tạo mới sản phẩm thành công"));
    }

    /**
     * Cập nhật sản phẩm
     * Yêu cầu quyền: product:update
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product:update')")
    public ResponseEntity<ResponseModel<Product>> updateProduct(
            @PathVariable String id,
            @Valid @RequestBody ProductRequest request) {
        Product product = productService.updateProduct(id, request);
        return ResponseEntity.ok(ResponseModel.success(product, "Cập nhật sản phẩm thành công"));
    }

    /**
     * Xóa sản phẩm
     * Yêu cầu quyền: product:delete
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product:delete')")
    public ResponseEntity<ResponseModel<?>> deleteProduct(@PathVariable String id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok(ResponseModel.success(null, "Xóa sản phẩm thành công"));
    }
}
