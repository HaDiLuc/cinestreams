package com.vti.jwt.service.impl;

import com.vti.jwt.dto.request.CategoryRequest;
import com.vti.jwt.exception.ResourceNotFoundException;
import com.vti.jwt.model.Category;
import com.vti.jwt.repository.CategoryRepository;
import com.vti.jwt.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryServiceImpl implements CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    @Override
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @Override
    public Category getCategoryById(String id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục với ID: " + id));
    }

    @Override
    public Category createCategory(CategoryRequest request) {
        String name = request.getName().trim();
        if (categoryRepository.existsByName(name)) {
            throw new IllegalArgumentException("Tên danh mục [" + name + "] đã tồn tại!");
        }

        Category category = new Category(name, request.getDescription());
        return categoryRepository.save(category);
    }

    @Override
    public Category updateCategory(String id, CategoryRequest request) {
        Category category = getCategoryById(id);

        String newName = request.getName().trim();
        if (!category.getName().equalsIgnoreCase(newName) && categoryRepository.existsByName(newName)) {
            throw new IllegalArgumentException("Tên danh mục [" + newName + "] đã tồn tại!");
        }

        category.setName(newName);
        category.setDescription(request.getDescription());
        return categoryRepository.save(category);
    }

    @Override
    public void deleteCategory(String id) {
        Category category = getCategoryById(id);
        categoryRepository.delete(category);
    }
}
