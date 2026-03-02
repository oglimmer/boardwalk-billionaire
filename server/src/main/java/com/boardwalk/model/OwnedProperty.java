package com.boardwalk.model;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class OwnedProperty {
    private int owner;
    private int houses;
    private boolean mortgaged;

    public OwnedProperty(int owner) {
        this.owner = owner;
        this.houses = 0;
        this.mortgaged = false;
    }
}
