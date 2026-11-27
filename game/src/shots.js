// The screenshot scenes behind ?shot=start|play|chase|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered
// by a simple autopilot (jump when an obstacle is inside the jump window),
// so the frame is what a short game really looks like and the same seed
// always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 24;
const CHASE_SECONDS = 16;
const END_LIMIT_SECONDS = 600;
/** Seconds of flight the autopilot wants before the obstacle: jump inside this window. */
const JUMP_WINDOW_SECONDS = 0.55;
/** The end scene's pilot reacts late, so it is caught out once the farm speeds up. */
const END_REACTION_SECONDS = 0.16;

function nearestObstacleAhead(state) {
  const turkeyFront = state.turkey.x + 96;
  let best = null;
  for (const o of state.obstacles) {
    if (o.x + o.width < turkeyFront) continue;
    if (best === null || o.x < best.x) best = o;
  }
  return best;
}

/** Jump (or double-jump) when the next obstacle is inside the jump window. */
function autopilot(state, reaction) {
  const o = nearestObstacleAhead(state);
  if (!o) return 0;
  const gapPx = o.x - (state.turkey.x + 96);
  const seconds = gapPx / Math.max(1, state.speed);
  const t = state.turkey;
  if (seconds <= JUMP_WINDOW_SECONDS && seconds > 0) {
    if (t.grounded || t.coyote > 0) return 1;
    if (t.jumpsUsed < 2 && seconds < JUMP_WINDOW_SECONDS * 0.45) return 1;
  }
  // A tall knife needs the jump started a touch earlier.
  if (o.kind === 'knife' && seconds <= JUMP_WINDOW_SECONDS + reaction && t.grounded) return 1;
  return 0;
}

/**
 * Set `world` to the named scene (start, play, chase or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'chase' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP, 0, true);
    return { screen: SCREEN_TITLE, best: 0, bestDistance: 0 };
  }
  state.running = true;
  if (name === 'chase') {
    // The farmer is breathing down the turkey's neck: a near-miss frame.
    // The gap is clamped close every step (clean running would let him fall
    // back), and the scene stops the moment the turkey is actually caught,
    // so the frame always shows a chase, never a catch.
    state.farmerGapM = 7;
    for (let i = 0; i < CHASE_SECONDS / STEP; i += 1) {
      world.step(STEP, autopilot(state, 0), false);
      if (state.over) break;
      state.farmerGapM = Math.min(state.farmerGapM, 7);
      // Freeze on a tense grounded frame: the turkey about to jump an
      // obstacle with the farmer right behind it, never mid-double-jump
      // high in the sky. (V2: window widened a touch — the bigger turkey
      // reads better with the obstacle a step further out.)
      const next = nearestObstacleAhead(state);
      if (next && state.turkey.grounded) {
        const gapPx = next.x - (state.turkey.x + 96);
        if (gapPx < 340 && gapPx > 140) break;
      }
    }
    if (state.over) {
      // Caught anyway: re-stage a shorter, cleaner chase.
      world.reset();
      state.running = true;
      state.farmerGapM = 7;
      for (let i = 0; i < 10 / STEP; i += 1) {
        world.step(STEP, autopilot(state, 0), false);
        if (state.over) break;
        state.farmerGapM = Math.min(state.farmerGapM, 7);
        const next = nearestObstacleAhead(state);
        if (next && state.turkey.grounded) {
          const gapPx = next.x - (state.turkey.x + 96);
          if (gapPx < 340 && gapPx > 140) break;
        }
      }
    }
    return { screen: SCREEN_PLAY, best: Math.floor(state.score), bestDistance: Math.floor(state.distanceM) };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const reaction = name === 'end' ? END_REACTION_SECONDS : 0;
  for (let i = 0; i < limit / STEP; i += 1) {
    const events = world.step(STEP, autopilot(state, reaction), false);
    if (events & EVENT_OVER) break;
    if (name === 'play' && state.distanceM > 100) {
      // V2: freeze on a live action frame — the turkey grounded with an
      // obstacle just ahead and the farmer in-frame behind it — so the
      // play shot shows the chase, not an empty stretch of field.
      const next = nearestObstacleAhead(state);
      if (next && state.turkey.grounded) {
        const gapPx = next.x - (state.turkey.x + 96);
        if (gapPx < 350 && gapPx > 150) break;
      }
    }
  }
  const over = state.over;
  return {
    screen: over ? SCREEN_OVER : SCREEN_PLAY,
    best: Math.floor(state.score),
    bestDistance: Math.floor(state.distanceM),
  };
}
