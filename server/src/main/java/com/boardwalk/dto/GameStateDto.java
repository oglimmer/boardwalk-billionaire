package com.boardwalk.dto;

import java.util.List;
import java.util.Map;

public record GameStateDto(
    int yourPlayerIndex,
    List<PlayerDto> players,
    int currentPlayer,
    Map<Integer, OwnedPropertyDto> properties,
    String phase,
    int[] lastDice,
    boolean gameOver,
    int turnCounter,
    List<WealthRecordDto> wealthHistory,
    List<String> logEntries,
    String centerInfo,
    ModalDto modal,
    PendingAiTradeDto pendingAiTrade
) {}
