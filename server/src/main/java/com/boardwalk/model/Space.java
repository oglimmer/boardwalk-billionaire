package com.boardwalk.model;

public record Space(
    String name,
    SpaceType type,
    GroupName group,
    Integer price,
    int[] rent,
    Integer amount
) {
    public Space(String name, SpaceType type) {
        this(name, type, null, null, null, null);
    }

    public Space(String name, SpaceType type, GroupName group, int price, int[] rent) {
        this(name, type, group, price, rent, null);
    }

    public Space(String name, SpaceType type, int price) {
        this(name, type, null, price, null, null);
    }

    public Space(String name, SpaceType type, int amount, boolean isTax) {
        this(name, type, null, null, null, amount);
    }
}
