package com.boardwalk.dto;

import java.util.List;

public record WealthRecordDto(
    int round,
    int totalCash,
    List<PlayerWealthDto> players
) {}
