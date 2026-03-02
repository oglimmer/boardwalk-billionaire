package com.boardwalk.dto;

public record PlayerDto(
    String name,
    int money,
    int position,
    boolean inJail,
    int jailTurns,
    boolean isHuman,
    boolean isBankrupt
) {}
