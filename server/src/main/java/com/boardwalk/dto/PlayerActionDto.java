package com.boardwalk.dto;

import java.util.List;
import java.util.Map;

public record PlayerActionDto(
    String type,
    Map<String, Object> payload
) {
    public int getInt(String key) {
        Object v = payload != null ? payload.get(key) : null;
        if (v instanceof Number n) return n.intValue();
        return 0;
    }

    @SuppressWarnings("unchecked")
    public List<Integer> getIntList(String key) {
        Object v = payload != null ? payload.get(key) : null;
        if (v instanceof List<?> list) {
            return list.stream().map(o -> ((Number) o).intValue()).toList();
        }
        return List.of();
    }

    public String getString(String key) {
        Object v = payload != null ? payload.get(key) : null;
        return v != null ? v.toString() : "";
    }
}
