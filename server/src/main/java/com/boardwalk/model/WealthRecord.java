package com.boardwalk.model;

import java.util.List;

public record WealthRecord(int round, int totalCash, List<PlayerWealth> players) {}
