package com.boardwalk.model;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class PendingAiTrade {
    private final int aiPlayer;
    private final List<Integer> offeredProps;
    private final List<Integer> wantedProps;
    private final int offeredCash;
    private final int wantedCash;
}
