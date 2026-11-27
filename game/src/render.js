// Gobble Run's renderer: every pixel is drawn on one canvas — sunset farm,
// the turkey, the chasing farmer, ovens and carving knives, the HUD and the
// title / pause / end screens. No images, no fonts loaded from anywhere.
import {
  CHASE_READ,
  ESCAPE_DISTANCE_M,
  FARMER_DANGER_GAP_M,
  FARMER_START_GAP_M,
  FIELD,
  FONT,
  FONT_DISPLAY,
  HUD_READ,
  PALETTE,
  TURKEY,
  TURKEY_X,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function text(ctx, str, x, y, size, color, align = 'left', weight = 800, font = FONT_DISPLAY) {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function outlinedText(ctx, str, x, y, size, color, outline, align = 'center', weight = 900) {
  ctx.font = `${weight} ${size}px ${FONT_DISPLAY}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, size / 8);
  ctx.strokeStyle = outline;
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const scale = Math.min(w / FIELD.width, h / FIELD.height) * dpr;
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    return { scale, ox, oy };
  }

  function drawSky(state) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.horizonY + 120);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.45, PALETTE.skyMid);
    g.addColorStop(1, PALETTE.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.horizonY + 120);
    // Low autumn sun with a warm halo.
    const sx = 1020;
    const sy = 210;
    const halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, 150);
    halo.addColorStop(0, 'rgba(255, 243, 196, 0.95)');
    halo.addColorStop(0.4, 'rgba(255, 217, 122, 0.55)');
    halo.addColorStop(1, 'rgba(255, 217, 122, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sx - 160, sy - 160, 320, 320);
    ctx.fillStyle = PALETTE.sunCore;
    ellipse(ctx, sx, sy, 52, 52);
    // Drifting clouds, parallax-slow.
    ctx.fillStyle = PALETTE.cloud;
    for (let i = 0; i < 5; i += 1) {
      const cx = ((i * 340 + 120 - state.scrollX * 0.08) % (FIELD.width + 360) + FIELD.width + 360) % (FIELD.width + 360) - 180;
      const cy = 70 + i * 34;
      ellipse(ctx, cx, cy, 70, 18);
      ellipse(ctx, cx + 44, cy + 8, 52, 14);
      ellipse(ctx, cx - 48, cy + 9, 46, 13);
    }
    // Distant birds.
    ctx.strokeStyle = 'rgba(46, 26, 77, 0.7)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      const bx = ((i * 430 + 300 - state.scrollX * 0.15) % (FIELD.width + 200) + FIELD.width + 200) % (FIELD.width + 200) - 100;
      const by = 120 + i * 26 + Math.sin(state.time * 2 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(bx - 12, by);
      ctx.quadraticCurveTo(bx - 4, by - 8, bx, by);
      ctx.quadraticCurveTo(bx + 4, by - 8, bx + 12, by);
      ctx.stroke();
    }
  }

  function drawHills(state) {
    ctx.fillStyle = PALETTE.hillFar;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.horizonY);
    for (let x = 0; x <= FIELD.width; x += 80) {
      const off = (x + state.scrollX * 0.15) % 640;
      ctx.lineTo(x, FIELD.horizonY - 40 - Math.sin(off * 0.012) * 26);
    }
    ctx.lineTo(FIELD.width, FIELD.horizonY);
    ctx.closePath();
    ctx.fill();
    // The red barn on the far hill, always in view.
    const bx = 980 - ((state.scrollX * 0.15) % 1400);
    const barnX = bx < -160 ? bx + 1400 : bx;
    ctx.fillStyle = PALETTE.barn;
    ctx.fillRect(barnX, FIELD.horizonY - 96, 120, 96);
    ctx.fillStyle = PALETTE.barnRoof;
    ctx.beginPath();
    ctx.moveTo(barnX - 10, FIELD.horizonY - 96);
    ctx.lineTo(barnX + 60, FIELD.horizonY - 132);
    ctx.lineTo(barnX + 130, FIELD.horizonY - 96);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.barnTrim;
    ctx.fillRect(barnX + 46, FIELD.horizonY - 58, 28, 58);
    ctx.strokeStyle = PALETTE.barnTrim;
    ctx.lineWidth = 3;
    ctx.strokeRect(barnX + 14, FIELD.horizonY - 82, 26, 26);
    ctx.strokeRect(barnX + 80, FIELD.horizonY - 82, 26, 26);
    ctx.fillStyle = PALETTE.hillNear;
    ctx.beginPath();
    ctx.moveTo(0, FIELD.horizonY + 30);
    for (let x = 0; x <= FIELD.width; x += 80) {
      const off = (x + state.scrollX * 0.3) % 520;
      ctx.lineTo(x, FIELD.horizonY + 30 - Math.sin(off * 0.014) * 18);
    }
    ctx.lineTo(FIELD.width, FIELD.horizonY + 60);
    ctx.lineTo(0, FIELD.horizonY + 60);
    ctx.closePath();
    ctx.fill();
  }

  function drawField(state) {
    // Golden cornfield with furrows scrolling past.
    ctx.fillStyle = PALETTE.field;
    ctx.fillRect(0, FIELD.horizonY + 30, FIELD.width, FIELD.groundY - FIELD.horizonY - 30);
    ctx.fillStyle = PALETTE.fieldDark;
    for (let row = 0; row < 5; row += 1) {
      const y = FIELD.horizonY + 52 + row * 44;
      for (let x = -40; x < FIELD.width + 40; x += 90) {
        const sx = x - (state.scrollX * (0.7 + row * 0.12)) % 90;
        ctx.beginPath();
        ctx.ellipse(sx, y, 26, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Fence posts marching past, mid-ground.
    ctx.fillStyle = PALETTE.fenceWood;
    const fenceY = FIELD.groundY - 118;
    for (let x = -60; x < FIELD.width + 60; x += 150) {
      const sx = x - (state.scrollX % 150);
      ctx.fillRect(sx, fenceY - 26, 10, 44);
    }
    ctx.fillStyle = PALETTE.fenceDark;
    ctx.fillRect(0, fenceY - 18, FIELD.width, 7);
    ctx.fillRect(0, fenceY + 2, FIELD.width, 7);
    // The dirt track the turkey runs on.
    ctx.fillStyle = PALETTE.groundTop;
    ctx.fillRect(0, FIELD.groundY - 14, FIELD.width, 114);
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, FIELD.groundY + 26, FIELD.width, 74);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (let x = -30; x < FIELD.width + 30; x += 130) {
      const sx = x - (state.scrollX % 130);
      ellipse(ctx, sx, FIELD.groundY + 52, 34, 6);
    }
  }

  function drawOven(o) {
    const flicker = 0.7 + Math.sin(o.wobble * 5) * 0.3;
    ctx.save();
    ctx.shadowColor = PALETTE.ovenGlow;
    ctx.shadowBlur = 22 * flicker;
    ctx.fillStyle = PALETTE.oven;
    roundRect(ctx, o.x, o.y, o.width, o.height, 10);
    ctx.fill();
    ctx.restore();
    // Chimney.
    ctx.fillStyle = PALETTE.oven;
    ctx.fillRect(o.x + o.width - 30, o.y - 26, 20, 30);
    ctx.fillStyle = PALETTE.ovenHot;
    ellipse(ctx, o.x + o.width - 20, o.y - 28, 12, 5);
    // Glowing door with fire.
    const glow = ctx.createLinearGradient(0, o.y + 30, 0, o.y + o.height - 14);
    glow.addColorStop(0, `rgba(255, 122, 46, ${0.85 * flicker + 0.15})`);
    glow.addColorStop(1, '#ff5a1e');
    ctx.fillStyle = glow;
    roundRect(ctx, o.x + 16, o.y + 34, o.width - 32, o.height - 48, 8);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ellipse(ctx, o.x + o.width / 2, o.y + 62, 14 + 4 * flicker, 18);
    // Hot knobs + warning stripe.
    ctx.fillStyle = '#d7dde6';
    ellipse(ctx, o.x + 22, o.y + 16, 6, 6);
    ellipse(ctx, o.x + o.width - 22, o.y + 16, 6, 6);
    ctx.fillStyle = PALETTE.danger;
    ctx.font = `900 15px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('HOT!', o.x + o.width / 2, o.y + o.height - 8);
  }

  function drawKnife(o) {
    const lean = Math.sin(o.wobble * 0.7) * 0.06;
    ctx.save();
    ctx.translate(o.x + o.width / 2, o.y + o.height);
    ctx.rotate(lean);
    // Blade stuck in the dirt, point down, edge gleaming.
    ctx.fillStyle = PALETTE.knifeBlade;
    ctx.beginPath();
    ctx.moveTo(-o.width / 2, -o.height + 46);
    ctx.lineTo(o.width / 2, -o.height + 46);
    ctx.lineTo(o.width / 2, -34);
    ctx.lineTo(0, 0);
    ctx.lineTo(-o.width / 2, -34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.knifeEdge;
    ctx.beginPath();
    ctx.moveTo(o.width / 2 - 4, -o.height + 46);
    ctx.lineTo(o.width / 2 - 4, -34);
    ctx.lineTo(0, -6);
    ctx.lineTo(o.width / 2 - 10, -34);
    ctx.closePath();
    ctx.fill();
    // Wooden handle on top.
    ctx.fillStyle = PALETTE.knifeHandle;
    roundRect(ctx, -o.width / 2 - 3, -o.height, o.width + 6, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#d7dde6';
    ellipse(ctx, 0, -o.height + 12, 5, 5);
    ellipse(ctx, 0, -o.height + 32, 5, 5);
    ctx.restore();
  }

  function drawFence(o) {
    ctx.fillStyle = PALETTE.fenceWood;
    ctx.fillRect(o.x, o.y + 8, 12, o.height - 8);
    ctx.fillRect(o.x + o.width - 12, o.y + 8, 12, o.height - 8);
    ctx.fillStyle = PALETTE.fenceDark;
    ctx.fillRect(o.x - 4, o.y + 12, o.width + 8, 9);
    ctx.fillRect(o.x - 4, o.y + 34, o.width + 8, 9);
    ctx.fillStyle = '#f2e3c6';
    ctx.font = `900 13px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('KEEP OUT', o.x + o.width / 2, o.y + o.height - 8);
  }

  function drawHay(o) {
    ctx.fillStyle = PALETTE.hay;
    ellipse(ctx, o.x + o.width / 2, o.y + o.height / 2, o.width / 2, o.height / 2);
    ctx.strokeStyle = PALETTE.hayDark;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(o.x + o.width / 2, o.y + o.height / 2, o.width / 2, o.height / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 3;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.arc(o.x + o.width / 2, o.y + o.height / 2, o.width / 2 - 8, -0.9 + i * 0.35, -0.3 + i * 0.35);
      ctx.stroke();
    }
    // Cross-hatched straw so the bale never reads as a plain ball.
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(o.x + 12, o.y + o.height - 16);
    ctx.lineTo(o.x + o.width - 12, o.y + 16);
    ctx.moveTo(o.x + 12, o.y + 16);
    ctx.lineTo(o.x + o.width - 12, o.y + o.height - 16);
    ctx.stroke();
    ctx.fillStyle = PALETTE.hayDark;
    ellipse(ctx, o.x + o.width / 2, o.y + 8, 10, 5);
  }

  function drawCorn(c, time) {
    const bob = Math.sin(time * 3 + c.bob) * 3;
    ctx.save();
    ctx.translate(c.x, c.y + bob);
    ctx.fillStyle = PALETTE.corn;
    ellipse(ctx, 0, 0, 13, 17);
    ctx.fillStyle = '#d9a92e';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.ellipse(i * 6, 0, 2.5, 13, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.cornHusk;
    ctx.beginPath();
    ctx.moveTo(-12, 6);
    ctx.quadraticCurveTo(-22, 16, -14, 22);
    ctx.quadraticCurveTo(-6, 14, -4, 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, 6);
    ctx.quadraticCurveTo(22, 16, 14, 22);
    ctx.quadraticCurveTo(6, 14, 4, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawGoldenFeather(f, time) {
    const bob = Math.sin(time * 2.4 + f.bob) * 5;
    ctx.save();
    ctx.translate(f.x, f.y + bob);
    ctx.shadowColor = PALETTE.featherGold;
    ctx.shadowBlur = 18;
    ctx.rotate(Math.sin(time * 1.5 + f.bob) * 0.3);
    ctx.fillStyle = PALETTE.featherGold;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9, 18, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, 14);
    ctx.lineTo(6, -14);
    ctx.stroke();
    ctx.restore();
  }

  function drawTurkey(state, x, y, scale, runPhase, squash, alpha = 1) {
    const t = state.turkey;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.scale(scale * (1 + squash), scale * (1 - squash));
    // Ground shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    const airH = Math.max(0, FIELD.groundY - t.y);
    const shScale = Math.max(0.4, 1 - airH / 500);
    ellipse(ctx, 0, 0, 46 * shScale, 8 * shScale);
    const legSwing = t.grounded ? Math.sin(runPhase) * 14 : 6;
    // Legs.
    ctx.strokeStyle = PALETTE.turkeyLeg;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -16);
    ctx.lineTo(-8 + legSwing, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(10, -16);
    ctx.lineTo(10 - legSwing, 0);
    ctx.stroke();
    // Tail fan, fanned behind (left).
    const tailColors = PALETTE.turkeyTail;
    for (let i = 0; i < 5; i += 1) {
      const a = Math.PI * (0.72 + i * 0.14);
      const tx = Math.cos(a) * 44;
      const ty = -26 + Math.sin(a) * 34;
      ctx.fillStyle = tailColors[i % tailColors.length];
      ctx.beginPath();
      ctx.ellipse(-30 + tx * 0.55, -30 + ty * 0.5, 12, 26, -0.5 + i * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    // Body.
    ctx.fillStyle = PALETTE.turkeyBody;
    ellipse(ctx, 0, -38, 44, 34);
    ctx.fillStyle = PALETTE.turkeyDark;
    ellipse(ctx, -6, -26, 34, 22);
    // Wing, flapping with the run.
    const flap = t.grounded ? Math.sin(runPhase * 2) * 6 : -14;
    ctx.fillStyle = PALETTE.turkeyWing;
    ctx.beginPath();
    ctx.ellipse(-6, -40 + flap * 0.4, 26, 15, -0.4 + flap * 0.02, 0, Math.PI * 2);
    ctx.fill();
    // Head + beak + wattle + eye.
    ctx.fillStyle = PALETTE.turkeyHead;
    ellipse(ctx, 34, -72, 17, 16);
    ctx.fillStyle = PALETTE.turkeyBeak;
    ctx.beginPath();
    ctx.moveTo(48, -76);
    ctx.lineTo(64, -70);
    ctx.lineTo(48, -64);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.turkeyWattle;
    ellipse(ctx, 44, -58, 6, 10);
    ctx.fillStyle = '#1c1210';
    ellipse(ctx, 38, -76, 3.4, 3.4);
    // Snood.
    ctx.fillStyle = PALETTE.turkeyWattle;
    ctx.beginPath();
    ctx.moveTo(46, -72);
    ctx.lineTo(52, -62);
    ctx.lineTo(44, -64);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawFarmer(state, x, runPhase, scale = 1) {
    const bob = Math.abs(Math.sin(runPhase)) * 4;
    ctx.save();
    ctx.translate(x, FIELD.groundY - bob);
    // Shadow stays on the ground, sized to the farmer.
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ellipse(ctx, 0, bob, 40 * scale, 7 * scale);
    ctx.scale(scale, scale);
    const swing = Math.sin(runPhase) * 16;
    // Legs (overalls) + boots.
    ctx.strokeStyle = PALETTE.farmerOveralls;
    ctx.lineWidth = 13;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -52);
    ctx.lineTo(-6 + swing, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, -52);
    ctx.lineTo(8 - swing, 0);
    ctx.stroke();
    ctx.fillStyle = PALETTE.farmerBoots;
    ellipse(ctx, -6 + swing, -2, 12, 6);
    ellipse(ctx, 8 - swing, -2, 12, 6);
    // Body: red shirt + blue overalls.
    ctx.fillStyle = PALETTE.farmerShirt;
    roundRect(ctx, -24, -104, 48, 56, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.farmerOveralls;
    ctx.fillRect(-20, -78, 40, 30);
    ctx.fillStyle = '#d9a92e';
    ctx.fillRect(-20, -78, 40, 4);
    // Arm reaching forward with the pitchfork.
    ctx.strokeStyle = PALETTE.farmerShirt;
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(14, -96);
    ctx.lineTo(38, -70);
    ctx.stroke();
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(38, -70);
    ctx.lineTo(58, -128);
    ctx.stroke();
    ctx.strokeStyle = '#d7dde6';
    ctx.lineWidth = 4;
    for (const dx of [-6, 0, 6]) {
      ctx.beginPath();
      ctx.moveTo(58 + dx, -128);
      ctx.lineTo(58 + dx, -146);
      ctx.stroke();
    }
    // Head + straw hat + angry brows.
    ctx.fillStyle = PALETTE.farmerSkin;
    ellipse(ctx, 0, -122, 17, 18);
    ctx.fillStyle = PALETTE.farmerHat;
    ellipse(ctx, 0, -136, 26, 8);
    ctx.fillRect(-14, -152, 28, 18);
    ctx.fillStyle = '#1c1210';
    ellipse(ctx, 6, -124, 3, 3);
    ellipse(ctx, 14, -124, 3, 3);
    ctx.strokeStyle = '#1c1210';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, -132);
    ctx.lineTo(10, -129);
    ctx.moveTo(18, -129);
    ctx.lineTo(11, -132);
    ctx.stroke();
    // Moustache.
    ctx.fillStyle = '#5d3a1a';
    ellipse(ctx, 10, -112, 10, 4);
    ctx.restore();
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === 'feather') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size / 2, p.size / 4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'spark') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ellipse(ctx, p.x, p.y, p.size * a, p.size * 0.6 * a);
      }
      ctx.restore();
    }
  }

  function drawLeaves(state) {
    for (const leaf of state.leaves) {
      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(Math.sin(state.time * leaf.sway + leaf.phase) * 0.8);
      ctx.fillStyle = 'rgba(217, 105, 30, 0.85)';
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size / 2, leaf.size / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawHud(state, best, bestDistance) {
    const dist = Math.floor(state.distanceM);
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 16, 12, FIELD.width - 32, 76, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, 16, 12, FIELD.width - 32, 76, 12);
    ctx.stroke();
    // Score, left.
    text(ctx, 'SCORE', 36, 30, 16, PALETTE.muted, 'left', 800);
    text(ctx, String(Math.floor(state.score)), 36, 60, HUD_READ.scoreSize, PALETTE.text, 'left', 900);
    // Distance progress, centre: turkey dot runs toward the barn flag.
    const barX = 300;
    const barW = 620;
    const barY = 38;
    text(ctx, 'TO THE FOREST GATE', barX + barW / 2, 28, 14, PALETTE.muted, 'center', 800);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, barX, barY, barW, 16, 8);
    ctx.fill();
    const prog = Math.min(1, state.distanceM / ESCAPE_DISTANCE_M);
    const fill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    fill.addColorStop(0, '#f2a541');
    fill.addColorStop(1, '#7fd67a');
    ctx.fillStyle = fill;
    if (prog > 0.01) {
      roundRect(ctx, barX, barY, Math.max(18, barW * prog), 16, 8);
      ctx.fill();
    }
    // Barn flag at the end of the bar.
    ctx.fillStyle = PALETTE.barn;
    ctx.fillRect(barX + barW - 4, barY - 16, 4, 18);
    ctx.fillStyle = PALETTE.safe;
    ctx.beginPath();
    ctx.moveTo(barX + barW, barY - 16);
    ctx.lineTo(barX + barW + 16, barY - 11);
    ctx.lineTo(barX + barW, barY - 6);
    ctx.closePath();
    ctx.fill();
    // Turkey dot on the bar.
    const dotX = barX + barW * prog;
    ctx.fillStyle = PALETTE.turkeyBody;
    ellipse(ctx, dotX, barY + 8, 10, 8);
    ctx.fillStyle = PALETTE.turkeyHead;
    ellipse(ctx, dotX + 8, barY + 2, 5, 5);
    text(ctx, `${dist}m / ${ESCAPE_DISTANCE_M}m`, barX + barW / 2, 72, HUD_READ.distSize, PALETTE.text, 'center', 800);
    // Corn + best, right.
    text(ctx, 'CORN', 1000, 30, 16, PALETTE.muted, 'left', 800);
    text(ctx, `x${state.corn}`, 1000, 60, HUD_READ.valueSize, PALETTE.corn, 'left', 900);
    text(ctx, 'BEST', 1120, 30, 16, PALETTE.muted, 'left', 800);
    text(ctx, String(best), 1120, 60, HUD_READ.valueSize, PALETTE.text, 'left', 900);
    // Farmer gap bar, under the HUD: red when he closes in.
    const gapW = 260;
    const gapX = FIELD.width - gapW - 16;
    const gapY = 98;
    const gapFrac = state.farmerGapM / FARMER_START_GAP_M;
    ctx.fillStyle = 'rgba(24, 12, 32, 0.7)';
    roundRect(ctx, gapX, gapY, gapW, 30, 8);
    ctx.fill();
    ctx.fillStyle = gapFrac < 0.3 ? PALETTE.danger : '#f2a541';
    roundRect(ctx, gapX + 3, gapY + 3, Math.max(8, (gapW - 6) * gapFrac), 24, 6);
    ctx.fill();
    text(ctx, `FARMER ${Math.ceil(state.farmerGapM)}m BEHIND`, gapX + gapW / 2, gapY + 15, HUD_READ.gapTextSize, PALETTE.text, 'center', 900);
    if (state.farmerGapM <= FARMER_DANGER_GAP_M && state.running && !state.over) {
      const pulse = 0.55 + Math.sin(state.time * 8) * 0.45;
      outlinedText(ctx, 'THE FARMER IS CLOSE!', FIELD.width / 2, 142, HUD_READ.warningSize, `rgba(255,77,61,${pulse})`, '#2e0a06');
    }
  }

  function drawPanel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 3;
    roundRect(ctx, x, y, w, h, 18);
    ctx.stroke();
  }

  function drawTitle(state, best, bestDistance) {
    // Dim the farm so the title pops.
    ctx.fillStyle = 'rgba(24, 10, 32, 0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Big turkey on the left of the panel, farmer peeking from the right edge.
    drawTurkey(state, 250, 560, 1.9, state.time * 9, Math.sin(state.time * 3) * 0.03);
    drawFarmer(state, 1060, state.time * 9);
    drawPanel(330, 120, 620, 380);
    outlinedText(ctx, 'GOBBLE RUN', 640, 190, 76, '#ffd97a', '#4a1a06');
    outlinedText(ctx, "A TURKEY'S GREAT ESCAPE", 640, 250, 30, PALETTE.text, '#4a1a06');
    text(ctx, 'Thanksgiving is coming. The farmer is coming faster.', 640, 300, 20, PALETTE.muted, 'center', 700);
    text(ctx, 'Jump the ovens. Dodge the carving knives. Grab the corn.', 640, 332, 20, PALETTE.muted, 'center', 700);
    text(ctx, 'Reach the forest gate 1500m away — and stay free.', 640, 364, 20, PALETTE.muted, 'center', 700);
    text(ctx, 'SPACE / CLICK — jump (twice = double jump)      P — pause', 640, 462, 17, PALETTE.muted, 'center', 700);
    // Always visible, never blinking: a screenshot must show how to start.
    outlinedText(ctx, 'PRESS SPACE OR CLICK TO RUN', 640, 424, 28, '#fff6e8', '#4a1a06');
    if (best > 0) {
      text(ctx, `BEST SCORE ${best}   •   BEST DISTANCE ${Math.floor(bestDistance)}m`, 640, 492, 17, PALETTE.corn, 'center', 800);
    }
  }

  function drawPaused(state) {
    ctx.fillStyle = 'rgba(24, 10, 32, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawPanel(440, 260, 400, 160);
    outlinedText(ctx, 'PAUSED', 640, 310, 52, '#ffd97a', '#4a1a06');
    text(ctx, 'Press P or click to keep running', 640, 372, 19, PALETTE.muted, 'center', 700);
  }

  function drawOver(state, best, bestDistance) {
    const escaped = state.escaped;
    ctx.fillStyle = escaped ? 'rgba(16, 40, 16, 0.55)' : 'rgba(40, 8, 8, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (escaped) {
      // The free turkey, big on the right; the panel hides the in-world one.
      drawTurkey(state, 1060, 560, 1.9, state.time * 9, 0);
    }
    // When caught, the in-world farmer already stands where he caught the
    // turkey — no second farmer is drawn.
    drawPanel(330, 130, 620, 400);
    if (escaped) {
      outlinedText(ctx, 'ESCAPED!', 640, 200, 72, '#7fd67a', '#0a2e0a');
      text(ctx, 'You made it to the forest. No Thanksgiving dinner today!', 640, 258, 20, PALETTE.text, 'center', 700);
    } else {
      outlinedText(ctx, 'CAUGHT!', 640, 200, 72, '#ff6b5e', '#2e0a06');
      text(ctx, 'The farmer got you… this time. The oven was already hot.', 640, 258, 20, PALETTE.text, 'center', 700);
    }
    text(ctx, `SCORE  ${Math.floor(state.score)}`, 640, 316, 30, PALETTE.corn, 'center', 900);
    text(ctx, `DISTANCE  ${Math.floor(state.distanceM)}m  •  CORN  x${state.corn}  •  FEATHERS  x${state.feathers}`, 640, 360, 20, PALETTE.text, 'center', 800);
    if (Math.floor(state.score) >= best && best > 0) {
      text(ctx, 'NEW BEST SCORE!', 640, 400, 22, '#ffd94a', 'center', 900);
    }
    text(ctx, `BEST  ${best}  •  BEST DISTANCE  ${Math.floor(bestDistance)}m`, 640, 428, 18, PALETTE.muted, 'center', 800);
    // Always visible, never blinking: a screenshot must show how to restart.
    outlinedText(ctx, 'PRESS R OR CLICK TO RUN AGAIN', 640, 486, 26, '#fff6e8', '#2e0a06');
  }

  function draw(state, screen, best, bestDistance) {
    fit();
    ctx.save();
    // Screen shake on stumble.
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawSky(state);
    drawHills(state);
    drawField(state);
    drawLeaves(state);
    // Obstacles, corn, feathers (behind the turkey when overlapping, in front when passed).
    for (const o of state.obstacles) {
      if (o.x < -160 || o.x > FIELD.width + 160) continue;
      if (o.kind === 'oven') drawOven(o);
      else if (o.kind === 'knife') drawKnife(o);
      else if (o.kind === 'fence') drawFence(o);
      else drawHay(o);
    }
    for (const c of state.corns) {
      if (!c.taken) drawCorn(c, state.time);
    }
    for (const f of state.goldenFeathers) {
      if (!f.taken) drawGoldenFeather(f, state.time);
    }
    // The farmer chases from the left; the turkey runs at its fixed x.
    // On the title screen the big title turkey and farmer take their place,
    // so the in-world pair is hidden there and never doubles up.
    // V2: both are drawn ~1.9x, and the farmer stays visible in-frame while
    // he trails, closing in as the gap shrinks — the chase must read at 320px.
    // (The old mapping put him off-screen left until the gap fell under 37m.)
    if (screen !== SCREEN_TITLE) {
      const farmerX = CHASE_READ.farmerX0 + (FARMER_START_GAP_M - state.farmerGapM) * CHASE_READ.farmerPxPerMetre;
      drawFarmer(state, farmerX, state.turkey.runPhase, CHASE_READ.farmerScale);
      const blink = state.turkey.invulnerable > 0 && Math.floor(state.time * 14) % 2 === 0;
      drawTurkey(state, state.turkey.x + 48, state.turkey.y, CHASE_READ.turkeyScale, state.turkey.runPhase, state.turkey.squash, blink ? 0.45 : 1);
    }
    drawParticles(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best, bestDistance);
    if (screen === SCREEN_TITLE) drawTitle(state, best, bestDistance);
    else if (screen === SCREEN_PAUSED) drawPaused(state);
    else if (screen === SCREEN_OVER) drawOver(state, best, bestDistance);
    // Red flash on a hit.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 60, 40, ${state.flash * 0.45})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    // Danger vignette when the farmer is close.
    if (state.farmerGapM <= FARMER_DANGER_GAP_M && state.running && !state.over) {
      const pulse = 0.10 + Math.sin(state.time * 6) * 0.05;
      const vg = ctx.createRadialGradient(640, 360, 260, 640, 360, 720);
      vg.addColorStop(0, 'rgba(255,40,30,0)');
      vg.addColorStop(1, `rgba(255,40,30,${pulse})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    ctx.restore();
  }

  return { draw, fit };
}
