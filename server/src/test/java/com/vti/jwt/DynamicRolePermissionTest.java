package com.vti.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vti.jwt.dto.request.AssignPermissionsRequest;
import com.vti.jwt.dto.request.AssignRolesToUserRequest;
import com.vti.jwt.dto.request.PermissionRequest;
import com.vti.jwt.dto.request.RoleRequest;
import com.vti.jwt.model.Permission;
import com.vti.jwt.model.Role;
import com.vti.jwt.model.User;
import com.vti.jwt.repository.PermissionRepository;
import com.vti.jwt.repository.RoleRepository;
import com.vti.jwt.repository.UserRepository;
import com.vti.jwt.security.services.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DynamicRolePermissionTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        permissionRepository.findByName("invoice:export").ifPresent(permissionRepository::delete);
        roleRepository.findByName("ROLE_ACCOUNTANT").ifPresent(roleRepository::delete);
        userRepository.findByUsername("test_accountant").ifPresent(userRepository::delete);
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN"})
    @DisplayName("1. Admin tạo Permission động mới qua API")
    void testCreateDynamicPermission() throws Exception {
        PermissionRequest request = new PermissionRequest("invoice:export", "Quyền xuất hóa đơn", "INVOICE");

        mockMvc.perform(post("/api/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1))
                .andExpect(jsonPath("$.data.name").value("invoice:export"));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN"})
    @DisplayName("2. Admin tạo Role động mới và gán sẵn Permission qua API")
    void testCreateDynamicRole() throws Exception {
        // Chuẩn bị sẵn permission
        permissionRepository.findByName("invoice:export").orElseGet(() ->
                permissionRepository.save(new Permission("invoice:export", "Quyền xuất hóa đơn", "INVOICE")));

        RoleRequest request = new RoleRequest("ROLE_ACCOUNTANT", "Kế toán viên", Set.of("user:read", "invoice:export"));

        mockMvc.perform(post("/api/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1))
                .andExpect(jsonPath("$.data.name").value("ROLE_ACCOUNTANT"));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN"})
    @DisplayName("3. Cập nhật/Gán động thêm Permission cho Role")
    void testAssignPermissionsToRole() throws Exception {
        // Chuẩn bị sẵn role
        Role role = roleRepository.save(new Role("ROLE_ACCOUNTANT", "Kế toán viên", new HashSet<>()));

        AssignPermissionsRequest request = new AssignPermissionsRequest(Set.of("user:read", "user:update"));

        mockMvc.perform(put("/api/roles/" + role.getId() + "/permissions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));
    }

    @Test
    @WithMockUser(authorities = {"ROLE_ADMIN"})
    @DisplayName("4. Gán Role động cho User và kiểm tra nạp quyền UserDetails")
    void testAssignDynamicRoleToUser() throws Exception {
        // 1. Chuẩn bị quyền và vai trò
        Permission permRead = permissionRepository.findByName("user:read").orElseThrow();
        Permission permUpdate = permissionRepository.findByName("user:update").orElseThrow();
        Role accountantRole = roleRepository.save(new Role("ROLE_ACCOUNTANT", "Kế toán viên", Set.of(permRead, permUpdate)));

        // 2. Chuẩn bị user
        User accountantUser = new User("test_accountant", "accountant@vti.com.vn", "password123");
        userRepository.save(accountantUser);

        // 3. Gọi API gán role
        AssignRolesToUserRequest request = new AssignRolesToUserRequest("test_accountant", Set.of("ROLE_ACCOUNTANT"));

        mockMvc.perform(post("/api/roles/assign-user")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(1));

        // 4. Kiểm tra UserDetailsImpl đã nạp đúng Role và các Permission động
        User user = userRepository.findByUsername("test_accountant").orElseThrow();
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);

        Set<String> authorities = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());

        assertTrue(authorities.contains("ROLE_ACCOUNTANT"), "User phải có vai trò ROLE_ACCOUNTANT");
        assertTrue(authorities.contains("user:read"), "User phải được thừa hưởng quyền user:read từ vai trò");
        assertTrue(authorities.contains("user:update"), "User phải được thừa hưởng quyền user:update từ vai trò");
    }
}
