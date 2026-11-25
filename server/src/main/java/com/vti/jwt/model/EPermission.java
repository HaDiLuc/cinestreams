package com.vti.jwt.model;

public enum EPermission {
    USER_READ("user:read"),
    USER_CREATE("user:create"),
    USER_UPDATE("user:update"),
    USER_DELETE("user:delete"),

    ROLE_MANAGE("role:manage"),

    CATEGORY_READ("category:read"),
    CATEGORY_CREATE("category:create"),
    CATEGORY_UPDATE("category:update"),
    CATEGORY_DELETE("category:delete"),

    PRODUCT_READ("product:read"),
    PRODUCT_CREATE("product:create"),
    PRODUCT_UPDATE("product:update"),
    PRODUCT_DELETE("product:delete"),

    MOVIE_MANAGE("movie:manage"),
    CONTENT_EDIT("content:edit"),
    SUBTITLE_MANAGE("subtitle:manage"),
    FINANCE_MANAGE("finance:manage"),
    REFUND_PROCESS("refund:process");

    private final String permission;

    EPermission(String permission) {
        this.permission = permission;
    }

    public String getPermission() {
        return permission;
    }
}
