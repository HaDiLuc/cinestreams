package com.vti.jwt.repository;

import com.vti.jwt.model.Permission;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;

@Repository
public interface PermissionRepository extends MongoRepository<Permission, String> {

    Optional<Permission> findByName(String name);

    Boolean existsByName(String name);

    Set<Permission> findByNameIn(Collection<String> names);
}
