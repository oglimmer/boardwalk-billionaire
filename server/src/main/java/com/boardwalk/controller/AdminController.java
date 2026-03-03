package com.boardwalk.controller;

import com.boardwalk.service.SessionManager;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin")
public class AdminController {

    private final SessionManager sessionManager;

    public AdminController(SessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    @GetMapping
    public String dashboard(Model model) {
        var sessions = sessionManager.getAllSessions();
        List<Map<String, Object>> games = new ArrayList<>();

        for (var session : sessions) {
            var info = new java.util.LinkedHashMap<String, Object>();
            info.put("gameCode", session.getGameCode());
            info.put("started", session.isStarted());
            info.put("humanSlots", session.getHumanSlots());
            info.put("joinedCount", session.getJoinedCount());

            if (session.isStarted() && session.getGameState() != null) {
                var state = session.getGameState();
                info.put("turn", state.getTurnCounter());
                info.put("phase", state.getPhase().name());
                info.put("gameOver", state.isGameOver());
                info.put("currentPlayer", state.getCurrentPlayer());
                info.put("players", state.getPlayers());
                info.put("propertyCount", state.getProperties().size());
            }

            games.add(info);
        }

        model.addAttribute("games", games);
        model.addAttribute("totalGames", sessions.size());
        model.addAttribute("activeGames", sessions.stream().filter(s -> s.isStarted() && !s.getGameState().isGameOver()).count());
        return "admin";
    }

    @PostMapping("/delete/{gameCode}")
    public String deleteGame(@PathVariable String gameCode) {
        sessionManager.removeSession(gameCode);
        return "redirect:/admin";
    }
}
