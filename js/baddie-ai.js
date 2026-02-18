// baddie-ai.js - Baddie movement, targeting, behavior

const BaddieAI = {
  // Process a baddie's turn
  takeTurn(baddie, battle, gearloc) {
    if (baddie.hp <= 0 || baddie.stunned) {
      if (baddie.stunned) {
        State.log(`${baddie.name} is stunned and skips turn!`);
      }
      return [];
    }

    // Process status effects
    Gearloc.processStatusEffects(baddie);
    if (baddie.hp <= 0) {
      State.log(`${baddie.name} dies from status effects!`);
      return [{ type: 'death', target: baddie.id }];
    }

    const actions = [];

    // Use special skills if applicable
    const skillAction = this._useSkill(baddie, battle, gearloc);
    if (skillAction) actions.push(skillAction);

    // Try to move toward gearloc
    const moved = this._move(baddie, battle, gearloc);
    if (moved) actions.push(moved);

    // Try to attack
    const attack = this._attack(baddie, battle, gearloc);
    if (attack) actions.push(attack);

    return actions;
  },

  // Process tyrant turn
  takeTyrantTurn(tyrant, battle, gearloc) {
    if (tyrant.hp <= 0 || tyrant.stunned) return [];

    Gearloc.processStatusEffects(tyrant);
    if (tyrant.hp <= 0) return [{ type: 'death', target: tyrant.id }];

    const actions = [];

    // Use abilities
    for (const ability of tyrant.abilities) {
      if (ability.trigger === 'active') {
        const result = this._useTyrantAbility(tyrant, ability, battle, gearloc);
        if (result) actions.push(result);
      }
    }

    // Move and attack
    const moved = this._moveTyrant(tyrant, battle, gearloc);
    if (moved) actions.push(moved);

    const attack = this._attackAsUnit(tyrant, battle, gearloc);
    if (attack) actions.push(attack);

    return actions;
  },

  _move(baddie, battle, gearloc) {
    if (!gearloc || gearloc.row === null) return null;

    const dist = Utils.manhattan(baddie.row, baddie.col, gearloc.row, gearloc.col);

    // If ranged and in range, don't move
    if (baddie.type === 'ranged' && dist <= (baddie.range || 2)) {
      return null;
    }

    // If adjacent, don't move
    if (dist <= 1) return null;

    // BFS to find path
    const path = Utils.bfs(battle.grid, baddie.row, baddie.col, gearloc.row, gearloc.col);
    if (!path || path.length === 0) return null;

    // Move up to 2 steps
    const steps = Math.min(2, path.length);
    const targetStep = path[steps - 1];

    // Check that target is empty (not the gearloc position)
    if (battle.grid[targetStep[0]][targetStep[1]] !== null) {
      // Try one step less
      if (steps > 1 && battle.grid[path[0][0]][path[0][1]] === null) {
        battle.grid[baddie.row][baddie.col] = null;
        baddie.row = path[0][0];
        baddie.col = path[0][1];
        battle.grid[baddie.row][baddie.col] = baddie.id;
        return { type: 'move', unit: baddie.id, to: [baddie.row, baddie.col] };
      }
      return null;
    }

    battle.grid[baddie.row][baddie.col] = null;
    baddie.row = targetStep[0];
    baddie.col = targetStep[1];
    battle.grid[baddie.row][baddie.col] = baddie.id;

    return { type: 'move', unit: baddie.id, to: [baddie.row, baddie.col] };
  },

  _moveTyrant(tyrant, battle, gearloc) {
    if (!gearloc || gearloc.row === null) return null;
    const dist = Utils.manhattan(tyrant.row, tyrant.col, gearloc.row, gearloc.col);
    if (dist <= 1) return null;

    const path = Utils.bfs(battle.grid, tyrant.row, tyrant.col, gearloc.row, gearloc.col);
    if (!path || path.length === 0) return null;

    const step = path[0];
    if (battle.grid[step[0]][step[1]] !== null) return null;

    battle.grid[tyrant.row][tyrant.col] = null;
    tyrant.row = step[0];
    tyrant.col = step[1];
    battle.grid[tyrant.row][tyrant.col] = tyrant.id;

    return { type: 'move', unit: tyrant.id, to: [tyrant.row, tyrant.col] };
  },

  _attack(baddie, battle, gearloc) {
    if (!gearloc || gearloc.row === null) return null;

    const dist = Utils.manhattan(baddie.row, baddie.col, gearloc.row, gearloc.col);
    const range = baddie.type === 'ranged' ? (baddie.range || 2) : 1;

    if (dist > range) return null;

    return this._attackAsUnit(baddie, battle, gearloc);
  },

  _attackAsUnit(unit, battle, gearloc) {
    if (!gearloc || gearloc.row === null) return null;

    const dist = Utils.manhattan(unit.row, unit.col, gearloc.row, gearloc.col);
    const range = unit.type === 'ranged' ? (unit.range || 2) : 1;
    if (dist > range) return null;

    let atkValue = unit.atk;

    // Check backstab
    const backstab = (unit.skills || []).find(s => s.type === 'backstab');
    if (backstab) atkValue += backstab.value;

    // Check invulnerability
    if (gearloc._invulnerable > 0) {
      gearloc._invulnerable--;
      State.log(`${unit.name} attacks ${gearloc.name} but the attack is nullified!`);
      return { type: 'attack', unit: unit.id, damage: 0, blocked: true };
    }

    // Apply defense from dice (already applied in combat phase)
    let damage = Math.max(0, atkValue);

    // Thorns
    const thorns = Gearloc.getPassiveBonus(gearloc, 'thorns');
    if (thorns > 0 && dist <= 1) {
      unit.hp -= thorns;
      State.log(`${unit.name} takes ${thorns} thorns damage!`);
    }

    // Tantrum rage on damage
    if (damage > 0) {
      Gearloc.applyInnate(gearloc, 'on_damaged', { damage });
    }

    gearloc.hp -= damage;
    State.log(`${unit.name} attacks ${gearloc.name} for ${damage} damage!`);

    if (gearloc.hp <= 0) {
      State.log(`${gearloc.name} has been defeated!`);
    }

    Audio.hit();
    return { type: 'attack', unit: unit.id, damage, target: 'gearloc' };
  },

  _useSkill(baddie, battle, gearloc) {
    if (!baddie.skills || baddie.skills.length === 0) return null;

    for (const skill of baddie.skills) {
      if (skill.type === 'heal') {
        // Heal lowest HP ally
        const allies = battle.baddies.filter(b => b.hp > 0 && b.hp < b.maxHp && b.id !== baddie.id && b.row !== null);
        if (allies.length > 0) {
          allies.sort((a, b) => a.hp - b.hp);
          const target = allies[0];
          const healed = Math.min(skill.value, target.maxHp - target.hp);
          target.hp += healed;
          State.log(`${baddie.name} heals ${target.name} for ${healed}!`);
          return { type: 'heal', unit: baddie.id, target: target.id, value: healed };
        }
      }
      if (skill.type === 'poison' && gearloc) {
        const dist = Utils.manhattan(baddie.row, baddie.col, gearloc.row, gearloc.col);
        if (dist <= 1) {
          const hasPoison = gearloc.statusEffects.find(e => e.type === 'poison');
          if (!hasPoison) {
            gearloc.statusEffects.push({ type: 'poison', value: skill.value, duration: skill.duration || 2 });
            State.log(`${baddie.name}'s toxic touch poisons ${gearloc.name}!`);
            return { type: 'poison', unit: baddie.id, target: 'gearloc' };
          }
        }
      }
    }
    return null;
  },

  _useTyrantAbility(tyrant, ability, battle, gearloc) {
    const eff = ability.effect;
    switch (eff.type) {
      case 'devour': {
        if (!gearloc || gearloc.row === null) return null;
        const dist = Utils.manhattan(tyrant.row, tyrant.col, gearloc.row, gearloc.col);
        if (dist > 1) return null;
        const dmg = eff.dmg;
        gearloc.hp -= dmg;
        const healed = Math.min(dmg, tyrant.maxHp - tyrant.hp);
        tyrant.hp += healed;
        State.log(`${tyrant.name} devours ${gearloc.name} for ${dmg} damage and heals ${healed}!`);
        Audio.criticalHit();
        if (dmg > 0) Gearloc.applyInnate(gearloc, 'on_damaged', { damage: dmg });
        return { type: 'devour', damage: dmg, healed };
      }
      case 'damageAll': {
        const dmg = eff.value;
        if (gearloc && gearloc.hp > 0) {
          gearloc.hp -= dmg;
          if (dmg > 0) Gearloc.applyInnate(gearloc, 'on_damaged', { damage: dmg });
        }
        State.log(`${tyrant.name} uses ${ability.name}! All units take ${dmg} damage!`);
        Audio.criticalHit();
        return { type: 'aoe_damage', damage: dmg };
      }
      case 'spawn': {
        // Handled in round start
        return null;
      }
    }
    return null;
  },

  // Spawn baddies from tyrant
  handleTyrantSpawns(tyrant, battle, tyrantConfig) {
    const spawns = [];
    for (const ability of tyrant.abilities) {
      if (ability.trigger === 'round_start' && ability.effect.type === 'spawn') {
        for (let i = 0; i < ability.effect.points; i++) {
          const key = Utils.pick(tyrantConfig.spawns);
          const cfg = Config.BADDIES[key];
          if (!cfg) continue;
          const baddie = {
            id: Utils.uid(),
            key,
            name: cfg.name,
            hp: cfg.hp,
            maxHp: cfg.hp,
            atk: cfg.atk,
            def: cfg.def,
            init: cfg.init,
            type: cfg.type,
            range: cfg.range || 1,
            color: cfg.color,
            points: cfg.points,
            skills: cfg.skills ? [...cfg.skills] : [],
            statusEffects: [],
            row: null,
            col: null,
            isOnMat: false,
            stunned: false
          };
          spawns.push(baddie);
        }
      }
    }
    return spawns;
  },

  // Check tyrant passive (e.g., Royal Guard damage reduction)
  getTyrantDamageModifier(tyrant, battle, tyrantConfig) {
    for (const ability of tyrantConfig.abilities) {
      if (ability.trigger === 'passive' && ability.effect.type === 'damageReduction') {
        if (ability.effect.condition === 'minionsAlive') {
          const aliveMinions = battle.baddies.filter(b => b.hp > 0 && b.row !== null);
          if (aliveMinions.length > 0) return ability.effect.factor;
        }
      }
      if (ability.trigger === 'passive' && ability.effect.type === 'regenDef') {
        tyrant.def = Math.min(tyrant.def + ability.effect.value, tyrantConfig.def + 2);
      }
    }
    return 1;
  },

  // Place baddies on the mat
  placeBaddies(baddies, grid, gearloc) {
    // Place baddies in the top rows, away from gearloc
    const positions = [];
    for (let r = 0; r < Config.GRID_ROWS; r++) {
      for (let c = 0; c < Config.GRID_COLS; c++) {
        if (grid[r][c] === null) {
          positions.push([r, c]);
        }
      }
    }

    // Sort by distance from gearloc (farthest first for baddies)
    if (gearloc && gearloc.row !== null) {
      positions.sort((a, b) => {
        const da = Utils.manhattan(a[0], a[1], gearloc.row, gearloc.col);
        const db = Utils.manhattan(b[0], b[1], gearloc.row, gearloc.col);
        return db - da;
      });
    }

    const placed = [];
    for (const baddie of baddies) {
      if (positions.length === 0) break;
      const [r, c] = positions.shift();
      baddie.row = r;
      baddie.col = c;
      baddie.isOnMat = true;
      grid[r][c] = baddie.id;
      placed.push(baddie);
    }

    return placed;
  },

  // Reinforce from queue
  reinforceFromQueue(battle) {
    const onMat = battle.baddies.filter(b => b.hp > 0 && b.isOnMat).length;
    const tyrantOn = battle.tyrantUnit && battle.tyrantUnit.hp > 0 ? 1 : 0;
    const slotsAvailable = Config.MAX_ON_MAT - onMat - tyrantOn - 1; // -1 for gearloc

    if (slotsAvailable <= 0 || battle.baddieQueue.length === 0) return [];

    const toPlace = battle.baddieQueue.splice(0, slotsAvailable);
    return this.placeBaddies(toPlace, battle.grid, State.get().gearloc);
  }
};
