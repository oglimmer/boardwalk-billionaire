package com.boardwalk.model;

import java.util.Map;

public final class GameData {

    private GameData() {}

    public static final Space[] SPACES = {
        new Space("Start", SpaceType.GO),
        new Space("Elm Lane", SpaceType.PROPERTY, GroupName.BROWN, 60, new int[]{2,10,30,90,160,250}),
        new Space("Fortune", SpaceType.CARD),
        new Space("Cedar Court", SpaceType.PROPERTY, GroupName.BROWN, 60, new int[]{4,20,60,180,320,450}),
        new Space("Income Tax", SpaceType.TAX, 200, true),
        new Space("North Station", SpaceType.RAILROAD, 200),
        new Space("Birch Avenue", SpaceType.PROPERTY, GroupName.LIGHTBLUE, 100, new int[]{6,30,90,270,400,550}),
        new Space("Fortune", SpaceType.CARD),
        new Space("Maple Drive", SpaceType.PROPERTY, GroupName.LIGHTBLUE, 100, new int[]{6,30,90,270,400,550}),
        new Space("Pine Street", SpaceType.PROPERTY, GroupName.LIGHTBLUE, 120, new int[]{8,40,100,300,450,600}),
        new Space("Lockup", SpaceType.JAIL),
        new Space("Coral Way", SpaceType.PROPERTY, GroupName.PINK, 140, new int[]{10,50,150,450,625,750}),
        new Space("Electric Co.", SpaceType.UTILITY, 150),
        new Space("Flamingo Rd", SpaceType.PROPERTY, GroupName.PINK, 140, new int[]{10,50,150,450,625,750}),
        new Space("Sunset Blvd", SpaceType.PROPERTY, GroupName.PINK, 160, new int[]{12,60,180,500,700,900}),
        new Space("South Station", SpaceType.RAILROAD, 200),
        new Space("Amber Street", SpaceType.PROPERTY, GroupName.ORANGE, 180, new int[]{14,70,200,550,750,950}),
        new Space("Fortune", SpaceType.CARD),
        new Space("Copper Lane", SpaceType.PROPERTY, GroupName.ORANGE, 180, new int[]{14,70,200,550,750,950}),
        new Space("Bronze Ave", SpaceType.PROPERTY, GroupName.ORANGE, 200, new int[]{16,80,220,600,800,1000}),
        new Space("Rest Stop", SpaceType.FREE),
        new Space("Crimson Dr", SpaceType.PROPERTY, GroupName.RED, 220, new int[]{18,90,250,700,875,1050}),
        new Space("Fortune", SpaceType.CARD),
        new Space("Scarlet Rd", SpaceType.PROPERTY, GroupName.RED, 220, new int[]{18,90,250,700,875,1050}),
        new Space("Ruby Lane", SpaceType.PROPERTY, GroupName.RED, 240, new int[]{20,100,300,750,925,1100}),
        new Space("East Station", SpaceType.RAILROAD, 200),
        new Space("Golden Ave", SpaceType.PROPERTY, GroupName.YELLOW, 260, new int[]{22,110,330,800,975,1150}),
        new Space("Saffron St", SpaceType.PROPERTY, GroupName.YELLOW, 260, new int[]{22,110,330,800,975,1150}),
        new Space("Water Works", SpaceType.UTILITY, 150),
        new Space("Honey Lane", SpaceType.PROPERTY, GroupName.YELLOW, 280, new int[]{24,120,360,850,1025,1200}),
        new Space("Go To Lockup", SpaceType.GOTOJAIL),
        new Space("Emerald Dr", SpaceType.PROPERTY, GroupName.GREEN, 300, new int[]{26,130,390,900,1100,1275}),
        new Space("Jade Road", SpaceType.PROPERTY, GroupName.GREEN, 300, new int[]{26,130,390,900,1100,1275}),
        new Space("Fortune", SpaceType.CARD),
        new Space("Forest Ave", SpaceType.PROPERTY, GroupName.GREEN, 320, new int[]{28,150,450,1000,1200,1400}),
        new Space("West Station", SpaceType.RAILROAD, 200),
        new Space("Fortune", SpaceType.CARD),
        new Space("Sapphire Blvd", SpaceType.PROPERTY, GroupName.DARKBLUE, 350, new int[]{35,175,500,1100,1300,1500}),
        new Space("Luxury Tax", SpaceType.TAX, 100, true),
        new Space("Diamond Plaza", SpaceType.PROPERTY, GroupName.DARKBLUE, 400, new int[]{50,200,600,1400,1700,2000}),
    };

    public static final Map<GroupName, Group> GROUPS = Map.of(
        GroupName.BROWN,     new Group("#8B4513", new int[]{1, 3}, 50),
        GroupName.LIGHTBLUE, new Group("#87CEEB", new int[]{6, 8, 9}, 50),
        GroupName.PINK,      new Group("#E91E90", new int[]{11, 13, 14}, 100),
        GroupName.ORANGE,    new Group("#FF8C00", new int[]{16, 18, 19}, 100),
        GroupName.RED,       new Group("#DC143C", new int[]{21, 23, 24}, 150),
        GroupName.YELLOW,    new Group("#FFD700", new int[]{26, 27, 29}, 150),
        GroupName.GREEN,     new Group("#228B22", new int[]{31, 32, 34}, 200),
        GroupName.DARKBLUE,  new Group("#1a1aff", new int[]{37, 39}, 200)
    );

    public static final int[] RAILROAD_SPACES = {5, 15, 25, 35};
    public static final int[] UTILITY_SPACES = {12, 28};
    public static final String[] PLAYER_COLORS = {"#e74c3c", "#3498db", "#2ecc71", "#f1c40f"};

    public static final Card[] CARDS = {
        new Card("Lottery Scratch-Off", "You won the scratch-off! Collect $200.", CardEffect.COLLECT, 200),
        new Card("Tax Refund", "The government owes you. Collect $100.", CardEffect.COLLECT, 100),
        new Card("Freelance Bonus", "Side hustle paid off. Collect $50.", CardEffect.COLLECT, 50),
        new Card("Great Aunt's Inheritance", "A distant relative remembered you. Collect $150.", CardEffect.COLLECT, 150),
        new Card("Found Wallet", "You found cash on the sidewalk. Collect $75.", CardEffect.COLLECT, 75),
        new Card("Parking Ticket", "Should've fed the meter. Pay $50.", CardEffect.PAY, 50),
        new Card("Emergency Room Visit", "A clumsy accident. Pay $100.", CardEffect.PAY, 100),
        new Card("Charity Gala", "You donated generously. Pay $150.", CardEffect.PAY, 150),
        new Card("Speeding Ticket", "Lead foot strikes again. Pay $75.", CardEffect.PAY, 75),
        new Card("It's Your Birthday!", "Everyone chips in! Collect $25 from each player.", CardEffect.COLLECT_FROM_ALL, 25),
        new Card("Caught Jaywalking", "The long arm of the law. Go directly to Lockup.", CardEffect.GO_TO_JAIL),
        Card.advanceTo("Sunday Drive", "Take a drive all the way around. Advance to Start.", 0),
        new Card("Wrong Turn", "You took a wrong turn. Go back 3 spaces.", CardEffect.GO_BACK, 3),
        new Card("Express Train", "All aboard! Advance to the nearest station. If owned, pay double rent.", CardEffect.NEAREST_RAILROAD),
        Card.repairs("Pipe Burst at Home", "Repairs needed everywhere. Pay $40 per house and $115 per hotel.", 40, 115),
    };
}
