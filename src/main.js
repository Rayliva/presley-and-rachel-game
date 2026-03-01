/**
 * Campfire Survival - Entry point and game loop
 */

import { GameState } from './game.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { HouseState } from './house.js';
import { renderHouseInterior } from './house-renderer.js';
import { playTicTacToe, playConnect4, playSudoku } from './house-games.js';
import * as audio from './audio.js';
import { FIRE_FUEL_MAX, HUNGER_MAX, WOLF_STATE, PERKS } from './constants.js';

let gameState;
let renderer;
let inputHandler;
let houseState;
let houseCanvas;
let houseCtx;
let lastTime = 0;
let wasGameOver = false;
let wolfGrowlCooldown = 0;

function updateHUD() {
  if (!gameState) return;
  const { player, campfire, inHouse } = gameState;
  const hungerEl = document.getElementById('hunger-bar');
  const fuelEl = document.getElementById('fuel-bar');
  if (inHouse) {
    hungerEl.style.opacity = '0.6';
    fuelEl.style.opacity = '0.6';
  } else {
    hungerEl.style.opacity = '1';
    fuelEl.style.opacity = '1';
  }
  document.getElementById('hunger-bar').style.width = `${(player.hunger / HUNGER_MAX) * 100}%`;
  document.getElementById('fuel-bar').style.width = `${(campfire.fuel / FIRE_FUEL_MAX) * 100}%`;
  document.getElementById('wood-count').textContent = player.wood;
  document.getElementById('coal-count').textContent = player.coal;
  document.getElementById('fruit-count').textContent = player.fruit;
  document.getElementById('raw-meat-count').textContent = player.rawMeat;
  document.getElementById('cooked-meat-count').textContent = player.cookedMeat;
  document.getElementById('meals-count').textContent = player.meals.length;
  updatePerksBar();
}

function updatePerksBar() {
  const bar = document.getElementById('perks-bar');
  if (!bar || !gameState) return;
  bar.innerHTML = '';
  for (const perk of gameState.player.perks) {
    const def = PERKS.find(p => p.id === perk.id) || perk;
    const div = document.createElement('div');
    div.className = 'perk-icon';
    div.textContent = def.icon || '⭐';
    div.title = def.description || def.name;
    const tooltip = document.createElement('span');
    tooltip.className = 'perk-tooltip';
    tooltip.textContent = `${def.name}: ${def.description}`;
    div.appendChild(tooltip);
    bar.appendChild(div);
  }
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
  hideHouseOverlay();
  hideHouseGameOverlay();
  audio.stopFireCrackling();
  inputHandler?.destroy();
  const canvas = document.getElementById('game-canvas');
  gameState = new GameState();
  renderer = new Renderer(canvas, gameState);
  inputHandler = new InputHandler();
  houseState = null;
  houseCanvas = null;
  houseCtx = null;
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

function showHouseOverlay() {
  houseState = new HouseState(gameState);
  const overlay = document.getElementById('house-overlay');
  overlay.classList.remove('hidden');
  houseCanvas = document.getElementById('house-canvas');
  houseCanvas.width = 640;
  houseCanvas.height = 480;
  houseCtx = houseCanvas.getContext('2d');
}

function hideHouseOverlay() {
  document.getElementById('house-overlay').classList.add('hidden');
  houseState = null;
}

let houseGameOverlayKeyHandler = null;

function showHouseGameOverlay(gameId, gameData) {
  const overlay = document.getElementById('house-game-overlay');
  const content = document.getElementById('house-game-content');
  overlay.classList.remove('hidden');
  renderHouseGame(content, gameId, gameData);

  // Add direct key listener so E/ESC reliably close (avoids timing/focus issues)
  if (houseGameOverlayKeyHandler) {
    document.removeEventListener('keydown', houseGameOverlayKeyHandler);
  }
  houseGameOverlayKeyHandler = (e) => {
    if (e.key === 'Escape' || e.key.toLowerCase() === 'e') {
      hideHouseGameOverlay();
      e.preventDefault();
      e.stopPropagation();
    }
  };
  document.addEventListener('keydown', houseGameOverlayKeyHandler, { capture: true });
}

function hideHouseGameOverlay() {
  const overlay = document.getElementById('house-game-overlay');
  overlay.classList.add('hidden');
  if (houseState) {
    houseState.closeGame();
  }
  if (houseGameOverlayKeyHandler) {
    document.removeEventListener('keydown', houseGameOverlayKeyHandler, { capture: true });
    houseGameOverlayKeyHandler = null;
  }
}

function renderHouseGame(container, gameId, data) {
  container.innerHTML = '';
  const h2 = document.createElement('h2');
  h2.textContent = gameId === 'tictactoe' ? 'Tic Tac Toe' : gameId === 'connect4' ? 'Connect 4' : 'Sudoku';
  container.appendChild(h2);

  if (gameId === 'tictactoe') {
    const board = document.createElement('div');
    board.className = 'game-board';
    board.style.gridTemplateColumns = 'repeat(3, 1fr)';
    for (let i = 0; i < 9; i++) {
      const cell = document.createElement('div');
      cell.className = 'game-cell' + (data.board[i] ? ` ${data.board[i].toLowerCase()}` : '');
      cell.textContent = data.board[i] || '';
      cell.dataset.index = i;
      if (!data.board[i] && !data.winner) {
        cell.addEventListener('click', () => handleTicTacToeClick(i));
      }
      board.appendChild(cell);
    }
    container.appendChild(board);
  } else if (gameId === 'connect4') {
    const board = document.createElement('div');
    board.className = 'game-board';
    board.style.display = 'flex';
    board.style.gap = '4px';
    for (let c = 0; c < 7; c++) {
      const col = document.createElement('div');
      col.style.display = 'flex';
      col.style.flexDirection = 'column-reverse';
      col.style.gap = '2px';
      col.style.alignItems = 'center';
      for (let r = 0; r < 6; r++) {
        const cell = document.createElement('div');
        const val = data.cols[c][r] || null;
        cell.className = 'game-cell' + (val ? ` ${val.toLowerCase()}` : '');
        cell.textContent = val || '';
        cell.style.width = '36px';
        cell.style.height = '36px';
        col.appendChild(cell);
      }
      if (!data.winner) {
        const btn = document.createElement('button');
        btn.className = 'game-cell';
        btn.textContent = '↓';
        btn.style.cursor = 'pointer';
        btn.style.fontSize = '1.2rem';
        btn.addEventListener('click', () => handleConnect4Click(c));
        col.appendChild(btn);
      }
      board.appendChild(col);
    }
    container.appendChild(board);
  } else if (gameId === 'sudoku') {
    const board = document.createElement('div');
    board.className = 'game-board';
    board.style.gridTemplateColumns = 'repeat(4, 1fr)';
    const sel = data.selectedCell;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cell = document.createElement('div');
        const isSel = sel && sel[0] === r && sel[1] === c;
        cell.className = 'game-cell' + (data.locked[r][c] ? ' locked' : '') + (isSel ? ' selected' : '');
        cell.textContent = data.board[r][c] || '';
        cell.dataset.row = r;
        cell.dataset.col = c;
        if (!data.locked[r][c] && !data.winner) {
          cell.addEventListener('click', () => handleSudokuClick(r, c));
        }
        board.appendChild(cell);
      }
    }
    container.appendChild(board);
    const numRow = document.createElement('div');
    numRow.style.display = 'flex';
    numRow.style.gap = '8px';
    numRow.style.justifyContent = 'center';
    numRow.style.marginTop = '8px';
    for (let n = 1; n <= 4; n++) {
      const btn = document.createElement('button');
      btn.className = 'game-cell';
      btn.textContent = n;
      btn.style.cursor = 'pointer';
      btn.dataset.value = n;
      btn.addEventListener('click', () => {
        if (houseState?.gameData?.selectedCell) {
          const [sr, sc] = houseState.gameData.selectedCell;
          houseState.gameData = playSudoku(houseState.gameData, sr, sc, n);
          houseState.gameData.selectedCell = null;
          renderHouseGame(container, 'sudoku', houseState.gameData);
        }
      });
      numRow.appendChild(btn);
    }
    container.appendChild(numRow);
  }

  if (data.winner) {
    const result = document.createElement('div');
    result.className = 'game-result';
    if (data.winner === 'X' || data.winner === 'x' || data.winner === 'R') {
      result.textContent = 'You win!';
      result.classList.add('win');
      const perk = houseState?.onGameWon?.();
      if (perk) {
        const p = document.createElement('p');
        p.className = 'game-result perk';
        p.textContent = `You earned: ${perk.name}!`;
        container.appendChild(p);
      }
    } else if (data.winner === 'O' || data.winner === 'o' || data.winner === 'Y') {
      result.textContent = 'You lose!';
      result.classList.add('lose');
    } else if (data.winner === 'tie') {
      result.textContent = "It's a tie!";
      result.classList.add('tie');
    }
    container.appendChild(result);
  }

  const closeBtn = document.createElement('button');
  closeBtn.className = 'house-game-close';
  closeBtn.textContent = data.winner ? 'Close' : 'Close (E or ESC)';
  closeBtn.addEventListener('click', hideHouseGameOverlay);
  container.appendChild(closeBtn);
}

function handleTicTacToeClick(index) {
      if (!houseState?.gameData?.winner) {
        houseState.gameData = playTicTacToe(houseState.gameData, index);
        const content = document.getElementById('house-game-content');
        renderHouseGame(content, 'tictactoe', houseState.gameData);
      }
}

function handleConnect4Click(col) {
      if (!houseState?.gameData?.winner) {
        houseState.gameData = playConnect4(houseState.gameData, col);
        const content = document.getElementById('house-game-content');
        renderHouseGame(content, 'connect4', houseState.gameData);
      }
}

function handleSudokuClick(row, col) {
  if (!houseState?.gameData || houseState.gameData.winner || houseState.gameData.locked[row][col]) return;
  houseState.gameData.selectedCell = [row, col];
  const content = document.getElementById('house-game-content');
  renderHouseGame(content, 'sudoku', houseState.gameData);
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

  if (gameState.inHouse) {
    if (!houseState) showHouseOverlay();
    if (houseState) {
      if (houseState.activeGame) {
        // E/ESC handled by direct key listener on overlay
      } else {
        let dx = 0, dy = 0;
        if (inputHandler.keys.w) dy -= 1;
        if (inputHandler.keys.s) dy += 1;
        if (inputHandler.keys.a) dx -= 1;
        if (inputHandler.keys.d) dx += 1;
        houseState.move(dx, dy, dt);
        if (inputHandler.keys.e) {
          const didInteract = houseState.interact();
          if (didInteract && houseState.activeGame) {
            showHouseGameOverlay(houseState.activeGame, houseState.gameData);
          } else if (didInteract && !gameState.inHouse) {
            // Exited via door
            hideHouseOverlay();
            houseState = null;
          }
        }
      }
    }
  } else if (!gameState.inHouse && houseState) {
    // Exited house (e.g. via door) - clean up
    hideHouseOverlay();
    hideHouseGameOverlay();
    houseState = null;
  } else if (!gameState.gameOver && !gameState.craftingMenuOpen) {
    gameState.update(dt, inputHandler);
  }
  inputHandler.consumeOneShotKeys();

  // Fire crackling volume scales with fuel (muted when in house)
  const vol = gameState.inHouse ? 0 : gameState.campfire.fuel / FIRE_FUEL_MAX;
  audio.setFireVolume(vol);

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

  if (gameState.inHouse && houseState && houseCanvas && houseCtx) {
    houseCtx.fillStyle = '#3e2723';
    houseCtx.fillRect(0, 0, houseCanvas.width, houseCanvas.height);
    renderHouseInterior(houseCtx, houseState, houseCanvas.width, houseCanvas.height);
  } else {
    renderer.render();
  }
  updateHUD();

  if (gameState.craftingMenuOpen) {
    showCraftingMenu();
  }

  if (gameState.inHouse) {
    const overlay = document.getElementById('house-overlay');
    if (!houseState?.activeGame) overlay.classList.remove('hidden');
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
    if (e.key === 'Escape') {
      if (houseState?.activeGame) {
        hideHouseGameOverlay();
        e.preventDefault();
      } else if (gameState?.craftingMenuOpen) {
        hideCraftingMenu();
        e.preventDefault();
      }
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
