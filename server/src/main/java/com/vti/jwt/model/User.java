package com.vti.jwt.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Document(collection = "users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    @Indexed(unique = true)
    private String email;

    private String fullName;

    private String password;

    @DBRef
    private Set<Role> roles = new HashSet<>();

    @DBRef
    private Set<Permission> permissions = new HashSet<>();

    private boolean verified = false;

    private Boolean active = true;

    private Instant verificationExpiryDate;

    private String activeDeviceId;

    private Instant activeSessionExpiry;

    private String avatar;

    private List<String> watchlist = new ArrayList<>();

    private Instant createdAt = Instant.now();

    public User() {
    }

    public User(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.roles = new HashSet<>();
        this.permissions = new HashSet<>();
        this.verified = false;
        this.active = true;
        this.createdAt = Instant.now();
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Set<Role> getRoles() {
        return roles;
    }

    public void setRoles(Set<Role> roles) {
        this.roles = roles;
    }

    public Set<Permission> getPermissions() {
        return permissions;
    }

    public void setPermissions(Set<Permission> permissions) {
        this.permissions = permissions;
    }

    public boolean isVerified() {
        return verified;
    }

    public void setVerified(boolean verified) {
        this.verified = verified;
    }

    public boolean isActive() {
        return active == null || Boolean.TRUE.equals(active);
    }

    public void setActive(Boolean active) {
        this.active = active != null ? active : true;
    }

    public Instant getVerificationExpiryDate() {
        return verificationExpiryDate;
    }

    public void setVerificationExpiryDate(Instant verificationExpiryDate) {
        this.verificationExpiryDate = verificationExpiryDate;
    }

    public String getActiveDeviceId() {
        return activeDeviceId;
    }

    public void setActiveDeviceId(String activeDeviceId) {
        this.activeDeviceId = activeDeviceId;
    }

    public Instant getActiveSessionExpiry() {
        return activeSessionExpiry;
    }

    public void setActiveSessionExpiry(Instant activeSessionExpiry) {
        this.activeSessionExpiry = activeSessionExpiry;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public List<String> getWatchlist() {
        return watchlist;
    }

    public void setWatchlist(List<String> watchlist) {
        this.watchlist = watchlist;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
