/**
 * Mini-games played inside houses - Tic Tac Toe, Connect 4, Sudoku
 * Player vs simple AI (or vs self for puzzle games)
 */

/**
 * Tic Tac Toe - player is X, AI is O
 */
export function playTicTacToe(data, cellIndex) {
  if (data.winner || data.board[cellIndex]) return data;
  const next = { ...data, board: [...data.board] };
  next.board[cellIndex] = 'X';

  const win = checkTicTacToeWin(next.board);
  if (win) {
    next.winner = win;
    return next;
  }
  if (next.board.every(Boolean)) {
    next.winner = 'tie';
    return next;
  }

  // AI move (O)
  const aiMove = getTicTacToeAIMove(next.board);
  if (aiMove >= 0) {
    next.board[aiMove] = 'O';
    const aiWin = checkTicTacToeWin(next.board);
    if (aiWin) {
      next.winner = aiWin;
      return next;
    }
    if (next.board.every(Boolean)) {
      next.winner = 'tie';
    }
  }
  next.turn = 'X';
  return next;
}

function checkTicTacToeWin(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

function getTicTacToeAIMove(board) {
  // Win if possible
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    const vals = [board[a], board[b], board[c]];
    const oCount = vals.filter(v => v === 'O').length;
    const xCount = vals.filter(v => v === 'X').length;
    if (oCount === 2 && !vals.includes('X')) return [a,b,c][vals.findIndex(v => !v)];
    if (xCount === 2 && !vals.includes('O')) return [a,b,c][vals.findIndex(v => !v)];
  }
  // Center
  if (!board[4]) return 4;
  // Corners
  const corners = [0,2,6,8];
  const empty = corners.filter(i => !board[i]);
  if (empty.length) return empty[Math.floor(Math.random() * empty.length)];
  // Sides
  const sides = [1,3,5,7];
  const emptySides = sides.filter(i => !board[i]);
  return emptySides.length ? emptySides[Math.floor(Math.random() * emptySides.length)] : -1;
}

/**
 * Connect 4 - player is R, AI is Y
 */
export function playConnect4(data, colIndex) {
  if (data.winner || colIndex < 0 || colIndex > 6) return data;
  const col = data.cols[colIndex];
  if (col.length >= 6) return data;

  const next = { ...data, cols: data.cols.map(c => [...c]) };
  next.cols[colIndex].push('R');

  const win = checkConnect4Win(next.cols);
  if (win) {
    next.winner = win;
    return next;
  }
  if (next.cols.every(c => c.length === 6)) {
    next.winner = 'tie';
    return next;
  }

  // AI move
  const aiCol = getConnect4AIMove(next.cols);
  if (aiCol >= 0) {
    next.cols[aiCol].push('Y');
    const aiWin = checkConnect4Win(next.cols);
    if (aiWin) {
      next.winner = aiWin;
      return next;
    }
    if (next.cols.every(c => c.length === 6)) next.winner = 'tie';
  }
  return next;
}

function checkConnect4Win(cols) {
  const rows = [];
  for (let r = 0; r < 6; r++) {
    rows[r] = cols.map(c => c[r] || null);
  }
  const check = (arr) => {
    for (let i = 0; i <= arr.length - 4; i++) {
      const slice = arr.slice(i, i + 4);
      if (slice.some(x => !x)) continue;  // need 4 filled cells
      const s = new Set(slice);
      if (s.size === 1 && s.has('R')) return 'R';
      if (s.size === 1 && s.has('Y')) return 'Y';
    }
    return null;
  };
  for (let r = 0; r < 6; r++) {
    const w = check(rows[r]);
    if (w) return w;
  }
  for (let c = 0; c < 7; c++) {
    const w = check(cols[c]);
    if (w) return w;
  }
  for (let r = 0; r <= 2; r++) {
    for (let c = 0; c <= 3; c++) {
      const diag = [rows[r][c], rows[r+1]?.[c+1], rows[r+2]?.[c+2], rows[r+3]?.[c+3]];
      if (diag.every(Boolean)) {
        const s = new Set(diag);
        if (s.size === 1 && s.has('R')) return 'R';
        if (s.size === 1 && s.has('Y')) return 'Y';
      }
    }
  }
  for (let r = 3; r < 6; r++) {
    for (let c = 0; c <= 3; c++) {
      const diag = [rows[r][c], rows[r-1]?.[c+1], rows[r-2]?.[c+2], rows[r-3]?.[c+3]];
      if (diag.every(Boolean)) {
        const s = new Set(diag);
        if (s.size === 1 && s.has('R')) return 'R';
        if (s.size === 1 && s.has('Y')) return 'Y';
      }
    }
  }
  return null;
}

function getConnect4AIMove(cols) {
  const valid = cols.map((c, i) => i).filter(i => cols[i].length < 6);
  if (!valid.length) return -1;
  return valid[Math.floor(Math.random() * valid.length)];
}

/**
 * Sudoku 4x4 - player fills in cells
 */
export function playSudoku(data, row, col, value) {
  if (data.winner) return data;
  if (data.locked[row][col]) return data; // locked cell
  if (value < 1 || value > 4) return data;

  const next = { ...data, board: data.board.map(r => [...r]) };
  next.board[row][col] = value;

  if (JSON.stringify(next.board) === JSON.stringify(data.solution)) {
    next.winner = 'X';
  }
  return next;
}
