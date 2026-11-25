package com.vti.jwt;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TestControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("1. Public endpoint không cần đăng nhập -> 200 OK")
    void testPublicEndpointWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/test/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));
    }

    @Test
    @DisplayName("2. Chưa đăng nhập gọi endpoint bảo vệ -> 401 Unauthorized")
    void testProtectedEndpointWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/test/permission/read"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_USER", "user:read"})
    @DisplayName("3. User có quyền user:read gọi API read -> 200 OK")
    void testUserCanRead() throws Exception {
        mockMvc.perform(get("/api/test/permission/read"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_USER", "user:read"})
    @DisplayName("4. User không có quyền user:create gọi API create -> 403 Forbidden")
    void testUserCannotCreate() throws Exception {
        mockMvc.perform(post("/api/test/permission/create"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_USER", "user:read"})
    @DisplayName("5. User không có quyền user:delete gọi API delete -> 403 Forbidden")
    void testUserCannotDelete() throws Exception {
        mockMvc.perform(delete("/api/test/permission/delete"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_MODERATOR", "user:read", "user:update"})
    @DisplayName("6. Moderator có quyền user:update gọi API update -> 200 OK")
    void testModeratorCanUpdate() throws Exception {
        mockMvc.perform(put("/api/test/permission/update"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_MODERATOR", "user:read", "user:update"})
    @DisplayName("7. Moderator không có quyền user:delete gọi API delete -> 403 Forbidden")
    void testModeratorCannotDelete() throws Exception {
        mockMvc.perform(delete("/api/test/permission/delete"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN", "user:read", "user:create", "user:update", "user:delete"})
    @DisplayName("8. Admin có đầy đủ quyền gọi API delete -> 200 OK")
    void testAdminCanDelete() throws Exception {
        mockMvc.perform(delete("/api/test/permission/delete"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN", "user:read", "user:create", "user:update", "user:delete"})
    @DisplayName("9. Admin có đầy đủ quyền gọi API create -> 200 OK")
    void testAdminCanCreate() throws Exception {
        mockMvc.perform(post("/api/test/permission/create"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_MODERATOR", "user:read", "user:update"})
    @DisplayName("10. Kiểm tra hasAnyAuthority('user:update', 'user:delete') với Moderator -> 200 OK")
    void testAnyAuthorityForModerator() throws Exception {
        mockMvc.perform(get("/api/test/permission/manage"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));
    }
}
