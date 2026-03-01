/**
 * House interior - top-down view with game stations
 * Each house has ONE game. Cottage index determines which game.
 */

import { PERKS, HOUSE_PERK_CHANCE } from './constants.js';

// House interior dimensions (pixels)
export const HOUSE_WIDTH = 320;
export const HOUSE_HEIGHT = 240;

// Player position inside house (top-down)
export const HOUSE_PLAYER_START = { x: HOUSE_WIDTH / 2 - 12, y: HOUSE_HEIGHT - 50 };
export const HOUSE_PLAYER_SPEED = 80;
export const HOUSE_INTERACTION_RANGE = 45;

// Each cottage has a different game: tictactoe, connect4, sudoku, hangman, dotsandboxes, presleytest
export const HOUSE_GAMES = ['tictactoe', 'connect4', 'sudoku', 'hangman', 'dotsandboxes', 'presleytest'];

export const GAME_NAMES = {
  tictactoe: 'Tic Tac Toe',
  connect4: 'Connect 4',
  sudoku: 'Sudoku',
  hangman: 'Hangman',
  dotsandboxes: 'Dots and Boxes',
  presleytest: 'Hide and Seek',
};

/** Get the single game station for a house (centered) */
export function getGameStationForHouse(cottageIndex) {
  const gameId = HOUSE_GAMES[cottageIndex % HOUSE_GAMES.length] || 'tictactoe';
  const name = GAME_NAMES[gameId] || gameId;
  return {
    id: gameId,
    x: HOUSE_WIDTH / 2 - 60,
    y: 40,
    w: 120,
    h: 80,
    name,
  };
}

export const HOUSE_EXIT = { x: HOUSE_WIDTH / 2 - 30, y: HOUSE_HEIGHT - 30, w: 60, h: 25 };

export class HouseState {
  constructor(gameState, cottageIndex = 0) {
    this.gameState = gameState;
    this.cottageIndex = cottageIndex;
    this.playerX = HOUSE_PLAYER_START.x;
    this.playerY = HOUSE_PLAYER_START.y;
    this.activeGame = null;
    this.gameData = null;
  }

  getGameStations() {
    return [getGameStationForHouse(this.cottageIndex)];
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

    // Game stations (single station per house)
    for (const station of this.getGameStations()) {
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
export function createGameState(gameId) {
  if (gameId === 'tictactoe') {
    return { board: Array(9).fill(null), turn: 'X', winner: null };
  }
  if (gameId === 'connect4') {
    return { cols: Array(7).fill(0).map(() => []), turn: 'R', winner: null };
  }
  if (gameId === 'sudoku') {
    return createSudokuState();
  }
  if (gameId === 'hangman') {
    return createHangmanState();
  }
  if (gameId === 'presleytest') {
    return {
      score: 0,
      round: 1,
      hidingIndex: Math.floor(Math.random() * 3),
      hasGuessed: false,
      winner: null,
      correct: null,
      guessedIndex: null,
    };
  }
  if (gameId === 'dotsandboxes') {
    return createDotsAndBoxesState();
  }
  return null;
}

const HANGMAN_WORDS = [
  'CAMPFIRE', 'WOOD', 'FOREST', 'HUNGER', 'WOLF', 'BERRY', 'MEAT', 'SURVIVAL',
  'COTTAGE', 'CRAFT', 'FLAME', 'TREASURE', 'COOKING', 'PIG', 'AXE',
];
function createHangmanState() {
  const word = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
  return {
    word,
    guessed: [],
    wrongCount: 0,
    maxWrong: 6,
    winner: null,
  };
}

function createDotsAndBoxesState() {
  const rows = 3;
  const cols = 3;
  const hEdges = []; // horizontal: hEdges[r][c] = edge between dot(r,c)-(r,c+1), r 0..rows, c 0..cols-1
  for (let r = 0; r <= rows; r++) {
    hEdges[r] = Array(cols).fill(null);
  }
  const vEdges = []; // vertical: vEdges[r][c] = edge between dot(r,c)-(r+1,c), r 0..rows-1, c 0..cols
  for (let r = 0; r < rows; r++) {
    vEdges[r] = Array(cols + 1).fill(null);
  }
  const boxes = [];
  for (let r = 0; r < rows; r++) {
    boxes[r] = Array(cols).fill(null);
  }
  return { rows, cols, hEdges, vEdges, boxes, turn: 'X', playerScore: 0, aiScore: 0, winner: null };
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
