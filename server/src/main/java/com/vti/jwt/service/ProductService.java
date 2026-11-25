package com.vti.jwt.service;

import com.vti.jwt.dto.request.ProductRequest;
import com.vti.jwt.model.Product;

import java.util.List;

public interface ProductService {

    List<Product> getAllProducts();

    Product getProductById(String id);

    List<Product> getProductsByCategoryId(String categoryId);

    Product createProduct(ProductRequest request);

    Product updateProduct(String id, ProductRequest request);

    void deleteProduct(String id);
}
