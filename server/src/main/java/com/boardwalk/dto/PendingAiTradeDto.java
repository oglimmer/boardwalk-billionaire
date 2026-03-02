package com.boardwalk.dto;

import java.util.List;

public record PendingAiTradeDto(
    int aiPlayer,
    List<Integer> offeredProps,
    List<Integer> wantedProps,
    int offeredCash,
    int wantedCash
) {}
