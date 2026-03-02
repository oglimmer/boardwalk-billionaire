package com.boardwalk.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PendingInteraction {
    private PendingInteractionType type;
    private int targetPlayer;
    private Integer spaceIndex;
    private Card card;
    private PendingAiTrade aiTrade;

    public PendingInteraction(PendingInteractionType type, int targetPlayer) {
        this.type = type;
        this.targetPlayer = targetPlayer;
    }
}
