package com.boardwalk.dto;

public record OwnedPropertyDto(
    int owner,
    int houses,
    boolean mortgaged
) {}
