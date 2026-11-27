// Gobble Run — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it
// to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, groundY: 620, horizonY: 300 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The turkey runs at this screen x; the farm scrolls past it. */
export const TURKEY_X = 300;

/** How far the turkey must run to escape: reach the forest gate. */
export const ESCAPE_DISTANCE_M = 1500;

/** Pixels per metre, for the distance readout and the farmer gap. */
export const PX_PER_M = 40;

/** The farmer starts this many metres behind the turkey. */
export const FARMER_START_GAP_M = 42;
/** Metres the farmer gains each time the turkey stumbles on an obstacle. */
export const FARMER_GAIN_PER_HIT_M = 13;
/** Metres per second the gap recovers while the turkey runs clean. */
export const FARMER_RECOVERY_MPS = 1.6;
/** Below this gap the screen flashes a warning and the farmer looms large. */
export const FARMER_DANGER_GAP_M = 12;

export const TURKEY = {
  width: 96,
  height: 84,
  gravity: 2600,
  jumpVelocity: -980,
  doubleJumpVelocity: -840,
  coyoteSeconds: 0.09,
  invulnerableSeconds: 1.4,
  stumbleSeconds: 0.55,
};

/** V2 — chase readability at the judged size (320px). Visual only: the
 *  rules, the hitboxes and the farmer's gap mechanics are untouched. The
 *  turkey and the farmer are drawn bigger and the farmer is kept in-frame,
 *  so the chase reads as a chase when the screenshot is shrunk. */
export const CHASE_READ = {
  /** In-play draw scale for the turkey (was 1; the title and end screens already drew it at 1.9). */
  turkeyScale: 1.9,
  /** In-play draw scale for the farmer (was 1, a fixed size). */
  farmerScale: 1.9,
  /** Farmer screen x while the gap is at its start (42m): left third, fully in frame. */
  farmerX0: 120,
  /** Pixels the farmer visibly closes for each metre the gap shrinks. */
  farmerPxPerMetre: 2.7,
};

export const RUN = {
  baseSpeed: 400,
  speedPerMetre: 0.32,
  maxSpeed: 760,
  /** Metres of run before the first obstacle appears. */
  graceMetres: 30,
};

/** Obstacle kinds. Every one is jumped over; heights differ so the jump timing matters. */
export const OBSTACLE = {
  oven: { width: 96, height: 112 },
  knife: { width: 40, height: 140 },
  fence: { width: 76, height: 66 },
  hay: { width: 88, height: 78 },
  /** Seconds between spawns at base speed; shrinks as the run speeds up. */
  interval: 1.2,
  intervalMin: 0.65,
  /** Spawn gap in pixels, kept clear so two obstacles never overlap unfairly. */
  minGapPx: 420,
};

export const CORN = {
  size: 30,
  points: 10,
  /** Corn flies in arcs of this many cobs. */
  arcSize: 4,
};

export const FEATHER = {
  size: 26,
  points: 25,
  /** Seconds between golden-feather spawns, roughly. */
  intervalSeconds: 22,
};

export const PARTICLES = { max: 220, dustEverySeconds: 0.09 };

export const PALETTE = {
  skyTop: '#2e1a4d',
  skyMid: '#c94b2e',
  skyLow: '#f2a541',
  sun: '#ffd97a',
  sunCore: '#fff3c4',
  cloud: '#ffd9a8',
  hillFar: '#7a4a6e',
  hillNear: '#5d3a52',
  field: '#b5772e',
  fieldDark: '#96631f',
  ground: '#6b4423',
  groundTop: '#8a5a2b',
  fenceWood: '#7a4a26',
  fenceDark: '#5d3517',
  barn: '#a83226',
  barnRoof: '#6e1f16',
  barnTrim: '#f2e3c6',
  hay: '#e8b64c',
  hayDark: '#c98f2e',
  oven: '#3d3a45',
  ovenHot: '#ff7a2e',
  ovenGlow: '#ffb347',
  knifeBlade: '#d7dde6',
  knifeEdge: '#f4f7fb',
  knifeHandle: '#5d2f16',
  turkeyBody: '#8a5230',
  turkeyDark: '#6b3d22',
  turkeyWing: '#a06a3a',
  turkeyTail: ['#a0522d', '#d2691e', '#e8a33c', '#c94b2e'],
  turkeyHead: '#e8eef5',
  turkeyWattle: '#e5534b',
  turkeyBeak: '#f2a541',
  turkeyLeg: '#e8a33c',
  farmerOveralls: '#3a5a8c',
  farmerShirt: '#c94b2e',
  farmerSkin: '#e8b98a',
  farmerHat: '#f2d06b',
  farmerBoots: '#4a2c14',
  corn: '#f2c94c',
  cornHusk: '#7fae4c',
  featherGold: '#ffd94a',
  panel: 'rgba(24, 12, 32, 0.82)',
  panelEdge: '#f2a541',
  text: '#fff6e8',
  textDark: '#2e1a12',
  muted: '#ffd9a8',
  danger: '#ff4d3d',
  safe: '#7fd67a',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_DISPLAY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** V2 — HUD and warning text sized to read at 320px (was 13–30px, noise when shrunk). */
export const HUD_READ = {
  scoreSize: 36,
  valueSize: 32,
  gapTextSize: 18,
  distSize: 19,
  warningSize: 48,
};

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'gobble-run.best';
export const BEST_DISTANCE_KEY = 'gobble-run.best-distance';
