/**
 * Campfire Survival - Entry point and game loop
 */

import { GameState } from './game.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { FIRE_FUEL_MAX, HUNGER_MAX } from './constants.js';

let gameState;
let renderer;
let inputHandler;
let lastTime = 0;

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
  inputHandler?.destroy();
  const canvas = document.getElementById('game-canvas');
  gameState = new GameState();
  renderer = new Renderer(canvas, gameState);
  inputHandler = new InputHandler();
  lastTime = performance.now();
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
