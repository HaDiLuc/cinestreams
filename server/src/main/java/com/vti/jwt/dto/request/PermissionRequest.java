package com.vti.jwt.dto.request;

import jakarta.validation.constraints.NotBlank;

public class PermissionRequest {

    @NotBlank(message = "Tên quyền (Permission name) không được để trống")
    private String name; // ví dụ: "report:view", "order:create"

    private String description;

    private String module; // ví dụ: "REPORT", "ORDER"

    public PermissionRequest() {
    }

    public PermissionRequest(String name, String description, String module) {
        this.name = name;
        this.description = description;
        this.module = module;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getModule() {
        return module;
    }

    public void setModule(String module) {
        this.module = module;
    }
}
