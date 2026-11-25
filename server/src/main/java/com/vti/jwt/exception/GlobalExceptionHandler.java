package com.vti.jwt.exception;

import com.vti.jwt.dto.response.ResponseModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ResponseModel<Map<String, String>>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            fieldErrors.put(fieldName, errorMessage);
        });

        return new ResponseEntity<>(ResponseModel.error(0, fieldErrors, "Dữ liệu không hợp lệ"), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(TokenRefreshException.class)
    public ResponseEntity<ResponseModel<String>> handleTokenRefreshException(TokenRefreshException ex) {
        return new ResponseEntity<>(ResponseModel.error(0, null, ex.getMessage()), HttpStatus.FORBIDDEN);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ResponseModel<String>> handleResourceNotFoundException(ResourceNotFoundException ex) {
        return new ResponseEntity<>(ResponseModel.error(0, null, ex.getMessage()), HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ResponseModel<String>> handleIllegalArgumentException(IllegalArgumentException ex) {
        return new ResponseEntity<>(ResponseModel.error(0, null, ex.getMessage()), HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(org.springframework.security.authentication.DisabledException.class)
    public ResponseEntity<ResponseModel<String>> handleDisabledException(org.springframework.security.authentication.DisabledException ex) {
        return new ResponseEntity<>(ResponseModel.error(0, null, "Tài khoản chưa được kích hoạt! Vui lòng xác minh mã OTP gửi tới email trước khi đăng nhập."), HttpStatus.BAD_REQUEST);
    }
}
