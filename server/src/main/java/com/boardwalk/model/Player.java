package com.boardwalk.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class Player {
    private String name;
    private int money;
    private int position;
    private boolean inJail;
    private int jailTurns;
    private boolean isHuman;
    private boolean isBankrupt;

    public Player(String name, int money, boolean isHuman) {
        this.name = name;
        this.money = money;
        this.position = 0;
        this.inJail = false;
        this.jailTurns = 0;
        this.isHuman = isHuman;
        this.isBankrupt = false;
    }

    public void addMoney(int amount) { this.money += amount; }
    public void subtractMoney(int amount) { this.money -= amount; }
}
