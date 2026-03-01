/**
 * Game state, entities, and logic for Campfire Survival
 */

import * as audio from './audio.js';
import {
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  PLAYER_SPEED,
  PLAYER_SIZE,
  INTERACTION_RANGE,
  FIRE_FUEL_MAX,
  FIRE_FUEL_CONSUMPTION,
  FIRE_LIGHT_MIN,
  FIRE_LIGHT_MAX,
  WOOD_FUEL_VALUE,
  HUNGER_MAX,
  HUNGER_DEPLETION,
  FRUIT_HUNGER_VALUE,
  MEAT_HUNGER_VALUE,
  TREE_WOOD_AMOUNT,
  TREE_CHOP_TIME,
  TREE_SHAKE_TIME,
  PIG_SPEED,
  PIG_FLEE_RANGE,
  PIG_MEAT_DROP,
  MEAT_COOK_TIME,
  WOLF_STATE,
  WOLF_WANDER_SPEED,
  WOLF_ATTACK_SPEED,
  WOLF_WANDER_CHANGE_INTERVAL,
  WOLF_ATTACK_RANGE,
  WOLF_DETECTION_RANGE,
  WOLF_MEAT_DROP,
  ORB_MAX_COUNT,
  ORB_SPAWN_INTERVAL,
  ORB_COLLECT_RANGE,
  ORB_EDGE_MARGIN,
  FORCEFIELD_DURATION,
  PIG_MAX_COUNT,
  PIG_RESPAWN_INTERVAL,
  WOLF_MAX_COUNT,
  WOLF_RESPAWN_INTERVAL,
  TREASURE_CHEST_SPAWN_INTERVAL,
  TREASURE_CHEST_MAX_COUNT,
  TREASURE_CHEST_COAL_AMOUNT,
  TREASURE_CHEST_FOOD_AMOUNT,
  COAL_FUEL_VALUE,
  COTTAGE_COUNT,
  PORCH_LIGHT_RADIUS,
  PERKS,
} from './constants.js';

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Campfire - central safe zone, consumes fuel, light radius varies with fuel
 * Can have meat cooking (raw) or ready to pick up (cooked)
 */
export class Campfire {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.fuel = FIRE_FUEL_MAX * 0.6;  // start with some fuel
    this.cookingMeat = 0;       // pieces currently cooking
    this.cookingProgress = 0;  // 0 to 1, when 1 a piece is done
    this.cookedMeatReady = 0;   // cooked pieces waiting to be picked up
  }

  getLightRadius(radiusMultiplier = 1) {
    if (this.fuel <= 0) return 0;
    const t = this.fuel / FIRE_FUEL_MAX;
    const base = FIRE_LIGHT_MIN + t * (FIRE_LIGHT_MAX - FIRE_LIGHT_MIN);
    return base * radiusMultiplier;
  }

  consumeFuel(dt, fireSlowPerk = false) {
    if (this.fuel > 0) {
      let rate = FIRE_FUEL_CONSUMPTION * dt;
      if (fireSlowPerk) rate *= 0.75;
      this.fuel -= rate;
      this.fuel = Math.max(0, this.fuel);
    }
  }

  addFuel(amount) {
    this.fuel = clamp(this.fuel + amount, 0, FIRE_FUEL_MAX);
  }

  isBurning() {
    return this.fuel > 0;
  }

  updateCooking(dt, cookFasterPerk = false) {
    if (this.cookingMeat <= 0) return;
    const cookTime = cookFasterPerk ? MEAT_COOK_TIME * 0.75 : MEAT_COOK_TIME;
    this.cookingProgress += dt / cookTime;
    while (this.cookingProgress >= 1 && this.cookingMeat > 0) {
      this.cookingProgress -= 1;
      this.cookingMeat--;
      this.cookedMeatReady++;
    }
    if (this.cookingMeat <= 0) this.cookingProgress = 0;
  }
}

/**
 * Cottage - little home at map edge with porch light that repels wolves (like fire)
 */
export class Cottage {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  getLightRadius() {
    return PORCH_LIGHT_RADIUS;
  }
}

/**
 * Tree - can be chopped for wood or shaken for fruit (if has fruit)
 */
export class Tree {
  constructor(x, y, hasFruit = false) {
    this.x = x;
    this.y = y;
    this.hasFruit = hasFruit;
    this.wood = TREE_WOOD_AMOUNT;
    this.chopped = false;
    this.shaken = false;
    this.interactProgress = 0;
    this.interacting = false;
  }

  canChop() {
    return !this.chopped && this.wood > 0;
  }

  canShake() {
    return this.hasFruit && !this.shaken && !this.chopped;
  }

  chop(dt) {
    this.interactProgress += dt;
    if (this.interactProgress >= TREE_CHOP_TIME) {
      this.interactProgress = 0;
      this.interacting = false;
      this.wood--;
      if (this.wood <= 0) this.chopped = true;
      return true;  // gave wood
    }
    return false;
  }

  shake(dt) {
    this.interactProgress += dt;
    if (this.interactProgress >= TREE_SHAKE_TIME) {
      this.interactProgress = 0;
      this.interacting = false;
      this.shaken = true;
      return true;  // gave fruit
    }
    return false;
  }
}

/**
 * Pig - wanders, flees from player, can be hunted for meat
 */
export class Pig {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.alive = true;
    this.vx = 0;
    this.vy = 0;
    this.wanderDir = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
  }

  update(dt, playerX, playerY) {
    if (!this.alive) return;
    const d = dist(this.x, this.y, playerX, playerY);
    if (d < PIG_FLEE_RANGE) {
      // Flee from player
      const angle = Math.atan2(this.y - playerY, this.x - playerX);
      this.vx = Math.cos(angle) * PIG_SPEED;
      this.vy = Math.sin(angle) * PIG_SPEED;
    } else {
      // Wander
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderDir = Math.random() * Math.PI * 2;
        this.wanderTimer = 0.5 + Math.random() * 1.5;
      }
      this.vx = Math.cos(this.wanderDir) * PIG_SPEED * 0.5;
      this.vy = Math.sin(this.wanderDir) * PIG_SPEED * 0.5;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, 20, MAP_WIDTH * TILE_SIZE - 20);
    this.y = clamp(this.y, 20, MAP_HEIGHT * TILE_SIZE - 20);
  }
}

/**
 * Wolf - state machine: WANDER or ATTACK. Attacks when player outside light.
 */
export class Wolf {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.alive = true;
    this.state = WOLF_STATE.WANDER;
    this.vx = 0;
    this.vy = 0;
    this.wanderDir = Math.random() * Math.PI * 2;
    this.wanderTimer = 0;
  }

  update(dt, playerX, playerY, playerInLight, lightSources) {
    if (!this.alive) return false;
    const dToPlayer = dist(this.x, this.y, playerX, playerY);

    if (playerInLight) {
      this.state = WOLF_STATE.WANDER;
    } else if (dToPlayer < WOLF_DETECTION_RANGE) {
      this.state = WOLF_STATE.ATTACK;
    } else {
      this.state = WOLF_STATE.WANDER;  // lose interest if player gets away
    }

    if (this.state === WOLF_STATE.ATTACK) {
      const angle = Math.atan2(playerY - this.y, playerX - this.x);
      this.vx = Math.cos(angle) * WOLF_ATTACK_SPEED;
      this.vy = Math.sin(angle) * WOLF_ATTACK_SPEED;
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderDir = Math.random() * Math.PI * 2;
        this.wanderTimer = WOLF_WANDER_CHANGE_INTERVAL * (0.5 + Math.random());
      }
      this.vx = Math.cos(this.wanderDir) * WOLF_WANDER_SPEED;
      this.vy = Math.sin(this.wanderDir) * WOLF_WANDER_SPEED;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Wolves avoid all light sources (fire + porch lights) - push out if inside any
    for (const light of lightSources) {
      if (light.radius <= 0) continue;
      const dToLight = dist(this.x, this.y, light.x, light.y);
      if (dToLight < light.radius) {
        const angleAway = Math.atan2(this.y - light.y, this.x - light.x);
        this.x = light.x + Math.cos(angleAway) * light.radius;
        this.y = light.y + Math.sin(angleAway) * light.radius;
      }
    }

    this.x = clamp(this.x, 20, MAP_WIDTH * TILE_SIZE - 20);
    this.y = clamp(this.y, 20, MAP_HEIGHT * TILE_SIZE - 20);

    return dToPlayer < WOLF_ATTACK_RANGE && !playerInLight;  // did wolf kill player?
  }
}

/**
 * Blue orb - spawns at map edge, collecting activates forcefield
 */
export class BlueOrb {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.collected = false;
  }
}

/**
 * Meat drop - raw meat on ground from forcefield-killed NPCs
 */
export class MeatDrop {
  constructor(x, y, amount) {
    this.x = x;
    this.y = y;
    this.amount = amount;
    this.collected = false;
  }
}

/**
 * Treasure chest - spawns occasionally, gives coal, food, and possibly crafting table (once)
 */
export class TreasureChest {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.opened = false;
  }
}

/**
 * Crafting table - placed once from treasure chest, opens crafting menu when interacted
 */
export class CraftingTable {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

/**
 * Player
 */
export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.hunger = HUNGER_MAX;
    this.wood = 0;
    this.fruit = 0;  // berries from trees
    this.rawMeat = 0;
    this.cookedMeat = 0;
    this.coal = 0;
    this.meals = [];  // crafted meals: { hungerValue }
    this.hasAxe = true;  // player starts with axe
    this.interactTarget = null;
    this.interactProgress = 0;
    this.perks = [];  // permanent perks from house games: [{ id, ... }]
  }

  hasPerk(perkId) {
    return this.perks.some(p => p.id === perkId);
  }

  addPerk(perk) {
    if (!this.hasPerk(perk.id)) {
      this.perks.push({ ...perk });
    }
  }

  getMeatTotal() {
    return this.rawMeat + this.cookedMeat;
  }

  consumeHunger(dt, hungerSlowPerk = false) {
    let rate = HUNGER_DEPLETION * dt;
    if (hungerSlowPerk) rate *= 0.75;
    this.hunger -= rate;
    this.hunger = Math.max(0, this.hunger);
  }

  eatFruit() {
    if (this.fruit > 0) {
      this.fruit--;
      this.hunger = clamp(this.hunger + FRUIT_HUNGER_VALUE, 0, HUNGER_MAX);
      return true;
    }
    return false;
  }

  eatCookedMeat() {
    if (this.cookedMeat > 0) {
      this.cookedMeat--;
      this.hunger = clamp(this.hunger + MEAT_HUNGER_VALUE, 0, HUNGER_MAX);
      return true;
    }
    return false;
  }

  eatMeal() {
    if (this.meals.length > 0) {
      const meal = this.meals.shift();
      this.hunger = clamp(this.hunger + meal.hungerValue, 0, HUNGER_MAX);
      return true;
    }
    return false;
  }

  move(dx, dy, dt) {
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const scale = (PLAYER_SPEED * dt) / len;
      this.x += dx * scale;
      this.y += dy * scale;
    }
    this.x = clamp(this.x, PLAYER_SIZE, MAP_WIDTH * TILE_SIZE - PLAYER_SIZE);
    this.y = clamp(this.y, PLAYER_SIZE, MAP_HEIGHT * TILE_SIZE - PLAYER_SIZE);
  }
}

/**
 * Game state - orchestrates all entities and rules
 */
export class GameState {
  constructor() {
    const centerX = (MAP_WIDTH * TILE_SIZE) / 2;
    const centerY = (MAP_HEIGHT * TILE_SIZE) / 2;

    this.campfire = new Campfire(centerX, centerY);
    this.player = new Player(centerX - 60, centerY);

    this.trees = this.spawnTrees();
    this.pigs = this.spawnPigs();
    this.wolves = this.spawnWolves();
    this.cottages = this.spawnCottages();

    this.orbs = [];
    this.meatDrops = [];
    this.treasureChests = [];
    this.craftingTable = null;  // only one per game, from treasure chest
    this.forcefieldActive = false;
    this.forcefieldEndTime = 0;
    this.orbSpawnTimer = ORB_SPAWN_INTERVAL * 0.5;  // first orb sooner
    this.pigRespawnTimer = PIG_RESPAWN_INTERVAL * 0.7;
    this.wolfRespawnTimer = WOLF_RESPAWN_INTERVAL * 0.7;
    this.treasureChestSpawnTimer = TREASURE_CHEST_SPAWN_INTERVAL;

    this.gameOver = false;
    this.gameOverReason = null;
    this.craftingMenuOpen = false;  // when true, game is paused
    this.inHouse = false;  // when true, inside cottage - fire/hunger paused
    this.currentCottage = null;  // which cottage we entered
  }

  /** Spawn cottages near map edges with porch lights */
  spawnCottages() {
    const w = MAP_WIDTH * TILE_SIZE;
    const h = MAP_HEIGHT * TILE_SIZE;
    const m = ORB_EDGE_MARGIN;
    // Fixed positions along edges - top, right, bottom, left
    const positions = [
      { x: m + 80, y: m },
      { x: w - m - 80, y: m },
      { x: w - m, y: m + 100 },
      { x: w - m, y: h - m - 100 },
      { x: m + 80, y: h - m },
      { x: w - m - 80, y: h - m },
      { x: m, y: m + 120 },
      { x: m, y: h - m - 120 },
    ].slice(0, COTTAGE_COUNT);
    return positions.map(({ x, y }) => new Cottage(x, y));
  }

  /** Pick random position along map edge */
  pickEdgePosition() {
    const w = MAP_WIDTH * TILE_SIZE;
    const h = MAP_HEIGHT * TILE_SIZE;
    const m = ORB_EDGE_MARGIN;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) return { x: m + Math.random() * (w - 2 * m), y: m };
    if (side === 1) return { x: w - m, y: m + Math.random() * (h - 2 * m) };
    if (side === 2) return { x: m + Math.random() * (w - 2 * m), y: h - m };
    return { x: m, y: m + Math.random() * (h - 2 * m) };
  }

  spawnOrb() {
    if (this.orbs.length >= ORB_MAX_COUNT) return;
    const { x, y } = this.pickEdgePosition();
    this.orbs.push(new BlueOrb(x, y));
  }

  getForcefieldRadius() {
    const fireMult = this.player.hasPerk('fire_radius') ? 1.2 : 1;
    return this.campfire.getLightRadius(fireMult);
  }

  spawnTrees() {
    const trees = [];
    const positions = [
      [4, 4], [8, 3], [12, 5], [16, 4], [20, 6],
      [5, 10], [10, 12], [15, 10], [19, 11],
      [3, 14], [7, 15], [14, 14], [18, 16],
    ];
    for (const [gx, gy] of positions) {
      const x = gx * TILE_SIZE + TILE_SIZE / 2;
      const y = gy * TILE_SIZE + TILE_SIZE / 2;
      trees.push(new Tree(x, y, Math.random() < 0.5));
    }
    return trees;
  }

  spawnPigs() {
    const pigs = [];
    for (let i = 0; i < 4; i++) {
      const x = 80 + Math.random() * (MAP_WIDTH * TILE_SIZE - 160);
      const y = 80 + Math.random() * (MAP_HEIGHT * TILE_SIZE - 160);
      pigs.push(new Pig(x, y));
    }
    return pigs;
  }

  spawnWolves() {
    const wolves = [];
    for (let i = 0; i < 3; i++) {
      const x = 40 + Math.random() * (MAP_WIDTH * TILE_SIZE - 80);
      const y = 40 + Math.random() * (MAP_HEIGHT * TILE_SIZE - 80);
      wolves.push(new Wolf(x, y));
    }
    return wolves;
  }

  spawnOnePig() {
    const x = 80 + Math.random() * (MAP_WIDTH * TILE_SIZE - 160);
    const y = 80 + Math.random() * (MAP_HEIGHT * TILE_SIZE - 160);
    return new Pig(x, y);
  }

  spawnOneWolf() {
    const x = 40 + Math.random() * (MAP_WIDTH * TILE_SIZE - 80);
    const y = 40 + Math.random() * (MAP_HEIGHT * TILE_SIZE - 80);
    return new Wolf(x, y);
  }

  spawnTreasureChest() {
    if (this.treasureChests.length >= TREASURE_CHEST_MAX_COUNT) return;
    const x = 60 + Math.random() * (MAP_WIDTH * TILE_SIZE - 120);
    const y = 60 + Math.random() * (MAP_HEIGHT * TILE_SIZE - 120);
    this.treasureChests.push(new TreasureChest(x, y));
  }

  isPlayerInLight() {
    // Fire light (perk: Bright Flame)
    const fireMult = this.player.hasPerk('fire_radius') ? 1.2 : 1;
    const fireR = this.campfire.getLightRadius(fireMult);
    if (dist(this.player.x, this.player.y, this.campfire.x, this.campfire.y) <= fireR) return true;
    // Porch lights
    for (const cottage of this.cottages) {
      if (dist(this.player.x, this.player.y, cottage.x, cottage.y) <= cottage.getLightRadius()) return true;
    }
    return false;
  }

  getClosestInteractable() {
    const px = this.player.x;
    const py = this.player.y;
    let closest = null;
    let closestDist = INTERACTION_RANGE;

    // Fire - add fuel (wood/coal), add raw meat to cook, or pick up cooked meat
    const dFire = dist(px, py, this.campfire.x, this.campfire.y);
    if (dFire < closestDist) {
      if (this.player.wood > 0 || this.player.coal > 0 || this.player.rawMeat > 0 || this.campfire.cookedMeatReady > 0) {
        closest = { type: 'fire', dist: dFire, obj: this.campfire };
        closestDist = dFire;
      }
    }

    // Treasure chests
    for (const chest of this.treasureChests) {
      const d = dist(px, py, chest.x, chest.y);
      if (d < closestDist && !chest.opened) {
        closest = { type: 'treasureChest', dist: d, obj: chest };
        closestDist = d;
      }
    }

    // Crafting table
    if (this.craftingTable) {
      const d = dist(px, py, this.craftingTable.x, this.craftingTable.y);
      if (d < closestDist) {
        closest = { type: 'craftingTable', dist: d, obj: this.craftingTable };
        closestDist = d;
      }
    }

    // Cottages - enter house
    for (const cottage of this.cottages) {
      const d = dist(px, py, cottage.x, cottage.y);
      if (d < closestDist) {
        closest = { type: 'cottage', dist: d, obj: cottage };
        closestDist = d;
      }
    }

    // Trees
    for (const tree of this.trees) {
      const d = dist(px, py, tree.x, tree.y);
      if (d < closestDist && (tree.canChop() || tree.canShake())) {
        closest = { type: 'tree', dist: d, obj: tree };
        closestDist = d;
      }
    }

    // Pigs
    for (const pig of this.pigs) {
      const d = dist(px, py, pig.x, pig.y);
      if (d < closestDist && pig.alive) {
        closest = { type: 'pig', dist: d, obj: pig };
        closestDist = d;
      }
    }

    return closest;
  }

  startInteract() {
    const target = this.getClosestInteractable();
    if (!target) return false;

    // Fire and pig are instant
    if (target.type === 'fire') {
      if (this.campfire.cookedMeatReady > 0) {
        this.campfire.cookedMeatReady--;
        this.player.cookedMeat++;
      } else if (this.player.coal > 0) {
        this.player.coal--;
        this.campfire.addFuel(COAL_FUEL_VALUE);  // coal fills fire completely
      } else if (this.player.wood > 0) {
        this.player.wood--;
        this.campfire.addFuel(WOOD_FUEL_VALUE);
      } else if (this.player.rawMeat > 0) {
        this.player.rawMeat--;
        this.campfire.cookingMeat++;
      }
      return true;
    }
    if (target.type === 'treasureChest') {
      audio.playChestOpen();
      target.obj.opened = true;
      this.player.coal += TREASURE_CHEST_COAL_AMOUNT;
      this.player.fruit += TREASURE_CHEST_FOOD_AMOUNT;
      if (!this.craftingTable) {
        this.craftingTable = new CraftingTable(target.obj.x + 28, target.obj.y);
      }
      return true;
    }
    if (target.type === 'craftingTable') {
      this.craftingMenuOpen = true;
      return true;
    }
    if (target.type === 'cottage') {
      this.inHouse = true;
      this.currentCottage = target.obj;
      return true;
    }
    if (target.type === 'pig') {
      target.obj.alive = false;
      let meat = PIG_MEAT_DROP;
      if (this.player.hasPerk('meat_extra')) meat++;
      this.player.rawMeat += meat;
      return true;
    }

    // Tree requires progress
    if (target.type === 'tree') {
      this.player.interactTarget = target;
      this.player.interactProgress = 0;
      target.obj.interacting = true;
      target.obj.interactProgress = 0;
      return true;
    }
    return false;
  }

  updateInteract(dt) {
    const t = this.player.interactTarget;
    if (!t || t.type !== 'tree') return;

    const tree = t.obj;
    if (tree.canShake()) {
      if (tree.shake(dt)) {
        let berries = 1;
        if (this.player.hasPerk('berries_double')) berries++;
        if (this.player.hasPerk('fruit_extra')) berries++;
        this.player.fruit += berries;
      }
    } else if (tree.canChop()) {
      if (tree.chop(dt)) {
        audio.playChop();
        let wood = 1;
        if (this.player.hasPerk('wood_extra')) wood++;
        this.player.wood += wood;
      }
    }
    if (!tree.interacting) {
      this.player.interactTarget = null;
    }
  }

  tryEat() {
    if (this.player.meals.length > 0) {
      return this.player.eatMeal();
    }
    if (this.player.cookedMeat > 0) {
      return this.player.eatCookedMeat();
    }
    if (this.player.fruit > 0) {
      return this.player.eatFruit();
    }
    return false;
  }

  /** Crafting recipes: { rawMeat, cookedMeat, fruit } -> { hungerValue } */
  static CRAFTING_RECIPES = [
    { rawMeat: 0, cookedMeat: 0, fruit: 2, hungerValue: 40, name: 'Berry Salad' },
    { rawMeat: 2, cookedMeat: 0, fruit: 0, hungerValue: 60, name: 'Meat Skewer' },
    { rawMeat: 1, cookedMeat: 0, fruit: 1, hungerValue: 55, name: 'Simple Stew' },
    { rawMeat: 2, cookedMeat: 0, fruit: 2, hungerValue: 75, name: 'Meat Stew' },
    { rawMeat: 0, cookedMeat: 2, fruit: 0, hungerValue: 85, name: 'Grilled Feast' },
    { rawMeat: 0, cookedMeat: 1, fruit: 1, hungerValue: 90, name: 'Hearty Meal' },
    { rawMeat: 0, cookedMeat: 2, fruit: 2, hungerValue: 100, name: 'Grand Feast' },
  ];

  canCraft(recipe) {
    return this.player.rawMeat >= recipe.rawMeat &&
      this.player.cookedMeat >= recipe.cookedMeat &&
      this.player.fruit >= recipe.fruit;
  }

  craft(recipe) {
    if (!this.canCraft(recipe)) return false;
    this.player.rawMeat -= recipe.rawMeat;
    this.player.cookedMeat -= recipe.cookedMeat;
    this.player.fruit -= recipe.fruit;
    this.player.meals.push({ hungerValue: recipe.hungerValue });
    return true;
  }

  closeCraftingMenu() {
    this.craftingMenuOpen = false;
  }

  exitHouse() {
    this.inHouse = false;
    this.currentCottage = null;
  }

  update(dt, input) {
    if (this.gameOver || this.craftingMenuOpen || this.inHouse) return;

    // Eat food (F key)
    if (input.keys.eat) {
      this.tryEat();
    }

    // Interact (E key) - only when not already interacting with tree
    if (input.keys.e && !this.player.interactTarget) {
      this.startInteract();
    }

    // Player movement
    let dx = 0, dy = 0;
    if (input.keys.w) dy -= 1;
    if (input.keys.s) dy += 1;
    if (input.keys.a) dx -= 1;
    if (input.keys.d) dx += 1;

    if (this.player.interactTarget) {
      this.updateInteract(dt);
    } else {
      this.player.move(dx, dy, dt);
    }

    // Consume hunger (perk: Iron Stomach)
    this.player.consumeHunger(dt, this.player.hasPerk('hunger_slow'));

    // Fire consumes fuel and cooks meat (perks: Fire Keeper, Master Chef)
    this.campfire.consumeFuel(dt, this.player.hasPerk('fire_slow'));
    this.campfire.updateCooking(dt, this.player.hasPerk('cook_faster'));

    // Spawn blue orbs occasionally at map edge
    this.orbSpawnTimer -= dt;
    if (this.orbSpawnTimer <= 0) {
      this.orbSpawnTimer = ORB_SPAWN_INTERVAL;
      this.spawnOrb();
    }

    // Respawn pigs up to max count
    const alivePigs = this.pigs.filter(p => p.alive).length;
    if (alivePigs < PIG_MAX_COUNT) {
      this.pigRespawnTimer -= dt;
      if (this.pigRespawnTimer <= 0) {
        this.pigRespawnTimer = PIG_RESPAWN_INTERVAL;
        this.pigs.push(this.spawnOnePig());
      }
    }

    // Respawn wolves up to max count
    const aliveWolves = this.wolves.filter(w => w.alive).length;
    if (aliveWolves < WOLF_MAX_COUNT) {
      this.wolfRespawnTimer -= dt;
      if (this.wolfRespawnTimer <= 0) {
        this.wolfRespawnTimer = WOLF_RESPAWN_INTERVAL;
        this.wolves.push(this.spawnOneWolf());
      }
    }

    // Spawn treasure chests occasionally
    this.treasureChestSpawnTimer -= dt;
    if (this.treasureChestSpawnTimer <= 0) {
      this.treasureChestSpawnTimer = TREASURE_CHEST_SPAWN_INTERVAL;
      this.spawnTreasureChest();
    }

    // Collect blue orbs
    for (const orb of this.orbs) {
      if (!orb.collected && dist(this.player.x, this.player.y, orb.x, orb.y) < ORB_COLLECT_RANGE) {
        orb.collected = true;
        this.forcefieldActive = true;
        this.forcefieldEndTime = (this.forcefieldEndTime > 0 ? this.forcefieldEndTime : 0) + FORCEFIELD_DURATION;
      }
    }
    this.orbs = this.orbs.filter(o => !o.collected);

    // Forcefield duration
    if (this.forcefieldActive && this.forcefieldEndTime > 0) {
      this.forcefieldEndTime -= dt;
      if (this.forcefieldEndTime <= 0) this.forcefieldActive = false;
    }

    // Update pigs
    const ffRadius = this.forcefieldActive ? this.getForcefieldRadius() : 0;
    for (const pig of this.pigs) {
      if (this.forcefieldActive && pig.alive) {
        const dToCenter = dist(pig.x, pig.y, this.campfire.x, this.campfire.y);
        if (dToCenter <= ffRadius) {
          pig.alive = false;
          let meat = PIG_MEAT_DROP + (this.player.hasPerk('meat_extra') ? 1 : 0);
          this.meatDrops.push(new MeatDrop(pig.x, pig.y, meat));
        }
      }
      pig.update(dt, this.player.x, this.player.y);
    }

    // Update wolves - forcefield kills them if they touch it
    const playerInLight = this.isPlayerInLight();
    for (const wolf of this.wolves) {
      if (this.forcefieldActive && wolf.alive) {
        const dToCenter = dist(wolf.x, wolf.y, this.campfire.x, this.campfire.y);
        if (dToCenter <= ffRadius) {
          wolf.alive = false;
          let meat = WOLF_MEAT_DROP + (this.player.hasPerk('meat_extra') ? 1 : 0);
          this.meatDrops.push(new MeatDrop(wolf.x, wolf.y, meat));
          continue;
        }
      }
      if (!wolf.alive) continue;
      const fireMult = this.player.hasPerk('fire_radius') ? 1.2 : 1;
      const lightSources = [
        { x: this.campfire.x, y: this.campfire.y, radius: this.campfire.getLightRadius(fireMult) },
        ...this.cottages.map(c => ({ x: c.x, y: c.y, radius: c.getLightRadius() })),
      ];
      const killed = wolf.update(dt, this.player.x, this.player.y, playerInLight, lightSources);
      if (killed) {
        this.gameOver = true;
        this.gameOverReason = 'A wolf attacked you in the darkness!';
        return;
      }
    }

    // Collect meat drops
    for (const drop of this.meatDrops) {
      if (!drop.collected && dist(this.player.x, this.player.y, drop.x, drop.y) < ORB_COLLECT_RANGE) {
        drop.collected = true;
        this.player.rawMeat += drop.amount;
      }
    }
    this.meatDrops = this.meatDrops.filter(d => !d.collected);

    // Game over conditions
    if (!this.campfire.isBurning()) {
      this.gameOver = true;
      this.gameOverReason = 'The fire went out...';
      return;
    }
    if (this.player.hunger <= 0) {
      this.gameOver = true;
      this.gameOverReason = 'You starved to death.';
      return;
    }
  }
}
