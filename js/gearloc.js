// gearloc.js - Gearloc class, skills, abilities

const Gearloc = {
  // Apply gearloc's innate ability at appropriate timing
  applyInnate(gearloc, trigger, context) {
    const key = gearloc.key;
    switch (key) {
      case 'patches':
        return this._patchesInnate(gearloc, trigger, context);
      case 'boomer':
        return this._boomerInnate(gearloc, trigger, context);
      case 'picket':
        return this._picketInnate(gearloc, trigger, context);
      case 'tantrum':
        return this._tantrumInnate(gearloc, trigger, context);
    }
    return null;
  },

  _patchesInnate(gearloc, trigger, ctx) {
    // Toxic Coating: once per round, add poison to one attack
    if (trigger === 'on_attack' && !gearloc._usedToxicThisRound) {
      gearloc._usedToxicThisRound = true;
      return { type: 'poison', value: 1, duration: 2 };
    }
    if (trigger === 'round_start') {
      gearloc._usedToxicThisRound = false;
    }
    return null;
  },

  _boomerInnate(gearloc, trigger, ctx) {
    // Bomb Craft: gain 1 bomb at round start
    if (trigger === 'round_start') {
      gearloc.bombs = (gearloc.bombs || 0) + 1;
      State.log(`${gearloc.name} crafts a bomb! (${gearloc.bombs} bombs)`);
      return { type: 'bomb_gained' };
    }
    return null;
  },

  _picketInnate(gearloc, trigger, ctx) {
    // Shield Wall: roll all DEF dice at battle start
    if (trigger === 'battle_start') {
      const defDice = Dice.rollMultiple(Config.DICE.DEFENSE, gearloc.def + (gearloc.tempBonuses.def || 0));
      let shieldTotal = 0;
      for (const d of defDice) {
        if (d.type === 'shield') shieldTotal += d.value;
      }
      // Check for Fortress Wall skill
      const fortressWall = gearloc.unlockedSkills.find(s => s.id === 'fortresswall');
      if (fortressWall) {
        shieldTotal += defDice.length * fortressWall.effect.value;
      }
      State.log(`${gearloc.name} raises Shield Wall! (${shieldTotal} shields)`);
      return { type: 'shield_wall', value: shieldTotal };
    }
    // Taunt: baddies must attack Picket if adjacent
    if (trigger === 'baddie_target') {
      return { type: 'taunt_passive' };
    }
    return null;
  },

  _tantrumInnate(gearloc, trigger, ctx) {
    // Rage: gain 1 rage when taking damage
    if (trigger === 'on_damaged') {
      gearloc.rage = (gearloc.rage || 0) + 1;
      State.log(`${gearloc.name}'s Rage increases to ${gearloc.rage}!`);
      return { type: 'rage_gained', value: gearloc.rage };
    }
    return null;
  },

  // Use a skill
  useSkill(gearloc, skillId, target, battle) {
    const skill = gearloc.unlockedSkills.find(s => s.id === skillId);
    if (!skill) return { success: false, msg: 'Skill not found' };

    const effect = skill.effect;
    let result = { success: true, msg: '', effects: [] };

    switch (effect.type) {
      case 'heal': {
        const healed = Math.min(effect.value, gearloc.maxHp - gearloc.hp);
        gearloc.hp += healed;
        result.msg = `${gearloc.name} heals for ${healed} HP!`;
        result.effects.push({ type: 'heal', value: healed, target: 'self' });
        Audio.heal();
        break;
      }
      case 'poison': {
        if (!target) return { success: false, msg: 'Select a target' };
        target.statusEffects.push({ type: 'poison', value: effect.value, duration: effect.duration });
        result.msg = `${target.name} is poisoned! (${effect.value} dmg for ${effect.duration} turns)`;
        result.effects.push({ type: 'poison', target: target.id });
        Audio.poison();
        break;
      }
      case 'cleanse': {
        gearloc.statusEffects = [];
        result.msg = `${gearloc.name} cleanses all status effects!`;
        break;
      }
      case 'poisonAll': {
        const targets = battle.baddies.filter(b => b.hp > 0 && b.row !== null);
        for (const b of targets) {
          b.statusEffects.push({ type: 'poison', value: effect.value, duration: effect.duration });
        }
        if (battle.tyrantUnit && battle.tyrantUnit.hp > 0) {
          battle.tyrantUnit.statusEffects.push({ type: 'poison', value: effect.value, duration: effect.duration });
        }
        result.msg = `All baddies are poisoned!`;
        Audio.poison();
        break;
      }
      case 'selfDmgDeal': {
        if (!target) return { success: false, msg: 'Select a target' };
        gearloc.hp -= effect.selfDmg;
        const dmg = Math.max(0, effect.dmg - (target.def || 0));
        target.hp -= dmg;
        result.msg = `${gearloc.name} spends ${effect.selfDmg} HP to deal ${dmg} damage to ${target.name}!`;
        result.effects.push({ type: 'damage', value: dmg, target: target.id });
        Audio.hit();
        break;
      }
      case 'damage': {
        if (!target) return { success: false, msg: 'Select a target' };
        const dmg = Math.max(0, effect.value - (target.def || 0));
        target.hp -= dmg;
        result.msg = `${gearloc.name} deals ${dmg} damage to ${target.name}!`;
        result.effects.push({ type: 'damage', value: dmg, target: target.id });
        Audio.hit();
        break;
      }
      case 'damageAll': {
        const targets = battle.baddies.filter(b => b.hp > 0 && b.row !== null);
        for (const b of targets) {
          const dmg = Math.max(0, effect.value - (b.def || 0));
          b.hp -= dmg;
          result.effects.push({ type: 'damage', value: dmg, target: b.id });
        }
        if (battle.tyrantUnit && battle.tyrantUnit.hp > 0) {
          const dmg = Math.max(0, effect.value - battle.tyrantUnit.def);
          battle.tyrantUnit.hp -= dmg;
          result.effects.push({ type: 'damage', value: dmg, target: battle.tyrantUnit.id });
        }
        result.msg = `${skill.name} hits all enemies!`;
        Audio.bombExplode();
        break;
      }
      case 'aoe': {
        if (!target) return { success: false, msg: 'Select a target' };
        // Hit target and adjacent
        const hit = [target];
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        for (const [dr, dc] of dirs) {
          const nr = target.row + dr;
          const nc = target.col + dc;
          const adj = battle.baddies.find(b => b.hp > 0 && b.row === nr && b.col === nc);
          if (adj) hit.push(adj);
          if (battle.tyrantUnit && battle.tyrantUnit.hp > 0 && battle.tyrantUnit.row === nr && battle.tyrantUnit.col === nc) {
            hit.push(battle.tyrantUnit);
          }
        }
        for (const b of hit) {
          const dmg = Math.max(0, effect.value - (b.def || 0));
          b.hp -= dmg;
          result.effects.push({ type: 'damage', value: dmg, target: b.id });
        }
        result.msg = `${skill.name} hits ${hit.length} enemies!`;
        Audio.bombExplode();
        break;
      }
      case 'stun': {
        if (!target) return { success: false, msg: 'Select a target' };
        target.stunned = true;
        target.statusEffects.push({ type: 'stun', duration: effect.duration });
        result.msg = `${target.name} is stunned!`;
        Audio.skillUse();
        break;
      }
      case 'aoeStun': {
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        let count = 0;
        for (const [dr, dc] of dirs) {
          const nr = gearloc.row + dr;
          const nc = gearloc.col + dc;
          const adj = battle.baddies.find(b => b.hp > 0 && b.row === nr && b.col === nc);
          if (adj) {
            adj.stunned = true;
            adj.statusEffects.push({ type: 'stun', duration: effect.duration });
            count++;
          }
        }
        result.msg = `${skill.name} stuns ${count} adjacent enemies!`;
        Audio.skillUse();
        break;
      }
      case 'tempDef': {
        gearloc.tempBonuses.def = (gearloc.tempBonuses.def || 0) + effect.value;
        result.msg = `${gearloc.name} gains +${effect.value} DEF!`;
        Audio.skillUse();
        break;
      }
      case 'shieldBash': {
        if (!target) return { success: false, msg: 'Select a target' };
        const shieldVal = battle.shieldWallValue || gearloc.def;
        const dmg = Math.max(0, shieldVal - (target.def || 0));
        target.hp -= dmg;
        result.msg = `Shield Bash deals ${dmg} damage!`;
        result.effects.push({ type: 'damage', value: dmg, target: target.id });
        Audio.hit();
        break;
      }
      case 'taunt': {
        gearloc._tauntActive = effect.duration;
        result.msg = `${gearloc.name} taunts all enemies!`;
        Audio.skillUse();
        break;
      }
      case 'statBoost': {
        gearloc[effect.stat] += effect.value;
        if (effect.stat === 'hp' || effect.stat === 'maxHp') {
          gearloc.maxHp += effect.value;
          gearloc.hp += effect.value;
        }
        result.msg = `${gearloc.name} gains +${effect.value} ${effect.stat.toUpperCase()}!`;
        Audio.skillUse();
        break;
      }
      case 'invuln': {
        gearloc._invulnerable = effect.duration;
        result.msg = `${gearloc.name} becomes invulnerable!`;
        Audio.skillUse();
        break;
      }
      case 'reckless': {
        if (!target) return { success: false, msg: 'Select a target' };
        gearloc.hp -= effect.selfDmg;
        const atkVal = gearloc.atk + (gearloc.rage || 0) + effect.bonusDmg;
        const dmg = Math.max(0, atkVal - (target.def || 0));
        target.hp -= dmg;
        result.msg = `Reckless Strike! ${dmg} damage to ${target.name} (took ${effect.selfDmg} self-damage)`;
        result.effects.push({ type: 'damage', value: dmg, target: target.id });
        Audio.criticalHit();
        break;
      }
      case 'charge': {
        if (!target) return { success: false, msg: 'Select a target' };
        // Move adjacent to target
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        for (const [dr, dc] of dirs) {
          const nr = target.row + dr;
          const nc = target.col + dc;
          if (nr >= 0 && nr < Config.GRID_ROWS && nc >= 0 && nc < Config.GRID_COLS) {
            if (!battle.grid[nr][nc] || (nr === gearloc.row && nc === gearloc.col)) {
              if (gearloc.row !== null) battle.grid[gearloc.row][gearloc.col] = null;
              gearloc.row = nr;
              gearloc.col = nc;
              battle.grid[nr][nc] = 'gearloc';
              break;
            }
          }
        }
        const dmg = Math.max(0, effect.dmg - (target.def || 0));
        target.hp -= dmg;
        result.msg = `${gearloc.name} charges! ${dmg} damage to ${target.name}!`;
        result.effects.push({ type: 'damage', value: dmg, target: target.id });
        Audio.hit();
        break;
      }
      case 'doubleRage': {
        gearloc._doubleRage = effect.duration;
        result.msg = `${gearloc.name}'s rage doubles!`;
        Audio.skillUse();
        break;
      }
      case 'gainRage': {
        gearloc.rage = (gearloc.rage || 0) + effect.value;
        result.msg = `${gearloc.name} gains ${effect.value} Rage! (Total: ${gearloc.rage})`;
        Audio.skillUse();
        break;
      }
      case 'attackAll': {
        const atkVal = gearloc.atk + (gearloc.rage || 0);
        const targets = battle.baddies.filter(b => b.hp > 0 && b.row !== null);
        for (const b of targets) {
          const dmg = Math.max(0, atkVal - (b.def || 0));
          b.hp -= dmg;
          result.effects.push({ type: 'damage', value: dmg, target: b.id });
        }
        if (battle.tyrantUnit && battle.tyrantUnit.hp > 0) {
          const dmg = Math.max(0, atkVal - battle.tyrantUnit.def);
          battle.tyrantUnit.hp -= dmg;
        }
        result.msg = `${gearloc.name} attacks ALL enemies!`;
        Audio.criticalHit();
        break;
      }
      case 'damageBurn': {
        if (!target) return { success: false, msg: 'Select a target' };
        const dmg = Math.max(0, effect.dmg - (target.def || 0));
        target.hp -= dmg;
        target.statusEffects.push({ type: 'burn', value: effect.burnDmg, duration: effect.duration });
        result.msg = `${target.name} takes ${dmg} damage and is burning!`;
        result.effects.push({ type: 'damage', value: dmg, target: target.id });
        Audio.bombExplode();
        break;
      }
      case 'aoePush': {
        const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
        let count = 0;
        for (const [dr, dc] of dirs) {
          const nr = gearloc.row + dr;
          const nc = gearloc.col + dc;
          const adj = battle.baddies.find(b => b.hp > 0 && b.row === nr && b.col === nc);
          if (adj) {
            const dmg = Math.max(0, effect.dmg - (adj.def || 0));
            adj.hp -= dmg;
            // Push
            const pr = nr + dr;
            const pc = nc + dc;
            if (pr >= 0 && pr < Config.GRID_ROWS && pc >= 0 && pc < Config.GRID_COLS && !battle.grid[pr][pc]) {
              battle.grid[nr][nc] = null;
              adj.row = pr;
              adj.col = pc;
              battle.grid[pr][pc] = adj.id;
            }
            count++;
            result.effects.push({ type: 'damage', value: dmg, target: adj.id });
          }
        }
        result.msg = `Juggernaut hits ${count} adjacent enemies!`;
        Audio.criticalHit();
        break;
      }
      case 'block': {
        // Move to any empty space, mark as blocking
        gearloc._blocking = true;
        result.msg = `${gearloc.name} blocks movement!`;
        Audio.skillUse();
        break;
      }
      default:
        result.msg = `${gearloc.name} uses ${skill.name}!`;
        Audio.skillUse();
    }

    State.log(result.msg);
    return result;
  },

  // Use a bomb (Boomer)
  useBomb(gearloc, target, battle) {
    if (gearloc.bombs <= 0) return { success: false, msg: 'No bombs available' };
    gearloc.bombs--;

    const chainReaction = gearloc.unlockedSkills.find(s => s.id === 'chainreaction');
    const bonus = chainReaction ? chainReaction.effect.value : 0;
    const dmg = Math.max(0, 2 + bonus - (target.def || 0));
    target.hp -= dmg;

    State.log(`${gearloc.name} throws a bomb at ${target.name} for ${dmg} damage!`);
    Audio.bombExplode();
    return { success: true, msg: `Bomb deals ${dmg} damage!`, effects: [{ type: 'damage', value: dmg, target: target.id }] };
  },

  // Activate backup plan
  activateBackupPlan(gearloc, battle) {
    if (gearloc.backupPlan.length < Config.MAX_BACKUP_PLAN) {
      return { success: false, msg: 'Backup Plan not full' };
    }

    gearloc.backupPlan = [];
    const effect = gearloc.backupPlanEffect;
    let msg = '';

    switch (effect.type) {
      case 'heal':
        const healed = Math.min(effect.value, gearloc.maxHp - gearloc.hp);
        gearloc.hp += healed;
        msg = `Backup Plan: Heal ${healed} HP!`;
        Audio.heal();
        break;
      case 'bomb':
        gearloc.bombs += effect.value;
        msg = `Backup Plan: Gained ${effect.value} bomb!`;
        Audio.skillUse();
        break;
      case 'shieldBash':
        msg = `Backup Plan: Shield Bash ready! Select target.`;
        Audio.skillUse();
        return { success: true, msg, needsTarget: true, effect: 'shieldBash' };
      case 'rage':
        gearloc.rage = (gearloc.rage || 0) + effect.value;
        msg = `Backup Plan: Gained ${effect.value} Rage!`;
        Audio.skillUse();
        break;
    }

    State.log(msg);
    return { success: true, msg };
  },

  // Apply status effects at turn start
  processStatusEffects(unit) {
    const remaining = [];
    for (const effect of unit.statusEffects) {
      if (effect.type === 'poison') {
        unit.hp -= effect.value;
        State.log(`${unit.name} takes ${effect.value} poison damage!`);
      } else if (effect.type === 'burn') {
        unit.hp -= effect.value;
        State.log(`${unit.name} takes ${effect.value} burn damage!`);
      }

      effect.duration--;
      if (effect.duration > 0) {
        remaining.push(effect);
      } else {
        if (effect.type === 'stun') {
          unit.stunned = false;
        }
        State.log(`${effect.type} wears off from ${unit.name}`);
      }
    }
    unit.statusEffects = remaining;
  },

  // Check passives
  getPassiveBonus(gearloc, type) {
    let bonus = 0;
    for (const skill of gearloc.unlockedSkills) {
      if (skill.type !== 'passive') continue;
      const eff = skill.effect;
      switch (type) {
        case 'atk':
          if (eff.type === 'atkBonus') bonus += eff.value;
          if (eff.type === 'killStacks') bonus += gearloc.killCount || 0;
          break;
        case 'thorns':
          if (eff.type === 'thorns') bonus += eff.value;
          break;
        case 'lifeOnKill':
          if (eff.type === 'lifeOnKill') bonus += eff.value;
          break;
      }
    }
    return bonus;
  },

  // Reset per-battle state
  resetBattleState(gearloc) {
    gearloc.rage = 0;
    gearloc.killCount = 0;
    gearloc.statusEffects = [];
    gearloc.tempBonuses = {};
    gearloc._usedToxicThisRound = false;
    gearloc._tauntActive = 0;
    gearloc._invulnerable = 0;
    gearloc._doubleRage = 0;
    gearloc._blocking = false;
  }
};
