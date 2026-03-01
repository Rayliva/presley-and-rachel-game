/**
 * Renders the house interior (top-down view)
 */

import { HOUSE_WIDTH, HOUSE_HEIGHT, HOUSE_EXIT } from './house.js';

export function renderHouseInterior(ctx, houseState, width, height) {
  const scale = Math.min(width / HOUSE_WIDTH, height / HOUSE_HEIGHT);
  const offsetX = (width - HOUSE_WIDTH * scale) / 2;
  const offsetY = (height - HOUSE_HEIGHT * scale) / 2;

  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Floor - warm wooden planks
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(0, 0, HOUSE_WIDTH, HOUSE_HEIGHT);
  ctx.strokeStyle = '#4e342e';
  ctx.lineWidth = 1;
  for (let y = 0; y < HOUSE_HEIGHT; y += 24) {
    for (let x = 0; x < HOUSE_WIDTH; x += 48) {
      ctx.strokeRect(x, y, 48, 24);
    }
  }

  // Walls - log cabin interior
  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(0, 0, HOUSE_WIDTH, 12);
  ctx.fillRect(0, 0, 12, HOUSE_HEIGHT);
  ctx.fillRect(HOUSE_WIDTH - 12, 0, 12, HOUSE_HEIGHT);
  ctx.fillRect(0, HOUSE_HEIGHT - 12, HOUSE_WIDTH, 12);

  // Game stations - tables with game boards
  for (const station of houseState.getGameStations()) {
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(station.x - 4, station.y - 4, station.w + 8, station.h + 8);
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.strokeRect(station.x - 4, station.y - 4, station.w + 8, station.h + 8);
    ctx.fillStyle = '#fff8e0';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(station.name, station.x + station.w / 2, station.y - 8);
  }

  // Exit door
  ctx.fillStyle = '#3e2723';
  ctx.fillRect(HOUSE_EXIT.x, HOUSE_EXIT.y, HOUSE_EXIT.w, HOUSE_EXIT.h);
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(HOUSE_EXIT.x + 4, HOUSE_EXIT.y + 4, HOUSE_EXIT.w - 8, HOUSE_EXIT.h - 8);
  ctx.fillStyle = '#fff8e0';
  ctx.font = '11px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('Exit (E)', HOUSE_EXIT.x + HOUSE_EXIT.w / 2, HOUSE_EXIT.y + HOUSE_EXIT.h / 2 + 4);

  // Player (top-down circle)
  const px = houseState.playerX;
  const py = houseState.playerY;
  ctx.fillStyle = '#f5deb3';
  ctx.beginPath();
  ctx.arc(px, py, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8b7355';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Direction indicator (small triangle)
  ctx.fillStyle = '#8b7355';
  ctx.beginPath();
  ctx.moveTo(px, py - 14);
  ctx.lineTo(px - 5, py - 4);
  ctx.lineTo(px + 5, py - 4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
