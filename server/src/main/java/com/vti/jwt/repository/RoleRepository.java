package com.vti.jwt.repository;

import com.vti.jwt.model.Role;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;
import java.util.Set;

@Repository
public interface RoleRepository extends MongoRepository<Role, String> {

    Optional<Role> findByName(String name);

    Boolean existsByName(String name);

    Set<Role> findByNameIn(Collection<String> names);
}
