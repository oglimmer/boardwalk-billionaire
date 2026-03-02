package com.boardwalk.dto;

import java.util.List;

public record LobbyResponse(
    String gameCode,
    int humanSlots,
    int joinedCount,
    List<String> playerNames,
    boolean started
) {}
