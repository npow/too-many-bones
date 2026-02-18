// renderer.js - Canvas rendering for battle mat

const Renderer = {
  canvas: null,
  ctx: null,
  cellSize: 0,
  offsetX: 0,
  offsetY: 0,
  hoveredCell: null,
  selectedCell: null,
  validMoves: [],
  validTargets: [],
  animations: [],

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const maxW = parent.clientWidth - 24;
    const maxH = parent.clientHeight - 24;
    const size = Math.min(maxW, maxH, 500);
    this.canvas.width = size;
    this.canvas.height = size;
    this.cellSize = Math.floor(size / Config.GRID_COLS);
    this.offsetX = Math.floor((size - this.cellSize * Config.GRID_COLS) / 2);
    this.offsetY = Math.floor((size - this.cellSize * Config.GRID_ROWS) / 2);
  },

  // Get cell from pixel coords
  getCellFromPixel(x, y) {
    const col = Math.floor((x - this.offsetX) / this.cellSize);
    const row = Math.floor((y - this.offsetY) / this.cellSize);
    if (row >= 0 && row < Config.GRID_ROWS && col >= 0 && col < Config.GRID_COLS) {
      return { row, col };
    }
    return null;
  },

  // Main render
  render(battleState, gearloc) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const cs = this.cellSize;

    // Clear
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid
    this.drawGrid(ctx, cs);

    // Valid moves overlay
    this.drawValidMoves(ctx, cs);

    // Valid targets overlay
    this.drawValidTargets(ctx, cs);

    // Units
    if (battleState) {
      this.drawUnits(ctx, cs, battleState, gearloc);
    }

    // Hover highlight
    if (this.hoveredCell) {
      this.drawHover(ctx, cs);
    }

    // Selected highlight
    if (this.selectedCell) {
      this.drawSelected(ctx, cs);
    }

    // Animations
    this.drawAnimations(ctx);
  },

  drawGrid(ctx, cs) {
    const ox = this.offsetX;
    const oy = this.offsetY;

    // Grid background
    for (let r = 0; r < Config.GRID_ROWS; r++) {
      for (let c = 0; c < Config.GRID_COLS; c++) {
        const x = ox + c * cs;
        const y = oy + r * cs;
        ctx.fillStyle = (r + c) % 2 === 0 ? '#1a1a2e' : '#16162a';
        ctx.fillRect(x, y, cs, cs);
      }
    }

    // Grid lines
    ctx.strokeStyle = '#2a2a44';
    ctx.lineWidth = 1;
    for (let r = 0; r <= Config.GRID_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + r * cs);
      ctx.lineTo(ox + Config.GRID_COLS * cs, oy + r * cs);
      ctx.stroke();
    }
    for (let c = 0; c <= Config.GRID_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(ox + c * cs, oy);
      ctx.lineTo(ox + c * cs, oy + Config.GRID_ROWS * cs);
      ctx.stroke();
    }

    // Lane labels
    ctx.fillStyle = '#404060';
    ctx.font = `${Math.max(10, cs * 0.12)}px sans-serif`;
    ctx.textAlign = 'center';
    for (let c = 0; c < Config.GRID_COLS; c++) {
      ctx.fillText(`Lane ${c + 1}`, ox + c * cs + cs / 2, oy - 4);
    }
  },

  drawValidMoves(ctx, cs) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
    ctx.lineWidth = 2;
    for (const [r, c] of this.validMoves) {
      const x = ox + c * cs;
      const y = oy + r * cs;
      ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
      ctx.strokeRect(x + 2, y + 2, cs - 4, cs - 4);
    }
  },

  drawValidTargets(ctx, cs) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    ctx.fillStyle = 'rgba(244, 67, 54, 0.2)';
    ctx.strokeStyle = 'rgba(244, 67, 54, 0.6)';
    ctx.lineWidth = 2;
    for (const [r, c] of this.validTargets) {
      const x = ox + c * cs;
      const y = oy + r * cs;
      ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
      ctx.strokeRect(x + 2, y + 2, cs - 4, cs - 4);
    }
  },

  drawUnits(ctx, cs, battle, gearloc) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    const chipRadius = cs * 0.35;

    // Draw gearloc
    if (gearloc && gearloc.row !== null && gearloc.col !== null) {
      const cx = ox + gearloc.col * cs + cs / 2;
      const cy = oy + gearloc.row * cs + cs / 2;
      this.drawChip(ctx, cx, cy, chipRadius, gearloc.chipColor, gearloc.color, gearloc.name[0], gearloc.hp, gearloc.maxHp, true);
    }

    // Draw baddies on mat
    for (const b of battle.baddies) {
      if (b.hp <= 0 || b.row === null || b.col === null) continue;
      const cx = ox + b.col * cs + cs / 2;
      const cy = oy + b.row * cs + cs / 2;
      this.drawChip(ctx, cx, cy, chipRadius, b.color, b.color, b.name[0], b.hp, b.maxHp, false);

      // Status indicators
      if (b.stunned) {
        ctx.fillStyle = 'rgba(156, 39, 176, 0.4)';
        ctx.beginPath();
        ctx.arc(cx, cy, chipRadius + 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw tyrant
    if (battle.tyrantUnit && battle.tyrantUnit.hp > 0 && battle.tyrantUnit.row !== null) {
      const t = battle.tyrantUnit;
      const cx = ox + t.col * cs + cs / 2;
      const cy = oy + t.row * cs + cs / 2;
      this.drawChip(ctx, cx, cy, chipRadius * 1.15, t.chipColor, t.color, t.name[0], t.hp, t.maxHp, false, true);
    }
  },

  drawChip(ctx, cx, cy, r, fillColor, borderColor, letter, hp, maxHp, isGearloc, isTyrant = false) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 2, r, 0, Math.PI * 2);
    ctx.fill();

    // Main circle
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = isGearloc ? '#ffd54f' : (isTyrant ? '#ff5252' : borderColor);
    ctx.lineWidth = isGearloc ? 3 : (isTyrant ? 3 : 2);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // HP arc
    const hpPct = hp / maxHp;
    if (hpPct < 1) {
      ctx.strokeStyle = hpPct > 0.5 ? '#4caf50' : (hpPct > 0.25 ? '#ff9800' : '#f44336');
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpPct);
      ctx.stroke();
    }

    // Letter
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${r * 0.9}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, cx, cy - r * 0.1);

    // HP text
    ctx.font = `${r * 0.4}px sans-serif`;
    ctx.fillStyle = '#ddd';
    ctx.fillText(`${hp}`, cx, cy + r * 0.45);
  },

  drawHover(ctx, cs) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    const { row, col } = this.hoveredCell;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + col * cs + 1, oy + row * cs + 1, cs - 2, cs - 2);
  },

  drawSelected(ctx, cs) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    const { row, col } = this.selectedCell;
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 3;
    ctx.strokeRect(ox + col * cs + 2, oy + row * cs + 2, cs - 4, cs - 4);
  },

  // Animation system
  addAnimation(anim) {
    anim.startTime = performance.now();
    this.animations.push(anim);
  },

  drawAnimations(ctx) {
    const now = performance.now();
    this.animations = this.animations.filter(a => {
      const elapsed = now - a.startTime;
      const t = Math.min(1, elapsed / a.duration);

      if (a.type === 'damage') {
        const ox = this.offsetX;
        const oy = this.offsetY;
        const cx = ox + a.col * this.cellSize + this.cellSize / 2;
        const cy = oy + a.row * this.cellSize + this.cellSize / 2;
        const alpha = 1 - t;
        const y = cy - 20 * t;
        ctx.fillStyle = `rgba(255, 80, 80, ${alpha})`;
        ctx.font = `bold 18px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`-${a.value}`, cx, y);
      } else if (a.type === 'heal') {
        const ox = this.offsetX;
        const oy = this.offsetY;
        const cx = ox + a.col * this.cellSize + this.cellSize / 2;
        const cy = oy + a.row * this.cellSize + this.cellSize / 2;
        const alpha = 1 - t;
        const y = cy - 20 * t;
        ctx.fillStyle = `rgba(76, 175, 80, ${alpha})`;
        ctx.font = `bold 18px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`+${a.value}`, cx, y);
      } else if (a.type === 'flash') {
        const ox = this.offsetX;
        const oy = this.offsetY;
        const x = ox + a.col * this.cellSize;
        const y = oy + a.row * this.cellSize;
        const alpha = (1 - t) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(x, y, this.cellSize, this.cellSize);
      }

      return t < 1;
    });
  },

  // Clear all overlays
  clearOverlays() {
    this.validMoves = [];
    this.validTargets = [];
    this.selectedCell = null;
    this.hoveredCell = null;
  }
};
