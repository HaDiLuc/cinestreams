package com.vti.jwt.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public class AssignRolesToUserRequest {

    @NotBlank(message = "Username không được để trống")
    private String username;

    @NotEmpty(message = "Danh sách vai trò không được để trống")
    private Set<String> roles;

    public AssignRolesToUserRequest() {
    }

    public AssignRolesToUserRequest(String username, Set<String> roles) {
        this.username = username;
        this.roles = roles;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public Set<String> getRoles() {
        return roles;
    }

    public void setRoles(Set<String> roles) {
        this.roles = roles;
    }
}
