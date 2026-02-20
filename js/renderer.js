// renderer.js - Canvas rendering for battle mat (TMB neoprene-inspired)

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
  _noisePattern: null,
  _activeTurnId: null,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._createNoisePattern();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  // Create a subtle noise pattern for neoprene texture
  _createNoisePattern() {
    const size = 128;
    const offscreen = document.createElement('canvas');
    offscreen.width = size;
    offscreen.height = size;
    const octx = offscreen.getContext('2d');
    const imageData = octx.createImageData(size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = Math.random() * 12;
      imageData.data[i] = noise;
      imageData.data[i + 1] = noise;
      imageData.data[i + 2] = noise * 1.1;
      imageData.data[i + 3] = 20;
    }
    octx.putImageData(imageData, 0, 0);
    this._noisePattern = this.ctx.createPattern(offscreen, 'repeat');
  },

  resize() {
    if (!this.canvas) return;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const maxW = parent.clientWidth - 24;
    const maxH = parent.clientHeight - 24;
    const size = Math.min(maxW, maxH, 520);
    this.canvas.width = size;
    this.canvas.height = size;
    this.cellSize = Math.floor(size / Config.GRID_COLS);
    this.offsetX = Math.floor((size - this.cellSize * Config.GRID_COLS) / 2);
    this.offsetY = Math.floor((size - this.cellSize * Config.GRID_ROWS) / 2);
  },

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

    // Clear with dark background
    ctx.fillStyle = '#0d0b14';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Neoprene mat base
    this.drawMatBackground(ctx, cs);

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

  // Draw neoprene-like mat background
  drawMatBackground(ctx, cs) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    const w = Config.GRID_COLS * cs;
    const h = Config.GRID_ROWS * cs;

    // Mat base gradient
    const grad = ctx.createRadialGradient(
      ox + w / 2, oy + h / 2, 0,
      ox + w / 2, oy + h / 2, w * 0.7
    );
    grad.addColorStop(0, '#1e1828');
    grad.addColorStop(1, '#141018');
    ctx.fillStyle = grad;
    ctx.fillRect(ox - 4, oy - 4, w + 8, h + 8);

    // Subtle noise texture
    if (this._noisePattern) {
      ctx.fillStyle = this._noisePattern;
      ctx.fillRect(ox - 4, oy - 4, w + 8, h + 8);
    }

    // Mat border (beveled edge)
    ctx.strokeStyle = '#3a3248';
    ctx.lineWidth = 3;
    ctx.strokeRect(ox - 3, oy - 3, w + 6, h + 6);
    ctx.strokeStyle = '#252030';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox - 5, oy - 5, w + 10, h + 10);
  },

  drawGrid(ctx, cs) {
    const ox = this.offsetX;
    const oy = this.offsetY;

    // Grid cells
    for (let r = 0; r < Config.GRID_ROWS; r++) {
      for (let c = 0; c < Config.GRID_COLS; c++) {
        const x = ox + c * cs;
        const y = oy + r * cs;
        // Alternating dark cells for depth
        ctx.fillStyle = (r + c) % 2 === 0 ? '#1c1828' : '#181424';
        ctx.fillRect(x, y, cs, cs);
      }
    }

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(60, 50, 80, 0.5)';
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

    // Lane labels as small chips at top
    for (let c = 0; c < Config.GRID_COLS; c++) {
      const cx = ox + c * cs + cs / 2;
      const cy = oy - 12;
      // Lane chip
      ctx.fillStyle = '#2a2440';
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#3a3458';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.stroke();
      // Lane number
      ctx.fillStyle = '#706080';
      ctx.font = `bold ${Math.max(8, cs * 0.09)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${c + 1}`, cx, cy);
    }

    // Row labels on left
    for (let r = 0; r < Config.GRID_ROWS; r++) {
      const cx = ox - 12;
      const cy = oy + r * cs + cs / 2;
      ctx.fillStyle = '#504868';
      ctx.font = `${Math.max(8, cs * 0.09)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String.fromCharCode(65 + r), cx, cy);
    }
  },

  drawValidMoves(ctx, cs) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    for (const [r, c] of this.validMoves) {
      const x = ox + c * cs;
      const y = oy + r * cs;
      // Pulsing green overlay
      ctx.fillStyle = 'rgba(76, 175, 80, 0.15)';
      ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
      ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x + 3, y + 3, cs - 6, cs - 6);
      ctx.setLineDash([]);
      // Movement dot
      ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
      ctx.beginPath();
      ctx.arc(x + cs / 2, y + cs / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  drawValidTargets(ctx, cs) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    for (const [r, c] of this.validTargets) {
      const x = ox + c * cs;
      const y = oy + r * cs;
      // Red targeting overlay
      ctx.fillStyle = 'rgba(244, 67, 54, 0.15)';
      ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
      ctx.strokeStyle = 'rgba(244, 67, 54, 0.7)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 3, y + 3, cs - 6, cs - 6);
      // Crosshair
      const cx = x + cs / 2;
      const cy = y + cs / 2;
      ctx.strokeStyle = 'rgba(244, 67, 54, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
      ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
      ctx.stroke();
    }
  },

  drawUnits(ctx, cs, battle, gearloc) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    const chipRadius = cs * 0.36;

    // Draw baddies first (so gearloc renders on top)
    for (const b of battle.baddies) {
      if (b.hp <= 0 || b.row === null || b.col === null) continue;
      const cx = ox + b.col * cs + cs / 2;
      const cy = oy + b.row * cs + cs / 2;
      const isActive = battle.initiative[battle.currentTurnIndex] &&
                       battle.initiative[battle.currentTurnIndex].id === b.id;
      this.drawChip(ctx, cx, cy, chipRadius * 0.9, b.color, b.color, b.name[0], b.hp, b.maxHp, false, false, isActive);

      // Status indicators
      this._drawStatusEffects(ctx, cx, cy, chipRadius * 0.9, b);
    }

    // Draw tyrant
    if (battle.tyrantUnit && battle.tyrantUnit.hp > 0 && battle.tyrantUnit.row !== null) {
      const t = battle.tyrantUnit;
      const cx = ox + t.col * cs + cs / 2;
      const cy = oy + t.row * cs + cs / 2;
      const isActive = battle.initiative[battle.currentTurnIndex] &&
                       battle.initiative[battle.currentTurnIndex].id === t.id;
      this.drawChip(ctx, cx, cy, chipRadius * 1.15, t.chipColor, t.color, t.name[0], t.hp, t.maxHp, false, true, isActive);
    }

    // Draw gearloc (on top)
    if (gearloc && gearloc.row !== null && gearloc.col !== null) {
      const cx = ox + gearloc.col * cs + cs / 2;
      const cy = oy + gearloc.row * cs + cs / 2;
      const isActive = battle.initiative[battle.currentTurnIndex] &&
                       battle.initiative[battle.currentTurnIndex].isGearloc;
      this.drawChip(ctx, cx, cy, chipRadius, gearloc.chipColor, gearloc.color, gearloc.name[0], gearloc.hp, gearloc.maxHp, true, false, isActive);
      this._drawStatusEffects(ctx, cx, cy, chipRadius, gearloc);
    }
  },

  drawChip(ctx, cx, cy, r, fillColor, borderColor, letter, hp, maxHp, isGearloc, isTyrant = false, isActiveTurn = false) {
    // Active turn glow
    if (isActiveTurn) {
      const glowColor = isGearloc ? 'rgba(201,168,76,0.3)' : 'rgba(196,64,64,0.3)';
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
      ctx.fill();
      // Pulsing ring
      const pulseColor = isGearloc ? 'rgba(201,168,76,0.5)' : 'rgba(196,64,64,0.5)';
      ctx.strokeStyle = pulseColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.arc(cx + 2, cy + 3, r, 0, Math.PI * 2);
    ctx.fill();

    // Outer ring (poker chip edge)
    const outerGrad = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r);
    outerGrad.addColorStop(0, fillColor);
    outerGrad.addColorStop(1, this._darkenColor(fillColor, 0.6));
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Inner disc
    const innerR = r * 0.78;
    const innerGrad = ctx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, 0, cx, cy, innerR);
    innerGrad.addColorStop(0, this._lightenColor(fillColor, 1.3));
    innerGrad.addColorStop(1, fillColor);
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.fill();

    // Chip notches (poker chip style)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const x1 = cx + Math.cos(angle) * (r * 0.82);
      const y1 = cy + Math.sin(angle) * (r * 0.82);
      const x2 = cx + Math.cos(angle) * (r * 0.98);
      const y2 = cy + Math.sin(angle) * (r * 0.98);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Border ring
    ctx.strokeStyle = isGearloc ? '#ffd54f' : (isTyrant ? '#ff5252' : 'rgba(255,255,255,0.2)');
    ctx.lineWidth = isGearloc ? 2.5 : (isTyrant ? 2.5 : 1.5);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // HP arc (outer ring)
    const hpPct = hp / maxHp;
    if (hpPct < 1) {
      const hpColor = hpPct > 0.5 ? '#4caf50' : (hpPct > 0.25 ? '#ff9800' : '#f44336');
      ctx.strokeStyle = hpColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hpPct);
      ctx.stroke();
      // HP background arc
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 3, -Math.PI / 2 + Math.PI * 2 * hpPct, -Math.PI / 2 + Math.PI * 2);
      ctx.stroke();
    }

    // Letter
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${r * 0.85}px Cinzel, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3;
    ctx.fillText(letter, cx, cy - r * 0.08);
    ctx.shadowBlur = 0;

    // HP text below letter
    ctx.font = `bold ${r * 0.35}px sans-serif`;
    ctx.fillStyle = hpPct > 0.5 ? '#ccc' : (hpPct > 0.25 ? '#ff9800' : '#f44336');
    ctx.fillText(`${hp}/${maxHp}`, cx, cy + r * 0.4);
  },

  _drawStatusEffects(ctx, cx, cy, r, unit) {
    const effects = unit.statusEffects || [];
    if (effects.length === 0 && !unit.stunned) return;

    let badges = [];
    if (unit.stunned) badges.push({ label: 'STUN', color: '#9c27b0' });
    for (const e of effects) {
      if (e.type === 'poison') badges.push({ label: 'PSN', color: '#4caf50' });
      if (e.type === 'burn') badges.push({ label: 'BRN', color: '#ff5722' });
    }

    badges.forEach((badge, i) => {
      const bx = cx + (i - (badges.length - 1) / 2) * 22;
      const by = cy + r + 10;
      // Badge background
      ctx.fillStyle = badge.color;
      const tw = ctx.measureText(badge.label).width;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bx - 10, by - 5, 20, 10, 3);
      } else {
        ctx.rect(bx - 10, by - 5, 20, 10);
      }
      ctx.fill();
      // Badge text
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 6px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badge.label, bx, by);
    });
  },

  _darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)}, ${Math.floor(g * factor)}, ${Math.floor(b * factor)})`;
  },

  _lightenColor(hex, factor) {
    const r = Math.min(255, parseInt(hex.slice(1, 3), 16) * factor);
    const g = Math.min(255, parseInt(hex.slice(3, 5), 16) * factor);
    const b = Math.min(255, parseInt(hex.slice(5, 7), 16) * factor);
    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  },

  drawHover(ctx, cs) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    const { row, col } = this.hoveredCell;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + col * cs + 1, oy + row * cs + 1, cs - 2, cs - 2);
  },

  drawSelected(ctx, cs) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    const { row, col } = this.selectedCell;
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(ox + col * cs + 2, oy + row * cs + 2, cs - 4, cs - 4);
    ctx.setLineDash([]);
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
        const y = cy - 30 * t;
        const scale = 1 + (1 - t) * 0.3;
        ctx.save();
        ctx.translate(cx, y);
        ctx.scale(scale, scale);
        ctx.fillStyle = `rgba(255, 80, 80, ${alpha})`;
        ctx.font = `bold 20px Cinzel, serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(`-${a.value}`, 0, 0);
        ctx.restore();
      } else if (a.type === 'heal') {
        const ox = this.offsetX;
        const oy = this.offsetY;
        const cx = ox + a.col * this.cellSize + this.cellSize / 2;
        const cy = oy + a.row * this.cellSize + this.cellSize / 2;
        const alpha = 1 - t;
        const y = cy - 30 * t;
        ctx.save();
        ctx.fillStyle = `rgba(76, 175, 80, ${alpha})`;
        ctx.font = `bold 20px Cinzel, serif`;
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillText(`+${a.value}`, cx, y);
        ctx.restore();
      } else if (a.type === 'flash') {
        const ox = this.offsetX;
        const oy = this.offsetY;
        const x = ox + a.col * this.cellSize;
        const y = oy + a.row * this.cellSize;
        const alpha = (1 - t) * 0.6;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fillRect(x, y, this.cellSize, this.cellSize);
      }

      return t < 1;
    });
  },

  clearOverlays() {
    this.validMoves = [];
    this.validTargets = [];
    this.selectedCell = null;
    this.hoveredCell = null;
  }
};
