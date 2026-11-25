package com.vti.jwt.dto.response;

public class ResponseModel<T> {

    private int success;
    private T data;
    private String message;

    public ResponseModel() {
    }

    public ResponseModel(int success, T data, String message) {
        this.success = success;
        this.data = data;
        this.message = message;
    }

    public static <T> ResponseModel<T> success(T data, String message) {
        return new ResponseModel<>(1, data, message);
    }

    public static <T> ResponseModel<T> success(T data) {
        return new ResponseModel<>(1, data, "Thành công");
    }

    public static <T> ResponseModel<T> error(String message) {
        return new ResponseModel<>(0, null, message);
    }

    public static <T> ResponseModel<T> error(int success, String message) {
        return new ResponseModel<>(success, null, message);
    }

    public static <T> ResponseModel<T> error(int success, T data, String message) {
        return new ResponseModel<>(success, data, message);
    }

    public int getSuccess() {
        return success;
    }

    public void setSuccess(int success) {
        this.success = success;
    }

    public T getData() {
        return data;
    }

    public void setData(T data) {
        this.data = data;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
