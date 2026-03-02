package com.boardwalk.dto;

import java.util.Map;

public record ModalDto(
    boolean visible,
    String type,
    Map<String, Object> payload
) {
    public static ModalDto none() {
        return new ModalDto(false, null, Map.of());
    }

    public static ModalDto of(String type, Map<String, Object> payload) {
        return new ModalDto(true, type, payload);
    }
}
