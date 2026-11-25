package com.vti.jwt.dto.request;

import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public class AssignPermissionsRequest {

    @NotEmpty(message = "Danh sách permissions không được để trống")
    private Set<String> permissions;

    public AssignPermissionsRequest() {
    }

    public AssignPermissionsRequest(Set<String> permissions) {
        this.permissions = permissions;
    }

    public Set<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(Set<String> permissions) {
        this.permissions = permissions;
    }
}
