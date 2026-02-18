// utils.js - Helpers, RNG, pathfinding

const Utils = {
  // Seeded RNG (xorshift128)
  _seed: [Date.now(), Date.now() ^ 0xDEADBEEF, Date.now() ^ 0xCAFEBABE, Date.now() ^ 0x12345678],

  seed(s) {
    this._seed = [s, s ^ 0xDEADBEEF, s ^ 0xCAFEBABE, s ^ 0x12345678];
  },

  _xorshift128() {
    let [a, b, c, d] = this._seed;
    const t = d;
    d = c; c = b; b = a;
    a ^= (a << 11); a ^= (a >>> 8); a ^= (t ^ (t >>> 19));
    this._seed = [a, b, c, d];
    return (a >>> 0) / 4294967296;
  },

  random() {
    return this._xorshift128();
  },

  randInt(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  },

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  pick(arr) {
    return arr[Math.floor(this.random() * arr.length)];
  },

  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },

  // BFS pathfinding on 4x4 grid
  bfs(grid, startRow, startCol, targetRow, targetCol) {
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue = [[startRow, startCol, []]];
    visited[startRow][startCol] = true;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    while (queue.length > 0) {
      const [r, c, path] = queue.shift();
      if (r === targetRow && c === targetCol) return path;
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
          const cell = grid[nr][nc];
          if (cell === null || (nr === targetRow && nc === targetCol)) {
            visited[nr][nc] = true;
            queue.push([nr, nc, [...path, [nr, nc]]]);
          }
        }
      }
    }
    return null; // no path
  },

  // Manhattan distance
  manhattan(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
  },

  // Deep clone
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  // Generate unique ID
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // Weighted random pick
  weightedPick(items, weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.random() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  },

  // Lerp
  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  // Ease out cubic
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  },

  // Ease in out
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },

  // Format number
  formatNum(n) {
    return n >= 0 ? `+${n}` : `${n}`;
  },

  // Wait ms (for async sequences)
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
