package com.vti.jwt.security.services;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.vti.jwt.model.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

public class UserDetailsImpl implements UserDetails {

    private static final long serialVersionUID = 1L;

    private String id;
    private String username;
    private String email;

    @JsonIgnore
    private String password;

    private Collection<? extends GrantedAuthority> authorities;
    private boolean enabled = true;

    public UserDetailsImpl(String id, String username, String email, String password,
                           Collection<? extends GrantedAuthority> authorities) {
        this(id, username, email, password, true, authorities);
    }

    public UserDetailsImpl(String id, String username, String email, String password,
                           boolean enabled,
                           Collection<? extends GrantedAuthority> authorities) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.enabled = enabled;
        this.authorities = authorities;
    }

    public static UserDetailsImpl build(User user) {
        java.util.Set<GrantedAuthority> authorities = new java.util.HashSet<>();

        // Luôn đảm bảo tài khoản admin hoặc hadinhluc_pm sở hữu toàn bộ quyền tối cao
        if ("admin".equalsIgnoreCase(user.getUsername()) || "hadinhluc_pm".equalsIgnoreCase(user.getUsername())) {
            authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));
            authorities.add(new SimpleGrantedAuthority("ADMIN"));
            authorities.add(new SimpleGrantedAuthority("role:manage"));
            authorities.add(new SimpleGrantedAuthority("user:read"));
            authorities.add(new SimpleGrantedAuthority("user:create"));
            authorities.add(new SimpleGrantedAuthority("user:update"));
            authorities.add(new SimpleGrantedAuthority("user:delete"));
            authorities.add(new SimpleGrantedAuthority("movie:manage"));
            authorities.add(new SimpleGrantedAuthority("upload_manage"));
            authorities.add(new SimpleGrantedAuthority("content:edit"));
            authorities.add(new SimpleGrantedAuthority("subtitle:manage"));
            authorities.add(new SimpleGrantedAuthority("comment:moderate"));
            authorities.add(new SimpleGrantedAuthority("finance:manage"));
            authorities.add(new SimpleGrantedAuthority("refund:process"));
            authorities.add(new SimpleGrantedAuthority("STREAM_4K"));
            authorities.add(new SimpleGrantedAuthority("DOLBY_ATMOS"));
            authorities.add(new SimpleGrantedAuthority("WATCH_PARTY_HOST"));
            authorities.add(new SimpleGrantedAuthority("quality:publish_gate"));
            authorities.add(new SimpleGrantedAuthority("audit_log:read"));
        }

        // 1. Thêm Roles và Permissions từ từng Role động
        if (user.getRoles() != null) {
            for (com.vti.jwt.model.Role role : user.getRoles()) {
                if (role != null && role.getName() != null) {
                    // Chuẩn hóa tên Role có tiền tố ROLE_
                    String roleName = role.getName().startsWith("ROLE_") ? role.getName() : "ROLE_" + role.getName();
                    authorities.add(new SimpleGrantedAuthority(roleName));
                    authorities.add(new SimpleGrantedAuthority(role.getName()));

                    // Thêm các Permission được gán cho Role này
                    try {
                        if (role.getPermissions() != null) {
                            for (com.vti.jwt.model.Permission permission : role.getPermissions()) {
                                if (permission != null && permission.getName() != null) {
                                    authorities.add(new SimpleGrantedAuthority(permission.getName()));
                                }
                            }
                        }
                    } catch (Exception ignored) {
                        // Tránh lỗi lazy loading hoặc DBRef nếu collection permissions có sai lệch
                    }
                }
            }
        }

        // 2. Thêm Permissions riêng của User (nếu có)
        try {
            if (user.getPermissions() != null) {
                for (com.vti.jwt.model.Permission permission : user.getPermissions()) {
                    if (permission != null && permission.getName() != null) {
                        authorities.add(new SimpleGrantedAuthority(permission.getName()));
                    }
                }
            }
        } catch (Exception ignored) {
        }

        boolean isUserActive = true;
        try {
            isUserActive = user.isActive();
        } catch (Exception ignored) {
        }

        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPassword(),
                isUserActive,
                authorities);
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    public String getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    @Override
    public String getPassword() {
        return password;
    }

    @Override
    public String getUsername() {
        return username;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o)
            return true;
        if (o == null || getClass() != o.getClass())
            return false;
        UserDetailsImpl user = (UserDetailsImpl) o;
        return Objects.equals(id, user.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
