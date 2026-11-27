// A tiny seeded random generator (mulberry32) so a screenshot seed always
// replays the same farm: same obstacles, same corn arcs, same frame.
export function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** A float in [min, max). */
    range(min, max) {
      return min + (max - min) * next();
    },
    /** An integer in [min, max]. */
    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
    /** True with the given probability. */
    chance(p) {
      return next() < p;
    },
    /** Pick one element of an array. */
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
  };
}
