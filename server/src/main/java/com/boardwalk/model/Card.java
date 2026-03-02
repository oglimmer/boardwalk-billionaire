package com.boardwalk.model;

public record Card(
    String title,
    String desc,
    CardEffect effect,
    Integer amount,
    Integer position,
    Integer perHouse,
    Integer perHotel
) {
    public Card(String title, String desc, CardEffect effect, int amount) {
        this(title, desc, effect, amount, null, null, null);
    }

    public Card(String title, String desc, CardEffect effect) {
        this(title, desc, effect, null, null, null, null);
    }

    public static Card advanceTo(String title, String desc, int position) {
        return new Card(title, desc, CardEffect.ADVANCE_TO, null, position, null, null);
    }

    public static Card repairs(String title, String desc, int perHouse, int perHotel) {
        return new Card(title, desc, CardEffect.REPAIRS, null, null, perHouse, perHotel);
    }
}
