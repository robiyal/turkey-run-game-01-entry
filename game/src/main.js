// Gobble Run's boot and one loop: input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast
// one), and the renderer paints what is there. The game moves between four
// screens: title, play, paused and game over (caught or escaped).
//
// ?seed=N fixes the farm's pattern. ?shot=start|play|chase|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. window.__game exposes the live state
// for playtests; window.__gameReady is set once the first frame has painted.
import { BEST_DISTANCE_KEY, BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_ESCAPED, EVENT_FEATHER, EVENT_HIT, EVENT_OVER, EVENT_PICKUP } from './world.js';
import { ACTION_CONFIRM, ACTION_JUMP, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest(key) {
  try {
    return Number.parseInt(window.localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

// The live state, for playtests and for anyone poking at the game.
window.__game = {
  get mode() {
    return currentScreen;
  },
  get state() {
    return world.state;
  },
  get score() {
    return Math.floor(world.state.score);
  },
  get distanceM() {
    return Math.floor(world.state.distanceM);
  },
  get farmerGapM() {
    return world.state.farmerGapM;
  },
  get corn() {
    return world.state.corn;
  },
  get best() {
    return best;
  },
};

let currentScreen = SCREEN_TITLE;
let best = readBest(BEST_KEY);
let bestDistance = readBest(BEST_DISTANCE_KEY);

function runShot(name) {
  const scene = stageShot(name, world);
  best = Math.max(best, scene.best);
  bestDistance = Math.max(bestDistance, scene.bestDistance);
  currentScreen = scene.screen;
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, best, bestDistance);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      window.__gameReady = true;
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let firstPaint = true;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.click();
    world.start();
    accumulator = 0;
    screen = SCREEN_PLAY;
    currentScreen = SCREEN_PLAY;
    announce('Playing. Run from the farmer, jump the ovens and knives.');
  }

  function endGame(escaped) {
    screen = SCREEN_OVER;
    currentScreen = SCREEN_OVER;
    const finalScore = Math.floor(world.state.score);
    const finalDistance = Math.floor(world.state.distanceM);
    if (finalScore > best) {
      best = finalScore;
      saveBest(BEST_KEY, best);
    }
    if (finalDistance > bestDistance) {
      bestDistance = finalDistance;
      saveBest(BEST_DISTANCE_KEY, bestDistance);
    }
    if (escaped) audio.escaped();
    else audio.caught();
    announce(
      escaped
        ? `Escaped! Score ${finalScore}. Best ${best}.`
        : `Caught! Score ${finalScore}. Best ${best}.`,
    );
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_JUMP) audio.unlock();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      currentScreen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      currentScreen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, 0, true);
      return;
    }
    const jumps = input.takeJumps();
    const events = world.step(STEP, jumps, false);
    if (events & EVENT_HIT) {
      audio.hit();
      audio.gobble();
      announce(
        world.state.farmerGapM <= 12
          ? 'Hit! The farmer is right behind you!'
          : `Hit! The farmer gains on you — ${Math.ceil(world.state.farmerGapM)}m behind.`,
      );
    }
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_FEATHER) audio.feather();
    if (events & EVENT_OVER) endGame(Boolean(events & EVENT_ESCAPED));
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, bestDistance);
    if (firstPaint) {
      firstPaint = false;
      window.__gameReady = true;
    }
  }

  // Leaving the tab pauses a running game rather than letting the farmer catch the turkey unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      currentScreen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Gobble Run. Press Space or click to run from the farmer.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
