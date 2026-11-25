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

        // 1. Thêm Roles và Permissions từ từng Role động
        if (user.getRoles() != null) {
            for (com.vti.jwt.model.Role role : user.getRoles()) {
                if (role != null && role.getName() != null) {
                    // Chuẩn hóa tên Role có tiền tố ROLE_
                    String roleName = role.getName().startsWith("ROLE_") ? role.getName() : "ROLE_" + role.getName();
                    authorities.add(new SimpleGrantedAuthority(roleName));

                    // Thêm các Permission được gán cho Role này
                    if (role.getPermissions() != null) {
                        for (com.vti.jwt.model.Permission permission : role.getPermissions()) {
                            if (permission != null && permission.getName() != null) {
                                authorities.add(new SimpleGrantedAuthority(permission.getName()));
                            }
                        }
                    }
                }
            }
        }

        // 2. Thêm Permissions riêng của User (nếu có)
        if (user.getPermissions() != null) {
            for (com.vti.jwt.model.Permission permission : user.getPermissions()) {
                if (permission != null && permission.getName() != null) {
                    authorities.add(new SimpleGrantedAuthority(permission.getName()));
                }
            }
        }

        return new UserDetailsImpl(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getPassword(),
                user.isVerified(),
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
