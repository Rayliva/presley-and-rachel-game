/**
 * Canvas renderer for Campfire Survival
 */

import {
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  FIRE_LIGHT_MIN,
  FIRE_LIGHT_MAX,
  WOLF_STATE,
} from './constants.js';

function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export class Renderer {
  constructor(canvas, gameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.gameState = gameState;
    this.cameraX = 0;
    this.cameraY = 0;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  worldToScreen(x, y) {
    return {
      x: x - this.cameraX + this.width / 2,
      y: y - this.cameraY + this.height / 2,
    };
  }

  updateCamera() {
    const { player } = this.gameState;
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    const mapPixelW = MAP_WIDTH * TILE_SIZE;
    const mapPixelH = MAP_HEIGHT * TILE_SIZE;

    let cx, cy;
    if (mapPixelW <= this.width) {
      cx = mapPixelW / 2;  // center map horizontally
    } else {
      cx = player.x - halfW;
      cx = Math.max(0, Math.min(cx, mapPixelW - this.width));
    }
    if (mapPixelH <= this.height) {
      cy = mapPixelH / 2;  // center map vertically
    } else {
      cy = player.y - halfH;
      cy = Math.max(0, Math.min(cy, mapPixelH - this.height));
    }
    this.cameraX = cx;
    this.cameraY = cy;
  }

  render() {
    const { ctx, width, height } = this;
    this.updateCamera();

    // Clear
    ctx.fillStyle = '#0d1f0d';
    ctx.fillRect(0, 0, width, height);

    // Draw grass tiles
    ctx.fillStyle = '#1a3d1a';
    for (let gy = 0; gy < MAP_HEIGHT; gy++) {
      for (let gx = 0; gx < MAP_WIDTH; gx++) {
        const sx = gx * TILE_SIZE - this.cameraX + width / 2;
        const sy = gy * TILE_SIZE - this.cameraY + height / 2;
        if (sx > -TILE_SIZE && sx < width + TILE_SIZE && sy > -TILE_SIZE && sy < height + TILE_SIZE) {
          ctx.fillStyle = (gx + gy) % 2 === 0 ? '#1a3d1a' : '#163316';
          ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    const { campfire, player, trees, pigs, wolves, orbs, meatDrops, treasureChests, craftingTable, forcefieldActive } = this.gameState;
    const lightRadius = campfire.getLightRadius();

    // Draw forcefield (blue fire look) - same size as fire glow
    if (forcefieldActive) {
      const ffRadius = campfire.getLightRadius();
      const ffx = campfire.x - this.cameraX + width / 2;
      const ffy = campfire.y - this.cameraY + height / 2;
      const t = (performance.now() / 200) % 1;
      const gradient = ctx.createRadialGradient(ffx, ffy, 0, ffx, ffy, ffRadius);
      gradient.addColorStop(0, `rgba(100, 180, 255, ${0.15 + Math.sin(t * Math.PI * 2) * 0.05})`);
      gradient.addColorStop(0.4, 'rgba(80, 140, 255, 0.2)');
      gradient.addColorStop(0.7, 'rgba(60, 100, 220, 0.12)');
      gradient.addColorStop(1, 'rgba(40, 80, 200, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(ffx - ffRadius, ffy - ffRadius, ffRadius * 2, ffRadius * 2);
      // Blue flame flicker at edge
      ctx.strokeStyle = `rgba(100, 160, 255, ${0.4 + Math.sin(t * Math.PI * 4) * 0.2})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 2; a += 0.15) {
        const r = ffRadius + Math.sin(a * 3 + t * 10) * 8;
        const x = ffx + Math.cos(a) * r;
        const y = ffy + Math.sin(a) * r;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Draw fire light radius (glow)
    const fx = campfire.x - this.cameraX + width / 2;
    const fy = campfire.y - this.cameraY + height / 2;
    if (lightRadius > 0) {
      const gradient = ctx.createRadialGradient(fx, fy, 0, fx, fy, lightRadius);
      gradient.addColorStop(0, 'rgba(255, 180, 80, 0.25)');
      gradient.addColorStop(0.5, 'rgba(255, 140, 40, 0.12)');
      gradient.addColorStop(1, 'rgba(255, 100, 20, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(fx - lightRadius, fy - lightRadius, lightRadius * 2, lightRadius * 2);
    }

    // Draw blue orbs
    for (const orb of orbs) {
      const ox = orb.x - this.cameraX + width / 2;
      const oy = orb.y - this.cameraY + height / 2;
      const pulse = 0.7 + Math.sin(performance.now() / 300) * 0.3;
      const gradient = ctx.createRadialGradient(ox, oy, 0, ox, oy, 20);
      gradient.addColorStop(0, 'rgba(150, 220, 255, 0.9)');
      gradient.addColorStop(0.5, 'rgba(80, 160, 255, 0.5)');
      gradient.addColorStop(1, 'rgba(40, 100, 200, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ox, oy, 20 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(200, 240, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(ox, oy, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw trees
    for (const tree of trees) {
      const tx = tree.x - this.cameraX + width / 2;
      const ty = tree.y - this.cameraY + height / 2;
      if (tree.chopped) {
        ctx.fillStyle = '#4a3728';
        ctx.beginPath();
        ctx.arc(tx, ty, 6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#2d5a2d';
        ctx.beginPath();
        ctx.arc(tx, ty, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1a3d1a';
        ctx.lineWidth = 2;
        ctx.stroke();
        if (tree.hasFruit && !tree.shaken) {
          ctx.fillStyle = '#e74c3c';
          ctx.beginPath();
          ctx.arc(tx + 6, ty - 8, 4, 0, Math.PI * 2);
          ctx.arc(tx - 4, ty - 4, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (tree.interacting) {
          const p = tree.interactProgress / (tree.canShake() ? 0.4 : 0.8);
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.fillRect(tx - 12, ty - 22, 24, 4);
          ctx.fillStyle = '#7cb87c';
          ctx.fillRect(tx - 12, ty - 22, 24 * Math.min(1, p), 4);
        }
      }
    }

    // Draw pigs
    for (const pig of pigs) {
      if (!pig.alive) continue;
      const px = pig.x - this.cameraX + width / 2;
      const py = pig.y - this.cameraY + height / 2;
      ctx.fillStyle = '#e8b4a0';
      ctx.beginPath();
      ctx.ellipse(px, py, 12, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c49580';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Snout
      ctx.fillStyle = '#d4a090';
      ctx.beginPath();
      ctx.ellipse(px + 10, py, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c49580';
      ctx.stroke();
      ctx.fillStyle = '#8b7355';
      ctx.beginPath();
      ctx.ellipse(px + 14, py, 2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw meat drops
    for (const drop of meatDrops) {
      const mx = drop.x - this.cameraX + width / 2;
      const my = drop.y - this.cameraY + height / 2;
      ctx.fillStyle = '#e8a090';
      ctx.beginPath();
      ctx.ellipse(mx, my, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c49580';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw treasure chests
    for (const chest of treasureChests) {
      const cx = chest.x - this.cameraX + width / 2;
      const cy = chest.y - this.cameraY + height / 2;
      ctx.fillStyle = chest.opened ? '#5d4037' : '#8b6914';
      ctx.strokeStyle = chest.opened ? '#3e2723' : '#6b4e0f';
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 14, cy - 8, 28, 16);
      ctx.strokeRect(cx - 14, cy - 8, 28, 16);
      if (!chest.opened) {
        ctx.fillStyle = '#b8860b';
        ctx.fillRect(cx - 10, cy - 6, 20, 4);
        const pulse = 0.9 + Math.sin(performance.now() / 400) * 0.1;
        ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw crafting table
    if (craftingTable) {
      const tx = craftingTable.x - this.cameraX + width / 2;
      const ty = craftingTable.y - this.cameraY + height / 2;
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(tx - 16, ty - 4, 32, 8);
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx - 16, ty - 4, 32, 8);
      ctx.fillStyle = '#6d4c3d';
      ctx.fillRect(tx - 14, ty - 2, 28, 4);
      ctx.fillStyle = '#8b7355';
      ctx.beginPath();
      ctx.arc(tx - 8, ty - 6, 3, 0, Math.PI * 2);
      ctx.arc(tx + 8, ty - 6, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw wolves
    for (const wolf of wolves) {
      if (!wolf.alive) continue;
      const wx = wolf.x - this.cameraX + width / 2;
      const wy = wolf.y - this.cameraY + height / 2;
      ctx.fillStyle = wolf.state === WOLF_STATE.ATTACK ? '#8b4513' : '#5c4033';
      ctx.beginPath();
      ctx.ellipse(wx, wy, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3d2914';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Eyes
      ctx.fillStyle = wolf.state === WOLF_STATE.ATTACK ? '#ff4444' : '#2d2d2d';
      ctx.beginPath();
      ctx.arc(wx - 4, wy - 2, 2, 0, Math.PI * 2);
      ctx.arc(wx + 4, wy - 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw campfire
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.arc(fx, fy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = campfire.isBurning() ? '#ff6b35' : '#444';
    ctx.beginPath();
    ctx.arc(fx, fy, 6, 0, Math.PI * 2);
    ctx.fill();
    if (campfire.isBurning()) {
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(fx, fy - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // Meat on fire - raw (cooking) = pinkish, cooked (ready) = darker brown
    for (let i = 0; i < campfire.cookingMeat; i++) {
      const offset = (i - campfire.cookingMeat / 2 + 0.5) * 8;
      ctx.fillStyle = '#e8a090';
      ctx.beginPath();
      ctx.ellipse(fx + offset, fy + 4, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < campfire.cookedMeatReady; i++) {
      const offset = (i - campfire.cookedMeatReady / 2 + 0.5) * 8;
      ctx.fillStyle = '#5c4033';
      ctx.beginPath();
      ctx.ellipse(fx + offset, fy + 4, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3d2914';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw player (stick figure)
    const px = player.x - this.cameraX + width / 2;
    const py = player.y - this.cameraY + height / 2;
    const scale = 1.2;
    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Head
    ctx.fillStyle = '#f5deb3';
    ctx.beginPath();
    ctx.arc(px, py - 12 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Body
    ctx.beginPath();
    ctx.moveTo(px, py - 7 * scale);
    ctx.lineTo(px, py + 12 * scale);
    ctx.stroke();
    // Arms
    const isChopping = player.interactTarget?.type === 'tree' &&
      player.interactTarget.obj.interacting && !player.interactTarget.obj.canShake();
    const chopTree = isChopping ? player.interactTarget.obj : null;

    if (!isChopping) {
      ctx.beginPath();
      ctx.moveTo(px, py - 4 * scale);
      ctx.lineTo(px - 8 * scale, py + 4 * scale);
      ctx.moveTo(px, py - 4 * scale);
      ctx.lineTo(px + 8 * scale, py + 4 * scale);
      ctx.stroke();
    } else {
      // Chopping arm - one arm holds axe, other arm on tree side
      const treeX = chopTree.x - this.cameraX + width / 2;
      const treeY = chopTree.y - this.cameraY + height / 2;
      const dx = treeX - px;
      const dy = treeY - py;
      const angle = Math.atan2(dy, dx);
      // Arm holding axe (extends toward tree)
      const ax = px + Math.cos(angle) * 18 * scale;
      const ay = py - 4 * scale + Math.sin(angle) * 18 * scale;
      ctx.beginPath();
      ctx.moveTo(px, py - 4 * scale);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      // Axe handle and head
      const handleLen = 16 * scale;
      const hx = ax + Math.cos(angle) * handleLen;
      const hy = ay + Math.sin(angle) * handleLen;
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      // Axe head (metal blade)
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(angle);
      ctx.fillStyle = '#8b8b8b';
      ctx.fillRect(0, -6, 10, 12);
      ctx.strokeStyle = '#5a5a5a';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, -6, 10, 12);
      ctx.restore();
      ctx.strokeStyle = '#2d2d2d';
      ctx.lineWidth = 2;
      // Other arm (bracing)
      const braceAngle = angle + Math.PI * 0.3;
      ctx.beginPath();
      ctx.moveTo(px, py - 4 * scale);
      ctx.lineTo(px + Math.cos(braceAngle) * 6 * scale, py - 4 * scale + Math.sin(braceAngle) * 6 * scale);
      ctx.stroke();
    }
    // Legs
    ctx.beginPath();
    ctx.moveTo(px, py + 12 * scale);
    ctx.lineTo(px - 6 * scale, py + 24 * scale);
    ctx.moveTo(px, py + 12 * scale);
    ctx.lineTo(px + 6 * scale, py + 24 * scale);
    ctx.stroke();
    // Wood carried on back (when player has wood)
    if (player.wood > 0) {
      const sticks = Math.min(player.wood, 4);
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 3;
      for (let i = 0; i < sticks; i++) {
        const offset = (i - sticks / 2 + 0.5) * 5;
        ctx.beginPath();
        ctx.moveTo(px - 16 + offset * 0.3, py - 4 - offset);
        ctx.lineTo(px - 22 + offset * 0.3, py + 6 - offset);
        ctx.stroke();
      }
    }
    // Raw meat held in front (when player has raw meat, not cooking)
    if (player.rawMeat > 0) {
      const meatCount = Math.min(player.rawMeat, 3);
      for (let i = 0; i < meatCount; i++) {
        const offset = (i - meatCount / 2 + 0.5) * 6;
        ctx.fillStyle = '#e8a090';
        ctx.beginPath();
        ctx.ellipse(px + 12 + offset * 0.5, py + 2 + offset, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#c49580';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}
