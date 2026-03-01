/**
 * Campfire Survival - Entry point and game loop
 */

import { GameState } from './game.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import * as audio from './audio.js';
import { FIRE_FUEL_MAX, HUNGER_MAX, WOLF_STATE } from './constants.js';

let gameState;
let renderer;
let inputHandler;
let lastTime = 0;
let wasGameOver = false;
let wolfGrowlCooldown = 0;

function updateHUD() {
  const { player, campfire } = gameState;
  document.getElementById('hunger-bar').style.width = `${(player.hunger / HUNGER_MAX) * 100}%`;
  document.getElementById('fuel-bar').style.width = `${(campfire.fuel / FIRE_FUEL_MAX) * 100}%`;
  document.getElementById('wood-count').textContent = player.wood;
  document.getElementById('coal-count').textContent = player.coal;
  document.getElementById('fruit-count').textContent = player.fruit;
  document.getElementById('raw-meat-count').textContent = player.rawMeat;
  document.getElementById('cooked-meat-count').textContent = player.cookedMeat;
  document.getElementById('meals-count').textContent = player.meals.length;
}

function showGameOver() {
  const overlay = document.getElementById('game-over-overlay');
  const msg = document.getElementById('game-over-message');
  msg.textContent = gameState.gameOverReason || 'Game Over';
  overlay.classList.remove('hidden');
}

function hideGameOver() {
  document.getElementById('game-over-overlay').classList.add('hidden');
}

function startGame() {
  hideGameOver();
  hideCraftingMenu();
  audio.stopFireCrackling();
  inputHandler?.destroy();
  const canvas = document.getElementById('game-canvas');
  gameState = new GameState();
  renderer = new Renderer(canvas, gameState);
  inputHandler = new InputHandler();
  lastTime = performance.now();
  wasGameOver = false;
  wolfGrowlCooldown = 0;
  audio.startFireCrackling();
}

function showCraftingMenu() {
  const overlay = document.getElementById('crafting-overlay');
  const wasHidden = overlay.classList.contains('hidden');
  overlay.classList.remove('hidden');
  if (wasHidden) {
    renderCraftingRecipes();
  }
}

function hideCraftingMenu() {
  document.getElementById('crafting-overlay').classList.add('hidden');
  if (gameState) gameState.closeCraftingMenu();
}

function renderCraftingRecipes() {
  const container = document.getElementById('crafting-recipes');
  container.innerHTML = '';
  for (const recipe of GameState.CRAFTING_RECIPES) {
    const div = document.createElement('div');
    div.className = 'crafting-recipe' + (gameState.canCraft(recipe) ? ' can-craft' : '');
    const cost = [];
    if (recipe.rawMeat) cost.push(`${recipe.rawMeat} raw meat`);
    if (recipe.cookedMeat) cost.push(`${recipe.cookedMeat} cooked meat`);
    if (recipe.fruit) cost.push(`${recipe.fruit} berries`);
    div.innerHTML = `
      <div class="recipe-info">
        <strong>${recipe.name}</strong> (+${recipe.hungerValue} hunger)
        <div class="recipe-cost">${cost.join(', ')}</div>
      </div>
      <button type="button" data-recipe-index="${GameState.CRAFTING_RECIPES.indexOf(recipe)}" ${!gameState.canCraft(recipe) ? 'disabled' : ''}>Craft</button>
    `;
    const btn = div.querySelector('button');
    btn.addEventListener('click', () => {
      if (gameState.craft(recipe)) {
        renderCraftingRecipes();
        updateHUD();
      }
    });
    container.appendChild(div);
  }
}

function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  if (!gameState.gameOver && !gameState.craftingMenuOpen) {
    gameState.update(dt, inputHandler);
  }
  inputHandler.consumeOneShotKeys();

  // Fire crackling volume scales with fuel
  audio.setFireVolume(gameState.campfire.fuel / FIRE_FUEL_MAX);

  // Wolf growl when wolves are close (ATTACK state)
  wolfGrowlCooldown -= dt;
  if (wolfGrowlCooldown <= 0) {
    const attackingWolf = gameState.wolves.find(
      w => w.alive && w.state === WOLF_STATE.ATTACK
    );
    if (attackingWolf) {
      const d = Math.hypot(
        attackingWolf.x - gameState.player.x,
        attackingWolf.y - gameState.player.y
      );
      if (d < 200) {
        audio.playWolfGrowl();
        wolfGrowlCooldown = 2;
      }
    }
  }

  // Death OOF when game over
  if (gameState.gameOver && !wasGameOver) {
    wasGameOver = true;
    audio.playDeathOof();
    audio.stopFireCrackling();
  }

  renderer.render();
  updateHUD();

  if (gameState.craftingMenuOpen) {
    showCraftingMenu();
  }

  if (gameState.gameOver) {
    showGameOver();
    return;
  }

  requestAnimationFrame(gameLoop);
}

function init() {
  const canvas = document.getElementById('game-canvas');
  canvas.width = 800;
  canvas.height = 600;

  // Resume audio on first user interaction (browser autoplay policy)
  const resumeAudio = () => {
    audio.resumeAudio();
    document.removeEventListener('click', resumeAudio);
    document.removeEventListener('keydown', resumeAudio);
  };
  document.addEventListener('click', resumeAudio);
  document.addEventListener('keydown', resumeAudio);

  startGame();

  document.getElementById('restart-btn').addEventListener('click', () => {
    startGame();
    requestAnimationFrame(gameLoop);
  });

  document.getElementById('crafting-close-btn').addEventListener('click', hideCraftingMenu);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameState?.craftingMenuOpen) {
      hideCraftingMenu();
      e.preventDefault();
    }
  });

  window.addEventListener('resize', () => {
    if (renderer) {
      renderer.resize();
      renderer.render();
    }
  });

  requestAnimationFrame(gameLoop);
}

init();
