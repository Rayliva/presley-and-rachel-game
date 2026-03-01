/**
 * House interior - top-down view with game stations
 * Player moves around, interacts with games. Fire/hunger paused while inside.
 */

import { PERKS, HOUSE_PERK_CHANCE } from './constants.js';

// House interior dimensions (pixels)
export const HOUSE_WIDTH = 320;
export const HOUSE_HEIGHT = 240;

// Player position inside house (top-down)
export const HOUSE_PLAYER_START = { x: HOUSE_WIDTH / 2 - 12, y: HOUSE_HEIGHT - 50 };
export const HOUSE_PLAYER_SPEED = 80;
export const HOUSE_INTERACTION_RANGE = 45;

// Game station positions (x, y, width, height) - top-down
export const GAME_STATIONS = [
  { id: 'tictactoe', x: 40, y: 50, w: 70, h: 70, name: 'Tic Tac Toe' },
  { id: 'connect4', x: 130, y: 40, w: 60, h: 80, name: 'Connect 4' },
  { id: 'sudoku', x: 210, y: 50, w: 90, h: 70, name: 'Sudoku' },
];

export const HOUSE_EXIT = { x: HOUSE_WIDTH / 2 - 30, y: HOUSE_HEIGHT - 30, w: 60, h: 25 };

export class HouseState {
  constructor(gameState) {
    this.gameState = gameState;
    this.playerX = HOUSE_PLAYER_START.x;
    this.playerY = HOUSE_PLAYER_START.y;
    this.activeGame = null;  // 'tictactoe' | 'connect4' | 'sudoku' | null
    this.gameData = null;   // state for the active mini-game
  }

  resetPosition() {
    this.playerX = HOUSE_PLAYER_START.x;
    this.playerY = HOUSE_PLAYER_START.y;
  }

  move(dx, dy, dt) {
    if (this.activeGame) return;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const scale = (HOUSE_PLAYER_SPEED * dt) / len;
      this.playerX = Math.max(20, Math.min(HOUSE_WIDTH - 20, this.playerX + dx * scale));
      this.playerY = Math.max(20, Math.min(HOUSE_HEIGHT - 20, this.playerY + dy * scale));
    }
  }

  getClosestInteractable() {
    if (this.activeGame) return null;
    const px = this.playerX;
    const py = this.playerY;

    // Exit door
    const exit = HOUSE_EXIT;
    if (px >= exit.x && px <= exit.x + exit.w && py >= exit.y && py <= exit.y + exit.h) {
      return { type: 'exit', obj: exit };
    }

    // Game stations
    for (const station of GAME_STATIONS) {
      const cx = station.x + station.w / 2;
      const cy = station.y + station.h / 2;
      const d = Math.hypot(px - cx, py - cy);
      if (d < HOUSE_INTERACTION_RANGE) {
        return { type: 'game', obj: station };
      }
    }
    return null;
  }

  interact() {
    const target = this.getClosestInteractable();
    if (!target) return false;

    if (target.type === 'exit') {
      this.gameState.exitHouse();
      return true;
    }
    if (target.type === 'game') {
      this.activeGame = target.obj.id;
      this.gameData = createGameState(target.obj.id);
      return true;
    }
    return false;
  }

  closeGame() {
    this.activeGame = null;
    this.gameData = null;
  }

  onGameWon() {
    if (Math.random() < HOUSE_PERK_CHANCE) {
      const available = PERKS.filter(p => !this.gameState.player.hasPerk(p.id));
      if (available.length > 0) {
        const perk = available[Math.floor(Math.random() * available.length)];
        this.gameState.player.addPerk(perk);
        return perk;
      }
    }
    return null;
  }
}

/** Create initial state for a mini-game */
function createGameState(gameId) {
  if (gameId === 'tictactoe') {
    return { board: Array(9).fill(null), turn: 'X', winner: null };
  }
  if (gameId === 'connect4') {
    return { cols: Array(7).fill(0).map(() => []), turn: 'R', winner: null };
  }
  if (gameId === 'sudoku') {
    return createSudokuState();
  }
  return null;
}

function createSudokuState() {
  // Simple 4x4 sudoku for faster gameplay
  const solution = [
    [1, 2, 3, 4],
    [3, 4, 1, 2],
    [2, 1, 4, 3],
    [4, 3, 2, 1],
  ];
  const board = solution.map(row => row.map(v => v));
  const locked = board.map(row => row.map(() => true));
  // Remove ~6 cells for puzzle (these become editable)
  let removed = 0;
  while (removed < 6) {
    const r = Math.floor(Math.random() * 4);
    const c = Math.floor(Math.random() * 4);
    if (locked[r][c]) {
      board[r][c] = 0;
      locked[r][c] = false;
      removed++;
    }
  }
  return { board, solution, locked, size: 4, winner: null };
}
