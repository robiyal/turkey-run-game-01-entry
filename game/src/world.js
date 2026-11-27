// Gobble Run's simulation: the turkey, the chasing farmer, the farm flying
// past, and everything the turkey can hit or collect. Pure logic, no drawing:
// the renderer paints whatever this state holds.
import {
  CORN,
  ESCAPE_DISTANCE_M,
  FARMER_DANGER_GAP_M,
  FARMER_GAIN_PER_HIT_M,
  FARMER_RECOVERY_MPS,
  FARMER_START_GAP_M,
  FEATHER,
  FIELD,
  OBSTACLE,
  PARTICLES,
  PX_PER_M,
  RUN,
  TURKEY,
  TURKEY_X,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_ESCAPED = 4;
export const EVENT_PICKUP = 8;
export const EVENT_FEATHER = 16;
export const EVENT_JUMP = 32;

const KIND_OVEN = 'oven';
const KIND_KNIFE = 'knife';
const KIND_FENCE = 'fence';
const KIND_HAY = 'hay';
const OBSTACLE_KINDS = [KIND_OVEN, KIND_KNIFE, KIND_FENCE, KIND_HAY];

export { KIND_OVEN, KIND_KNIFE, KIND_FENCE, KIND_HAY };

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const state = freshState();

  function freshState() {
    return {
      time: 0,
      running: false,
      over: false,
      escaped: false,
      caught: false,
      score: 0,
      distanceM: 0,
      corn: 0,
      feathers: 0,
      bestCombo: 0,
      speed: RUN.baseSpeed,
      farmerGapM: FARMER_START_GAP_M,
      shake: 0,
      flash: 0,
      spawnTimer: 1.1,
      featherTimer: FEATHER.intervalSeconds * 0.6,
      dustTimer: 0,
      scrollX: 0,
      turkey: {
        x: TURKEY_X,
        y: FIELD.groundY,
        vy: 0,
        grounded: true,
        jumpsUsed: 0,
        coyote: 0,
        invulnerable: 0,
        stumble: 0,
        squash: 0,
        runPhase: 0,
      },
      obstacles: [],
      corns: [],
      goldenFeathers: [],
      particles: [],
      leaves: [],
    };
  }

  function reset() {
    const keep = state;
    Object.assign(keep, freshState());
    // A few drifting autumn leaves from the start, so the title never looks empty.
    for (let i = 0; i < 14; i += 1) {
      keep.leaves.push({
        x: random.range(0, FIELD.width),
        y: random.range(0, FIELD.horizonY),
        size: random.range(6, 12),
        speed: random.range(14, 34),
        sway: random.range(0.6, 1.8),
        phase: random.range(0, Math.PI * 2),
      });
    }
  }

  function addParticles(x, y, count, kind, color, spread = 160, up = 220) {
    for (let i = 0; i < count; i += 1) {
      if (state.particles.length >= PARTICLES.max) return;
      state.particles.push({
        x,
        y,
        vx: random.range(-spread, spread),
        vy: random.range(-up, -20),
        life: random.range(0.35, 0.8),
        maxLife: 0.8,
        kind,
        color,
        size: random.range(4, 9),
        rot: random.range(0, Math.PI * 2),
        spin: random.range(-6, 6),
      });
    }
  }

  function spawnObstacle() {
    const kind = random.pick(OBSTACLE_KINDS);
    const size = OBSTACLE[kind];
    const x = FIELD.width + random.range(40, 160);
    state.obstacles.push({
      kind,
      x,
      y: FIELD.groundY - size.height,
      width: size.width,
      height: size.height,
      passed: false,
      wobble: random.range(0, Math.PI * 2),
    });
    // Corn often arcs over the obstacle, rewarding the jump that clears it.
    if (random.chance(0.65)) {
      const n = CORN.arcSize;
      for (let i = 0; i < n; i += 1) {
        const t = i / (n - 1);
        state.corns.push({
          x: x + size.width / 2 + (t - 0.5) * 190,
          y: FIELD.groundY - 150 - Math.sin(t * Math.PI) * 90,
          size: CORN.size,
          taken: false,
          bob: random.range(0, Math.PI * 2),
        });
      }
    } else if (random.chance(0.5)) {
      // A low corn line for a running pickup.
      for (let i = 0; i < 3; i += 1) {
        state.corns.push({
          x: x + 140 + i * 46,
          y: FIELD.groundY - 46,
          size: CORN.size,
          taken: false,
          bob: random.range(0, Math.PI * 2),
        });
      }
    }
  }

  function spawnGoldenFeather() {
    state.goldenFeathers.push({
      x: FIELD.width + 60,
      y: FIELD.groundY - random.range(170, 260),
      size: FEATHER.size,
      taken: false,
      bob: random.range(0, Math.PI * 2),
    });
  }

  function turkeyRect() {
    const t = state.turkey;
    // A forgiving hitbox: the turkey's drawn tail and beak do not count.
    return { x: t.x + 14, y: t.y - TURKEY.height + 10, width: TURKEY.width - 28, height: TURKEY.height - 12 };
  }

  function stumble() {
    const t = state.turkey;
    t.stumble = TURKEY.stumbleSeconds;
    t.invulnerable = TURKEY.invulnerableSeconds;
    state.farmerGapM = Math.max(0, state.farmerGapM - FARMER_GAIN_PER_HIT_M);
    state.shake = 14;
    state.flash = 0.35;
    addParticles(t.x + 48, t.y - 40, 22, 'feather', '#e8a33c', 240, 300);
    addParticles(t.x + 48, t.y - 40, 10, 'feather', '#a0522d', 200, 260);
  }

  function step(dt, jumps, titleMode) {
    const t = state.turkey;
    let events = 0;
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 46);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);

    // Leaves always drift, even on the title screen.
    for (const leaf of state.leaves) {
      leaf.x -= (leaf.speed + state.speed * 0.12) * dt;
      leaf.y += Math.sin(state.time * leaf.sway + leaf.phase) * 12 * dt + 6 * dt;
      if (leaf.x < -20) {
        leaf.x = FIELD.width + 10;
        leaf.y = random.range(0, FIELD.horizonY);
      }
    }
    if (state.leaves.length < 14 && random.chance(0.02)) {
      state.leaves.push({
        x: FIELD.width + 10,
        y: random.range(0, FIELD.horizonY),
        size: random.range(6, 12),
        speed: random.range(14, 34),
        sway: random.range(0.6, 1.8),
        phase: random.range(0, Math.PI * 2),
      });
    }

    if (!state.running) {
      // Attract mode behind the title: the turkey jogs in place, the farm scrolls.
      t.runPhase += dt * 9;
      state.scrollX += 140 * dt;
      t.squash = Math.sin(t.runPhase * 2) * 0.04;
      return events;
    }
    if (state.over) return events;

    // --- speed and distance ---
    state.speed = Math.min(RUN.maxSpeed, RUN.baseSpeed + state.distanceM * RUN.speedPerMetre);
    const metres = (state.speed * dt) / PX_PER_M;
    state.distanceM += metres;
    state.scrollX += state.speed * dt;
    state.score += metres * 1;
    t.runPhase += dt * (7 + state.speed / 90);

    // --- jumping (one queued jump per press, one jump per step: a second
    // press while airborne is the double jump, never spent in the same step) ---
    if (jumps > 0) {
      if (t.grounded || t.coyote > 0) {
        t.vy = TURKEY.jumpVelocity;
        t.grounded = false;
        t.coyote = 0;
        t.jumpsUsed = 1;
        t.squash = -0.18;
        events |= EVENT_JUMP;
        addParticles(t.x + 48, t.y, 6, 'dust', '#c9a06a', 90, 60);
      } else if (t.jumpsUsed < 2) {
        t.vy = TURKEY.doubleJumpVelocity;
        t.jumpsUsed = 2;
        t.squash = -0.14;
        events |= EVENT_JUMP;
        addParticles(t.x + 48, t.y - 30, 8, 'feather', '#f2e3c6', 120, 120);
      }
    }

    // --- vertical physics ---
    t.vy += TURKEY.gravity * dt;
    t.y += t.vy * dt;
    if (t.y >= FIELD.groundY) {
      if (!t.grounded && t.vy > 500) {
        t.squash = 0.16;
        addParticles(t.x + 48, t.y, 5, 'dust', '#c9a06a', 80, 50);
      }
      t.y = FIELD.groundY;
      t.vy = 0;
      t.grounded = true;
      t.jumpsUsed = 0;
      t.coyote = TURKEY.coyoteSeconds;
    } else {
      t.coyote = Math.max(0, t.coyote - dt);
    }
    t.squash *= 1 - Math.min(1, dt * 10);
    if (t.invulnerable > 0) t.invulnerable -= dt;
    if (t.stumble > 0) {
      t.stumble -= dt;
    }

    // --- the farmer: gains on every stumble, falls back while the turkey runs clean ---
    if (state.farmerGapM < FARMER_START_GAP_M) {
      state.farmerGapM = Math.min(FARMER_START_GAP_M, state.farmerGapM + FARMER_RECOVERY_MPS * dt);
    }
    if (state.farmerGapM <= 0) {
      state.over = true;
      state.caught = true;
      events |= EVENT_OVER;
      return events;
    }

    // --- spawning ---
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.distanceM > RUN.graceMetres) {
      spawnObstacle();
      const interval = Math.max(OBSTACLE.intervalMin, OBSTACLE.interval * (RUN.baseSpeed / state.speed));
      state.spawnTimer = interval * random.range(0.85, 1.25);
    }
    state.featherTimer -= dt;
    if (state.featherTimer <= 0) {
      spawnGoldenFeather();
      state.featherTimer = FEATHER.intervalSeconds * random.range(0.8, 1.3);
    }

    // --- move everything left at run speed ---
    const move = state.speed * dt;
    for (const o of state.obstacles) {
      o.x -= move;
      o.wobble += dt * 3;
    }
    for (const c of state.corns) c.x -= move;
    for (const f of state.goldenFeathers) f.x -= move;

    // --- running dust ---
    state.dustTimer -= dt;
    if (t.grounded && state.dustTimer <= 0) {
      state.dustTimer = PARTICLES.dustEverySeconds;
      addParticles(t.x + 12, t.y - 2, 1, 'dust', '#c9a06a', 40, 30);
    }

    // --- particles ---
    for (let i = state.particles.length - 1; i >= 0; i -= 1) {
      const p = state.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      p.x -= move * 0.35;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += (p.kind === 'dust' ? -30 : 500) * dt;
      p.rot += p.spin * dt;
    }

    // --- collisions ---
    const rect = turkeyRect();
    for (const o of state.obstacles) {
      if (o.x + o.width < -40) continue;
      if (!o.passed && o.x + o.width < t.x) {
        o.passed = true;
        state.score += 2;
      }
      if (t.invulnerable <= 0 && rectsOverlap(rect, o)) {
        stumble();
        events |= EVENT_HIT;
        if (state.farmerGapM <= 0) {
          state.over = true;
          state.caught = true;
          events |= EVENT_OVER;
          return events;
        }
      }
    }
    for (const c of state.corns) {
      if (c.taken || c.x < -40) continue;
      const r = { x: c.x - c.size / 2, y: c.y - c.size / 2, width: c.size, height: c.size };
      if (rectsOverlap(rect, r)) {
        c.taken = true;
        state.corn += 1;
        state.score += CORN.points;
        events |= EVENT_PICKUP;
        addParticles(c.x, c.y, 8, 'spark', '#ffd94a', 120, 160);
      }
    }
    for (const f of state.goldenFeathers) {
      if (f.taken || f.x < -40) continue;
      const r = { x: f.x - f.size / 2, y: f.y - f.size / 2, width: f.size, height: f.size };
      if (rectsOverlap(rect, r)) {
        f.taken = true;
        state.feathers += 1;
        state.score += FEATHER.points;
        events |= EVENT_FEATHER;
        addParticles(f.x, f.y, 14, 'spark', '#ffd94a', 160, 220);
      }
    }

    // --- cleanup ---
    state.obstacles = state.obstacles.filter((o) => o.x + o.width > -60);
    state.corns = state.corns.filter((c) => !c.taken && c.x > -60);
    state.goldenFeathers = state.goldenFeathers.filter((f) => !f.taken && f.x > -60);

    // --- escape! ---
    if (state.distanceM >= ESCAPE_DISTANCE_M) {
      state.over = true;
      state.escaped = true;
      events |= EVENT_ESCAPED | EVENT_OVER;
    }
    return events;
  }

  function start() {
    reset();
    state.running = true;
  }

  reset();
  return {
    state,
    reset,
    start,
    step,
    /** The farmer's screen x: he closes in as the gap shrinks. */
    farmerScreenX() {
      const gapPx = state.farmerGapM * 6;
      return TURKEY_X - 78 - gapPx;
    },
    get danger() {
      return state.farmerGapM <= FARMER_DANGER_GAP_M && state.running && !state.over;
    },
  };
}
