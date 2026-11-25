package com.vti.jwt.config;

import com.vti.jwt.model.Role;
import com.vti.jwt.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.stereotype.Component;

@Component
@ReadingConverter
public class StringToRoleConverter implements Converter<String, Role> {

    @Autowired
    @Lazy
    private RoleRepository roleRepository;

    @Override
    public Role convert(String source) {
        if (roleRepository != null) {
            return roleRepository.findByName(source).orElse(new Role(source, source));
        }
        return new Role(source, source);
    }
}

