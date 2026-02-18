// combat.js - Combat logic, initiative, turns, damage

const Combat = {
  // Set up a new battle
  setupBattle(baddieKeys, isTyrant = false) {
    const state = State.get();
    const gearloc = state.gearloc;
    const battle = State.createBattle(baddieKeys, isTyrant);

    // Reset gearloc battle state
    Gearloc.resetBattleState(gearloc);

    // Apply loot equipment effects
    for (const item of gearloc.loot) {
      if (item.type === 'equipment' && item.effect.type === 'startBones') {
        for (let i = 0; i < item.effect.value && gearloc.backupPlan.length < Config.MAX_BACKUP_PLAN; i++) {
          gearloc.backupPlan.push({ type: 'bones', value: 1 });
        }
      }
      if (item.type === 'equipment' && item.effect.type === 'regen') {
        gearloc.tempBonuses.regen = item.effect.value;
      }
      if (item.type === 'equipment' && item.effect.type === 'poisonOnHit') {
        gearloc.tempBonuses.poisonOnHit = { value: item.effect.value, duration: item.effect.duration };
      }
    }

    // Place gearloc (bottom-center)
    gearloc.row = Config.GRID_ROWS - 1;
    gearloc.col = Math.floor(Config.GRID_COLS / 2);
    battle.grid[gearloc.row][gearloc.col] = 'gearloc';

    // Handle tyrant
    if (isTyrant) {
      const tyrantUnit = State.createTyrantUnit(state.tyrantKey);
      tyrantUnit.row = 0;
      tyrantUnit.col = Math.floor(Config.GRID_COLS / 2);
      battle.grid[tyrantUnit.row][tyrantUnit.col] = tyrantUnit.id;
      battle.tyrantUnit = tyrantUnit;

      // Initial spawn baddies for tyrant
      const tyrantConfig = Config.TYRANTS[state.tyrantKey];
      const initialBaddies = [];
      for (const key of tyrantConfig.spawns.slice(0, 2)) {
        const cfg = Config.BADDIES[key];
        if (!cfg) continue;
        initialBaddies.push({
          id: Utils.uid(), key, name: cfg.name,
          hp: cfg.hp, maxHp: cfg.hp, atk: cfg.atk, def: cfg.def,
          init: cfg.init, type: cfg.type, range: cfg.range || 1,
          color: cfg.color, points: cfg.points,
          skills: cfg.skills ? [...cfg.skills] : [],
          statusEffects: [], row: null, col: null, isOnMat: false, stunned: false
        });
      }
      battle.baddies = initialBaddies;
    }

    // Split baddies: up to MAX_ON_MAT on mat, rest in queue
    const onMatCount = Math.min(battle.baddies.length, Config.MAX_ON_MAT - 2); // -2 for gearloc + possible tyrant
    const onMat = battle.baddies.slice(0, onMatCount);
    const inQueue = battle.baddies.slice(onMatCount);

    BaddieAI.placeBaddies(onMat, battle.grid, gearloc);
    battle.baddieQueue = inQueue;

    // Calculate initiative
    this.calcInitiative(battle, gearloc);

    // Apply Picket Shield Wall
    const shieldWall = Gearloc.applyInnate(gearloc, 'battle_start', {});
    if (shieldWall && shieldWall.type === 'shield_wall') {
      battle.shieldWallActive = true;
      battle.shieldWallValue = shieldWall.value;
    }

    // Apply Boomer initial bomb
    Gearloc.applyInnate(gearloc, 'round_start', {});

    battle.phase = 'rolling';
    State.set('battle', battle);
    State.set('phase', isTyrant ? Config.PHASES.TYRANT_BATTLE : Config.PHASES.BATTLE);

    State.log(`Battle begins! Round ${battle.round}`);
    return battle;
  },

  // Calculate initiative order
  calcInitiative(battle, gearloc) {
    const units = [];

    // Gearloc
    units.push({
      id: 'gearloc',
      name: gearloc.name,
      init: gearloc.dex + Utils.randInt(1, 3),
      isGearloc: true,
      color: gearloc.chipColor
    });

    // Baddies on mat
    for (const b of battle.baddies) {
      if (b.hp > 0 && b.isOnMat) {
        units.push({
          id: b.id,
          name: b.name,
          init: b.init + Utils.randInt(0, 2),
          isGearloc: false,
          color: b.color
        });
      }
    }

    // Tyrant
    if (battle.tyrantUnit && battle.tyrantUnit.hp > 0) {
      units.push({
        id: battle.tyrantUnit.id,
        name: battle.tyrantUnit.name,
        init: battle.tyrantUnit.init + Utils.randInt(0, 2),
        isGearloc: false,
        color: battle.tyrantUnit.color,
        isTyrant: true
      });
    }

    // Sort by init (highest first), gearloc wins ties
    units.sort((a, b) => {
      if (b.init !== a.init) return b.init - a.init;
      if (a.isGearloc) return -1;
      if (b.isGearloc) return 1;
      return 0;
    });

    battle.initiative = units;
    battle.currentTurnIndex = 0;
  },

  // Get current turn unit
  getCurrentTurn(battle) {
    if (!battle || !battle.initiative || battle.initiative.length === 0) return null;
    return battle.initiative[battle.currentTurnIndex % battle.initiative.length];
  },

  // Advance to next turn
  nextTurn(battle, gearloc) {
    battle.currentTurnIndex++;

    // Check if round is over
    if (battle.currentTurnIndex >= battle.initiative.length) {
      return this.nextRound(battle, gearloc);
    }

    // Skip dead units
    const current = this.getCurrentTurn(battle);
    if (current && !current.isGearloc) {
      const unit = this.findUnit(battle, current.id);
      if (!unit || unit.hp <= 0) {
        return this.nextTurn(battle, gearloc);
      }
    }

    return current;
  },

  // Start next round
  nextRound(battle, gearloc) {
    battle.round++;
    battle.currentTurnIndex = 0;

    State.log(`--- Round ${battle.round} ---`);

    // Round start effects
    Gearloc.applyInnate(gearloc, 'round_start', {});

    // Regen from equipment
    if (gearloc.tempBonuses.regen) {
      const healed = Math.min(gearloc.tempBonuses.regen, gearloc.maxHp - gearloc.hp);
      if (healed > 0) {
        gearloc.hp += healed;
        State.log(`${gearloc.name} regenerates ${healed} HP!`);
      }
    }

    // Shield wall fades after round 1
    if (battle.round > 1) {
      battle.shieldWallActive = false;
      battle.shieldWallValue = 0;
    }

    // Reduce taunt
    if (gearloc._tauntActive > 0) gearloc._tauntActive--;
    if (gearloc._doubleRage > 0) gearloc._doubleRage--;

    // Tyrant round-start spawns
    if (battle.tyrantUnit && battle.tyrantUnit.hp > 0) {
      const tyrantConfig = Config.TYRANTS[State.get().tyrantKey];
      const spawns = BaddieAI.handleTyrantSpawns(battle.tyrantUnit, battle, tyrantConfig);
      if (spawns.length > 0) {
        battle.baddieQueue.push(...spawns);
      }
      // Tyrant passives
      BaddieAI.getTyrantDamageModifier(battle.tyrantUnit, battle, tyrantConfig);
    }

    // Reinforcements
    const reinforced = BaddieAI.reinforceFromQueue(battle);
    if (reinforced.length > 0) {
      battle.baddies.push(...reinforced);
      State.log(`${reinforced.length} reinforcements arrive!`);
    }

    // Recalculate initiative
    this.calcInitiative(battle, gearloc);

    // Reset turn actions
    battle.turnActions = { moved: false, attacked: false, usedSkill: false };
    battle.phase = 'rolling';

    return this.getCurrentTurn(battle);
  },

  // Find a unit (baddie or tyrant) by id
  findUnit(battle, id) {
    if (id === 'gearloc') return State.get().gearloc;
    if (battle.tyrantUnit && battle.tyrantUnit.id === id) return battle.tyrantUnit;
    return battle.baddies.find(b => b.id === id);
  },

  // Gearloc rolls dice
  rollGearloc(battle, gearloc) {
    const results = Dice.rollGearlocDice(gearloc);
    battle.diceResults = results;
    battle.phase = 'allocating';

    // Apply rage bonus to attack interpretation
    const rageBonus = gearloc.rage || 0;
    const doubleRage = gearloc._doubleRage > 0 ? 2 : 1;
    battle.rageBonus = rageBonus * doubleRage;

    // Collect bones for backup plan
    const bones = Dice.getBones(results);
    for (const bone of bones) {
      if (gearloc.backupPlan.length < Config.MAX_BACKUP_PLAN) {
        gearloc.backupPlan.push(bone);
      }
    }

    State.log(`Rolled: ATK(${results.attack.map(d => d.type === 'sword' ? d.value : 'B').join(',')}) DEF(${results.defense.map(d => d.type === 'shield' ? d.value : 'B').join(',')}) DEX(${results.dexterity.map(d => d.type === 'dex' ? d.value : 'B').join(',')})`);

    return results;
  },

  // Apply gearloc attack to target
  attackTarget(battle, gearloc, targetId) {
    const target = this.findUnit(battle, targetId);
    if (!target || target.hp <= 0) return { success: false, msg: 'Invalid target' };

    // Calculate attack
    const atkDice = battle.diceResults.attack || [];
    const passiveAtk = Gearloc.getPassiveBonus(gearloc, 'atk');
    const tempAtkBonus = gearloc.tempBonuses.atkBonus || 0;
    let atkTotal = Dice.sumAttack(atkDice, passiveAtk + tempAtkBonus + (battle.rageBonus || 0));

    // Innate poison on attack (Patches)
    const poisonResult = Gearloc.applyInnate(gearloc, 'on_attack', { target });
    if (poisonResult && poisonResult.type === 'poison') {
      target.statusEffects.push({ type: 'poison', value: poisonResult.value, duration: poisonResult.duration });
      State.log(`${target.name} is poisoned!`);
    }

    // Poison on hit from equipment
    if (gearloc.tempBonuses.poisonOnHit) {
      const p = gearloc.tempBonuses.poisonOnHit;
      target.statusEffects.push({ type: 'poison', value: p.value, duration: p.duration });
    }

    // Tyrant damage reduction
    let damageMod = 1;
    if (target.isTyrant) {
      const tyrantConfig = Config.TYRANTS[State.get().tyrantKey];
      damageMod = BaddieAI.getTyrantDamageModifier(target, battle, tyrantConfig);
    }

    const damage = Math.max(0, Math.floor((atkTotal - (target.def || 0)) * damageMod));
    target.hp -= damage;

    State.log(`${gearloc.name} attacks ${target.name} for ${damage} damage! (${target.hp}/${target.maxHp} HP)`);
    Audio.hit();

    const result = {
      success: true,
      damage,
      targetId,
      killed: target.hp <= 0,
      msg: `${damage} damage to ${target.name}!`
    };

    // Handle kill
    if (target.hp <= 0) {
      this.handleKill(battle, gearloc, target);
    }

    return result;
  },

  // Handle unit death
  handleKill(battle, gearloc, target) {
    State.log(`${target.name} is defeated!`);
    Audio.death();

    // Remove from grid
    if (target.row !== null && target.col !== null) {
      battle.grid[target.row][target.col] = null;
    }
    target.row = null;
    target.col = null;
    target.isOnMat = false;

    // Gearloc kill bonuses
    gearloc.killCount = (gearloc.killCount || 0) + 1;
    const lifeOnKill = Gearloc.getPassiveBonus(gearloc, 'lifeOnKill');
    if (lifeOnKill > 0) {
      const healed = Math.min(lifeOnKill, gearloc.maxHp - gearloc.hp);
      gearloc.hp += healed;
      if (healed > 0) State.log(`${gearloc.name} heals ${healed} HP from kill!`);
    }

    // Remove from initiative
    battle.initiative = battle.initiative.filter(u => u.id !== target.id);
    if (battle.currentTurnIndex >= battle.initiative.length) {
      battle.currentTurnIndex = 0;
    }
  },

  // Apply defense dice result (reduces incoming damage)
  getDefenseTotal(battle, gearloc) {
    const defDice = battle.diceResults.defense || [];
    let total = Dice.sumDefense(defDice);

    // Shield wall
    if (battle.shieldWallActive) {
      total += battle.shieldWallValue;
    }

    return total;
  },

  // Get movement points from dex dice
  getMovementPoints(battle) {
    const dexDice = battle.diceResults.dexterity || [];
    return Dice.sumDex(dexDice);
  },

  // Move gearloc
  moveGearloc(battle, gearloc, targetRow, targetCol) {
    const dexPoints = this.getMovementPoints(battle);
    const dist = Utils.manhattan(gearloc.row, gearloc.col, targetRow, targetCol);

    if (dist > dexPoints) return { success: false, msg: 'Not enough movement' };
    if (battle.grid[targetRow][targetCol] !== null) return { success: false, msg: 'Space occupied' };

    // Verify path exists
    const path = Utils.bfs(battle.grid, gearloc.row, gearloc.col, targetRow, targetCol);
    if (!path || path.length > dexPoints) return { success: false, msg: 'Cannot reach' };

    battle.grid[gearloc.row][gearloc.col] = null;
    gearloc.row = targetRow;
    gearloc.col = targetCol;
    battle.grid[targetRow][targetCol] = 'gearloc';

    battle.turnActions.moved = true;
    State.log(`${gearloc.name} moves to (${targetRow}, ${targetCol})`);
    return { success: true };
  },

  // Get valid move positions
  getValidMoves(battle, gearloc) {
    const dex = this.getMovementPoints(battle);
    const moves = [];

    for (let r = 0; r < Config.GRID_ROWS; r++) {
      for (let c = 0; c < Config.GRID_COLS; c++) {
        if (battle.grid[r][c] !== null) continue;
        const dist = Utils.manhattan(gearloc.row, gearloc.col, r, c);
        if (dist <= dex && dist > 0) {
          const path = Utils.bfs(battle.grid, gearloc.row, gearloc.col, r, c);
          if (path && path.length <= dex) {
            moves.push([r, c]);
          }
        }
      }
    }

    return moves;
  },

  // Get valid attack targets
  getValidTargets(battle, gearloc) {
    const targets = [];
    const range = 1; // melee by default, skills may extend

    for (const b of battle.baddies) {
      if (b.hp <= 0 || b.row === null) continue;
      const dist = Utils.manhattan(gearloc.row, gearloc.col, b.row, b.col);
      if (dist <= range) {
        targets.push([b.row, b.col]);
      }
    }

    if (battle.tyrantUnit && battle.tyrantUnit.hp > 0 && battle.tyrantUnit.row !== null) {
      const dist = Utils.manhattan(gearloc.row, gearloc.col, battle.tyrantUnit.row, battle.tyrantUnit.col);
      if (dist <= range) {
        targets.push([battle.tyrantUnit.row, battle.tyrantUnit.col]);
      }
    }

    return targets;
  },

  // Process enemy turn
  async processEnemyTurn(battle, gearloc) {
    const current = this.getCurrentTurn(battle);
    if (!current || current.isGearloc) return;

    const unit = this.findUnit(battle, current.id);
    if (!unit || unit.hp <= 0) {
      this.nextTurn(battle, gearloc);
      return;
    }

    let actions;
    if (current.isTyrant) {
      actions = BaddieAI.takeTyrantTurn(unit, battle, gearloc);
    } else {
      actions = BaddieAI.takeTurn(unit, battle, gearloc);
    }

    // Process action results
    for (const action of actions) {
      if (action.type === 'attack' && action.damage > 0) {
        // Apply defense
        const defTotal = this.getDefenseTotal(battle, gearloc);
        const actualDmg = Math.max(0, action.damage - defTotal);
        // The attack function already applied damage, so adjust
        // (damage was already reduced in _attackAsUnit)
      }
      if (action.type === 'death') {
        this.handleKill(battle, gearloc, unit);
      }
    }

    return actions;
  },

  // Check battle end conditions
  checkBattleEnd(battle, gearloc) {
    // Gearloc dead
    if (gearloc.hp <= 0) {
      return { ended: true, victory: false, reason: `${gearloc.name} has fallen!` };
    }

    // All baddies dead
    const aliveBaddies = battle.baddies.filter(b => b.hp > 0);
    const tyrantAlive = battle.tyrantUnit && battle.tyrantUnit.hp > 0;

    if (aliveBaddies.length === 0 && battle.baddieQueue.length === 0 && !tyrantAlive) {
      return { ended: true, victory: true, reason: 'All enemies defeated!' };
    }

    // Tyrant dead (in tyrant battle)
    if (battle.isTyrant && battle.tyrantUnit && battle.tyrantUnit.hp <= 0) {
      return { ended: true, victory: true, reason: `${battle.tyrantUnit.name} has been vanquished!` };
    }

    return { ended: false };
  },

  // End battle, distribute rewards
  endBattle(battle, gearloc, victory) {
    if (victory) {
      // Training point for winning
      State.update(s => { s.training.points += 1; });
      State.log('Victory! Gained 1 Training Point.');

      // Progress from encounter
      const encounter = State.get().encounter;
      if (encounter && encounter.result && encounter.result.progress) {
        State.update(s => { s.progressPoints += encounter.result.progress; });
        State.log(`Gained ${encounter.result.progress} Progress Points!`);
      }

      // Bonus reward from encounter
      if (encounter && encounter.result && encounter.result.bonusReward) {
        const reward = encounter.result.bonusReward;
        if (reward.type === 'loot') {
          const items = [];
          const lootDeck = Utils.shuffle([...Config.LOOT]);
          for (let i = 0; i < reward.value; i++) {
            if (lootDeck.length > 0) items.push(lootDeck.shift());
          }
          for (const item of items) gearloc.loot.push(item);
          if (items.length > 0) State.log(`Found loot: ${items.map(l => l.name).join(', ')}`);
        }
        if (reward.type === 'training') {
          State.update(s => { s.training.points += reward.value; });
          State.log(`Bonus: ${reward.value} Training Points!`);
        }
        if (reward.type === 'heal') {
          const healed = Math.min(reward.value, gearloc.maxHp - gearloc.hp);
          gearloc.hp += healed;
          State.log(`Bonus: Healed ${healed} HP!`);
        }
      }
    }

    // Clean up
    gearloc.row = null;
    gearloc.col = null;
    gearloc.tempBonuses = {};
    State.set('battle', null);
  }
};
