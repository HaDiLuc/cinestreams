package com.vti.jwt.model;

import java.util.Collections;
import java.util.Set;

public enum ERole {
    ROLE_GUEST(Set.of(
            EPermission.USER_READ
    )),
    ROLE_FREE_USER(Set.of(
            EPermission.USER_READ
    )),
    ROLE_VIP_USER(Set.of(
            EPermission.USER_READ
    )),
    ROLE_CONTENT_EDITOR(Set.of(
            EPermission.USER_READ,
            EPermission.MOVIE_MANAGE,
            EPermission.CONTENT_EDIT,
            EPermission.SUBTITLE_MANAGE
    )),
    ROLE_FINANCE_MANAGER(Set.of(
            EPermission.USER_READ,
            EPermission.FINANCE_MANAGE,
            EPermission.REFUND_PROCESS
    )),
    ROLE_ADMIN(Set.of(
            EPermission.USER_READ,
            EPermission.USER_CREATE,
            EPermission.USER_UPDATE,
            EPermission.USER_DELETE,
            EPermission.ROLE_MANAGE,
            EPermission.MOVIE_MANAGE,
            EPermission.CONTENT_EDIT,
            EPermission.SUBTITLE_MANAGE,
            EPermission.FINANCE_MANAGE,
            EPermission.REFUND_PROCESS
    ));

    private final Set<EPermission> permissions;

    ERole(Set<EPermission> permissions) {
        this.permissions = permissions;
    }

    public Set<EPermission> getPermissions() {
        return Collections.unmodifiableSet(permissions);
    }
}
