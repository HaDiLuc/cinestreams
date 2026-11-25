package com.vti.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vti.jwt.dto.request.CategoryRequest;
import com.vti.jwt.dto.request.ProductRequest;
import com.vti.jwt.model.Category;
import com.vti.jwt.model.Product;
import com.vti.jwt.repository.CategoryRepository;
import com.vti.jwt.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ProductCategorySecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ProductRepository productRepository;

    private Category testCategory;
    private Product testProduct;

    @BeforeEach
    void setUp() {
        productRepository.deleteAll();
        categoryRepository.deleteAll();

        testCategory = categoryRepository.save(new Category("Laptop", "Các dòng máy tính xách tay"));
        testProduct = productRepository.save(new Product("MacBook Pro M3", "Apple MacBook", 2000.0, 10, testCategory));
    }

    @Test
    @DisplayName("1. Chưa đăng nhập gọi GET /api/products -> 401 Unauthorized")
    void testGetProductsUnauthenticated() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_USER", "category:read", "product:read"})
    @DisplayName("2. User có quyền product:read xem danh sách sản phẩm -> 200 OK")
    void testUserCanReadProducts() throws Exception {
        mockMvc.perform(get("/api/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1))
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_USER", "category:read", "product:read"})
    @DisplayName("3. User chỉ có quyền đọc gọi POST /api/categories -> 403 Forbidden")
    void testUserCannotCreateCategory() throws Exception {
        CategoryRequest request = new CategoryRequest("Điện thoại", "Smartphones");

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_USER", "category:read", "product:read"})
    @DisplayName("4. User chỉ có quyền đọc gọi POST /api/products -> 403 Forbidden")
    void testUserCannotCreateProduct() throws Exception {
        ProductRequest request = new ProductRequest("iPhone 15", "Apple", 1200.0, 5, testCategory.getId());

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN", "category:create", "product:create", "category:read", "product:read"})
    @DisplayName("5. Có quyền category:create và product:create tạo Category & Product -> 200 OK")
    void testCreateCategoryAndProductWithPermission() throws Exception {
        // Tạo Category
        CategoryRequest catRequest = new CategoryRequest("Máy tính bảng", "Tablets");
        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(catRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1))
                .andExpect(jsonPath("$.data.name").value("Máy tính bảng"));

        // Tạo Product
        ProductRequest prodRequest = new ProductRequest("iPad Pro", "Apple Tablet", 999.0, 15, testCategory.getId());
        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(prodRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1))
                .andExpect(jsonPath("$.data.name").value("iPad Pro"));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_MODERATOR", "category:update", "product:update"})
    @DisplayName("6. Moderator có quyền update cập nhật Product -> 200 OK")
    void testUpdateProductWithPermission() throws Exception {
        ProductRequest updateRequest = new ProductRequest("MacBook Pro M3 Pro", "Cấu hình cao cấp", 2500.0, 8, testCategory.getId());

        mockMvc.perform(put("/api/products/" + testProduct.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1))
                .andExpect(jsonPath("$.data.name").value("MacBook Pro M3 Pro"));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN", "product:delete"})
    @DisplayName("7. Admin có quyền product:delete xóa sản phẩm -> 200 OK")
    void testDeleteProductWithPermission() throws Exception {
        mockMvc.perform(delete("/api/products/" + testProduct.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));
    }
}
