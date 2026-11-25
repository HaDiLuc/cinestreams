package com.vti.jwt.service;

import com.vti.jwt.dto.request.CategoryRequest;
import com.vti.jwt.model.Category;

import java.util.List;

public interface CategoryService {

    List<Category> getAllCategories();

    Category getCategoryById(String id);

    Category createCategory(CategoryRequest request);

    Category updateCategory(String id, CategoryRequest request);

    void deleteCategory(String id);
}
