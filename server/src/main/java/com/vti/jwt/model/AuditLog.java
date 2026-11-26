package com.vti.jwt.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "audit_logs")
public class AuditLog {

    @Id
    private String id;

    private String username;

    private String action; // e.g., "ASSIGN_ROLE", "LOCK_USER", "UNLOCK_USER", "PUBLISH_MOVIE", "CREATE_ROLE", "DELETE_ROLE"

    private String target; // e.g., username, roleName, movieId

    private String details;

    private String ipAddress;

    @Builder.Default
    private Instant timestamp = Instant.now();

    public AuditLog(String username, String action, String target, String details) {
        this.username = username;
        this.action = action;
        this.target = target;
        this.details = details;
        this.timestamp = Instant.now();
    }
}
