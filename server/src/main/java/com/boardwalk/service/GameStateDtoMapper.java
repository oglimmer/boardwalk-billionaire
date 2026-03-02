package com.boardwalk.service;

import com.boardwalk.dto.*;
import com.boardwalk.model.*;
import org.springframework.stereotype.Service;

import java.util.*;

import static com.boardwalk.model.GameData.SPACES;

@Service
public class GameStateDtoMapper {

    public GameStateDto toDto(GameState state, int yourPlayerIndex) {
        List<PlayerDto> players = state.getPlayers().stream()
            .map(p -> new PlayerDto(p.getName(), p.getMoney(), p.getPosition(),
                p.isInJail(), p.getJailTurns(), p.isHuman(), p.isBankrupt()))
            .toList();

        Map<Integer, OwnedPropertyDto> properties = new HashMap<>();
        for (var entry : state.getProperties().entrySet()) {
            OwnedProperty prop = entry.getValue();
            properties.put(entry.getKey(), new OwnedPropertyDto(prop.getOwner(), prop.getHouses(), prop.isMortgaged()));
        }

        List<WealthRecordDto> wealthHistory = state.getWealthHistory().stream()
            .map(w -> new WealthRecordDto(w.round(), w.totalCash(),
                w.players().stream().map(pw -> new PlayerWealthDto(pw.cash(), pw.total())).toList()))
            .toList();

        ModalDto modal = buildModal(state, yourPlayerIndex);
        PendingAiTradeDto pendingTrade = buildPendingAiTrade(state, yourPlayerIndex);

        return new GameStateDto(
            yourPlayerIndex,
            players,
            state.getCurrentPlayer(),
            properties,
            state.getPhase().name().toLowerCase(),
            state.getLastDice(),
            state.isGameOver(),
            state.getTurnCounter(),
            wealthHistory,
            state.getLogEntries(),
            state.getCenterInfo(),
            modal,
            pendingTrade
        );
    }

    private ModalDto buildModal(GameState state, int yourPlayerIndex) {
        PendingInteraction pending = state.getPendingInteraction();
        if (pending == null) return ModalDto.none();

        // Only show modal to the targeted player
        if (pending.getTargetPlayer() != yourPlayerIndex) return ModalDto.none();

        return switch (pending.getType()) {
            case AWAITING_BUY_DECISION -> {
                int si = pending.getSpaceIndex();
                yield ModalDto.of("buy", Map.of("si", si));
            }
            case AWAITING_CARD_ACKNOWLEDGMENT -> {
                Card card = pending.getCard();
                yield ModalDto.of("card", Map.of(
                    "card", Map.of(
                        "title", card.title(),
                        "desc", card.desc(),
                        "effect", card.effect().name().toLowerCase(),
                        "amount", card.amount() != null ? card.amount() : 0,
                        "position", card.position() != null ? card.position() : 0,
                        "perHouse", card.perHouse() != null ? card.perHouse() : 0,
                        "perHotel", card.perHotel() != null ? card.perHotel() : 0
                    ),
                    "pi", pending.getTargetPlayer()
                ));
            }
            case AWAITING_TRADE_RESPONSE -> {
                PendingAiTrade trade = pending.getAiTrade();
                yield ModalDto.of("aiTradeProposal", Map.of());
            }
        };
    }

    private PendingAiTradeDto buildPendingAiTrade(GameState state, int yourPlayerIndex) {
        PendingInteraction pending = state.getPendingInteraction();
        if (pending == null || pending.getType() != PendingInteractionType.AWAITING_TRADE_RESPONSE) return null;
        if (pending.getTargetPlayer() != yourPlayerIndex) return null;
        PendingAiTrade trade = pending.getAiTrade();
        return new PendingAiTradeDto(
            trade.getAiPlayer(),
            trade.getOfferedProps(),
            trade.getWantedProps(),
            trade.getOfferedCash(),
            trade.getWantedCash()
        );
    }
}
