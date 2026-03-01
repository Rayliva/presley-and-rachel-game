/**
 * Game constants for Campfire Survival
 */

export const TILE_SIZE = 32;
export const MAP_WIDTH = 24;  // tiles
export const MAP_HEIGHT = 18;

export const PLAYER_SPEED = 120;
export const PLAYER_SIZE = 20;
export const INTERACTION_RANGE = 40;

export const FIRE_FUEL_MAX = 100;
export const FIRE_FUEL_CONSUMPTION = 2.5;  // per second
export const FIRE_LIGHT_MIN = 60;
export const FIRE_LIGHT_MAX = 200;
export const WOOD_FUEL_VALUE = 25;

export const HUNGER_MAX = 100;
export const HUNGER_DEPLETION = 2;  // per second
export const FRUIT_HUNGER_VALUE = 25;
export const MEAT_HUNGER_VALUE = 40;

export const TREE_WOOD_AMOUNT = 3;
export const TREE_CHOP_TIME = 0.8;  // seconds
export const TREE_SHAKE_TIME = 0.4;

export const PIG_SPEED = 40;
export const PIG_FLEE_RANGE = 80;
export const PIG_MEAT_DROP = 1;
export const MEAT_COOK_TIME = 3;  // seconds to cook one piece

export const WOLF_STATE = {
  WANDER: 'wander',
  ATTACK: 'attack',
};
export const WOLF_WANDER_SPEED = 50;
export const WOLF_ATTACK_SPEED = 90;
export const WOLF_WANDER_CHANGE_INTERVAL = 2;  // seconds
export const WOLF_ATTACK_RANGE = 25;  // distance to kill player
export const WOLF_DETECTION_RANGE = 100;  // only chase when player gets this close
export const WOLF_MEAT_DROP = 1;

// Blue orbs and forcefield
export const ORB_MAX_COUNT = 2;
export const ORB_SPAWN_INTERVAL = 12;  // seconds between spawn attempts
export const ORB_COLLECT_RANGE = 28;
export const ORB_EDGE_MARGIN = 48;  // pixels from corner when placing on edge
export const FORCEFIELD_DURATION = 45;  // seconds

// Pig and wolf respawn
export const PIG_MAX_COUNT = 6;
export const PIG_RESPAWN_INTERVAL = 15;  // seconds
export const WOLF_MAX_COUNT = 5;
export const WOLF_RESPAWN_INTERVAL = 20;  // seconds

// Treasure chests
export const TREASURE_CHEST_SPAWN_INTERVAL = 25;  // seconds between spawn attempts
export const TREASURE_CHEST_MAX_COUNT = 2;
export const TREASURE_CHEST_COAL_AMOUNT = 2;
export const TREASURE_CHEST_FOOD_AMOUNT = 2;  // fruit/berries
export const COAL_FUEL_VALUE = FIRE_FUEL_MAX;  // coal fills fire completely

// Crafting - fruit from trees = berries
export const CRAFTING_TABLE_SPAWN_ONCE = true;  // only one crafting table can exist
