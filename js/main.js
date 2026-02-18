// main.js - Entry point, game loop, state machine

const Game = {
  _animFrame: null,
  _actionMode: null, // 'move', 'attack', 'skill', 'bomb', 'loot'
  _pendingSkill: null,
  _pendingLoot: null,
  _initialized: false,

  init() {
    State.init();
    Audio.init();
    UI.init();

    if (!this._initialized) {
      this._setupCanvasEvents();
      this._initialized = true;
    }

    // Kick off game loop
    this._startLoop();

    // Show title
    this.showTitle();
  },

  _startLoop() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    const loop = () => {
      const state = State.get();
      if (state.battle && (state.phase === Config.PHASES.BATTLE || state.phase === Config.PHASES.TYRANT_BATTLE)) {
        Renderer.render(state.battle, state.gearloc);
      }
      this._animFrame = requestAnimationFrame(loop);
    };
    loop();
  },

  _setupCanvasEvents() {
    document.addEventListener('click', (e) => {
      const canvas = document.getElementById('battle-canvas');
      if (!canvas || e.target !== canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cell = Renderer.getCellFromPixel(x, y);
      if (!cell) return;

      this._handleCanvasClick(cell);
    });

    document.addEventListener('mousemove', (e) => {
      const canvas = document.getElementById('battle-canvas');
      if (!canvas || e.target !== canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      Renderer.hoveredCell = Renderer.getCellFromPixel(x, y);
    });

    // Resume audio on first click
    document.addEventListener('click', () => Audio.resume(), { once: true });
  },

  _handleCanvasClick(cell) {
    const state = State.get();
    const battle = state.battle;
    const gearloc = state.gearloc;
    if (!battle || !gearloc) return;

    const current = Combat.getCurrentTurn(battle);
    if (!current || !current.isGearloc) return;

    if (this._actionMode === 'move') {
      const result = Combat.moveGearloc(battle, gearloc, cell.row, cell.col);
      if (result.success) {
        Renderer.clearOverlays();
        this._actionMode = null;
        battle.phase = 'acting';
        UI.updateBattle(battle, gearloc);
      }
    } else if (this._actionMode === 'attack') {
      // Find target at cell
      const target = this._findTargetAt(battle, cell.row, cell.col);
      if (target) {
        const result = Combat.attackTarget(battle, gearloc, target.id);
        if (result.success) {
          Renderer.clearOverlays();
          this._actionMode = null;
          // Animation
          Renderer.addAnimation({ type: 'damage', row: cell.row, col: cell.col, value: result.damage, duration: 800 });
          Renderer.addAnimation({ type: 'flash', row: cell.row, col: cell.col, duration: 200 });
          UI.screenShake();

          // Check battle end
          const endCheck = Combat.checkBattleEnd(battle, gearloc);
          if (endCheck.ended) {
            this._endBattle(endCheck.victory, endCheck.reason);
            return;
          }

          battle.turnActions.attacked = true;
          UI.updateBattle(battle, gearloc);
        }
      } else {
        // Clicked on empty/gearloc cell, select it
        Renderer.selectedCell = cell;
      }
    } else if (this._actionMode === 'skill' && this._pendingSkill) {
      const target = this._findTargetAt(battle, cell.row, cell.col);
      if (target) {
        const result = Gearloc.useSkill(gearloc, this._pendingSkill, target, battle);
        if (result.success) {
          Renderer.clearOverlays();
          this._actionMode = null;
          this._pendingSkill = null;

          // Animations for effects
          for (const eff of result.effects) {
            if (eff.type === 'damage') {
              const t = Combat.findUnit(battle, eff.target);
              if (t && t.row !== null) {
                Renderer.addAnimation({ type: 'damage', row: t.row, col: t.col, value: eff.value, duration: 800 });
              }
            }
          }

          const endCheck = Combat.checkBattleEnd(battle, gearloc);
          if (endCheck.ended) {
            this._endBattle(endCheck.victory, endCheck.reason);
            return;
          }

          battle.turnActions.usedSkill = true;
          UI.updateBattle(battle, gearloc);
        }
      }
    } else if (this._actionMode === 'bomb') {
      const target = this._findTargetAt(battle, cell.row, cell.col);
      if (target) {
        const result = Gearloc.useBomb(gearloc, target, battle);
        if (result.success) {
          Renderer.clearOverlays();
          this._actionMode = null;
          Renderer.addAnimation({ type: 'damage', row: cell.row, col: cell.col, value: result.effects[0].value, duration: 800 });
          UI.screenShake();

          const endCheck = Combat.checkBattleEnd(battle, gearloc);
          if (endCheck.ended) {
            this._endBattle(endCheck.victory, endCheck.reason);
            return;
          }
          UI.updateBattle(battle, gearloc);
        }
      }
    } else if (this._actionMode === 'loot' && this._pendingLoot !== null) {
      const target = this._findTargetAt(battle, cell.row, cell.col);
      if (target) {
        const item = gearloc.loot[this._pendingLoot];
        if (item && item.effect.type === 'damage') {
          const dmg = Math.max(0, item.effect.value - (target.def || 0));
          target.hp -= dmg;
          State.log(`${item.name} deals ${dmg} to ${target.name}!`);
          gearloc.loot.splice(this._pendingLoot, 1);
          Renderer.addAnimation({ type: 'damage', row: cell.row, col: cell.col, value: dmg, duration: 800 });
        }
        Renderer.clearOverlays();
        this._actionMode = null;
        this._pendingLoot = null;

        const endCheck = Combat.checkBattleEnd(battle, gearloc);
        if (endCheck.ended) {
          this._endBattle(endCheck.victory, endCheck.reason);
          return;
        }
        UI.updateBattle(battle, gearloc);
      }
    } else {
      // Default: select cell
      Renderer.selectedCell = cell;
      UI.updateBattle(battle, gearloc);
    }
  },

  _findTargetAt(battle, row, col) {
    const baddie = battle.baddies.find(b => b.hp > 0 && b.row === row && b.col === col);
    if (baddie) return baddie;
    if (battle.tyrantUnit && battle.tyrantUnit.hp > 0 && battle.tyrantUnit.row === row && battle.tyrantUnit.col === col) {
      return battle.tyrantUnit;
    }
    return null;
  },

  // ===== GAME FLOW =====
  showTitle() {
    State.set('phase', Config.PHASES.TITLE_SCREEN);
    UI.renderTitle(
      () => this.showCharSelect(),
      () => UI.showHowToPlay(() => UI.hideModal()),
      State.hasSave(),
      () => {
        if (State.load()) {
          this._resumeFromState();
        }
      }
    );
  },

  showCharSelect() {
    State.set('phase', Config.PHASES.CHARACTER_SELECT);
    UI.renderCharSelect(
      (gearlocKey, tyrantKey) => this.startGame(gearlocKey, tyrantKey),
      () => this.showTitle()
    );
  },

  startGame(gearlocKey, tyrantKey) {
    const state = State.get();
    const gearloc = State.createGearloc(gearlocKey);
    const tyrant = Config.TYRANTS[tyrantKey];

    State.set({
      gearlocKey,
      tyrantKey,
      gearloc,
      tyrant,
      day: 0,
      maxDays: tyrant.maxDays,
      progressPoints: 0,
      requiredProgress: tyrant.requiredProgress,
      training: { points: 0 },
      loot: [],
      log: []
    });

    Encounter.initDeck();
    Audio.newDay();
    this.nextDay();
  },

  nextDay() {
    const state = State.get();
    state.day++;

    // Check if out of days and not enough progress
    if (state.day > state.maxDays) {
      if (state.progressPoints >= state.requiredProgress) {
        // Force tyrant battle
        this.startTyrantBattle();
        return;
      } else {
        UI.renderLose(state, `Ran out of time! The ${Config.TYRANTS[state.tyrantKey].name} overwhelms the land.`);
        State.set('phase', Config.PHASES.GAME_LOSE);
        State.clearSave();
        return;
      }
    }

    State.set('phase', Config.PHASES.DAY_START);
    Audio.newDay();
    UI.renderDayStart(state, (choice) => {
      if (choice === 'tyrant') {
        this.startTyrantBattle();
      } else {
        this.drawEncounter();
      }
    });

    State.save();
  },

  drawEncounter() {
    const encounter = Encounter.draw();
    State.set('phase', Config.PHASES.ENCOUNTER);
    UI.renderEncounter(encounter, (choiceIndex) => {
      this.resolveEncounter(choiceIndex);
    });
  },

  resolveEncounter(choiceIndex) {
    const result = Encounter.resolveChoice(choiceIndex);

    if (result.triggerBattle) {
      UI.showEncounterResult(result, () => {
        UI.hideModal();
        this.startBattle(result.baddies);
      });
    } else {
      UI.showEncounterResult(result, () => {
        UI.hideModal();
        this.postEncounter();
      });
    }
  },

  postEncounter() {
    const state = State.get();
    // Check for gearloc death from encounter
    if (state.gearloc.hp <= 0) {
      state.gearloc.hp = 1;
    }

    if (state.training.points > 0) {
      this.showTraining();
    } else {
      this.showRecovery();
    }
  },

  startBattle(baddieKeys) {
    Combat.setupBattle(baddieKeys, false);
    const state = State.get();
    UI.renderBattle(state.battle, state.gearloc);
    this._setupBattleActions();
  },

  startTyrantBattle() {
    const state = State.get();
    const tyrantConfig = Config.TYRANTS[state.tyrantKey];
    Combat.setupBattle(tyrantConfig.spawns.slice(0, 2), true);
    const newState = State.get();
    UI.renderBattle(newState.battle, newState.gearloc);
    this._setupBattleActions();
  },

  _setupBattleActions() {
    UI.onBattleAction((action, param) => {
      const state = State.get();
      const battle = state.battle;
      const gearloc = state.gearloc;
      if (!battle) return;

      switch (action) {
        case 'roll':
          this._handleRoll(battle, gearloc);
          break;
        case 'move':
          this._handleMoveMode(battle, gearloc);
          break;
        case 'attack':
          this._handleAttackMode(battle, gearloc);
          break;
        case 'endTurn':
          this._handleEndTurn(battle, gearloc);
          break;
        case 'skill':
          this._handleSkill(battle, gearloc, param);
          break;
        case 'backupPlan':
          this._handleBackupPlan(battle, gearloc);
          break;
        case 'bomb':
          this._handleBombMode(battle, gearloc);
          break;
        case 'loot':
          this._handleLoot(battle, gearloc, param);
          break;
      }
    });
  },

  _handleRoll(battle, gearloc) {
    // Process gearloc status effects at turn start
    Gearloc.processStatusEffects(gearloc);
    if (gearloc.hp <= 0) {
      const endCheck = Combat.checkBattleEnd(battle, gearloc);
      if (endCheck.ended) {
        this._endBattle(endCheck.victory, endCheck.reason);
        return;
      }
    }

    Combat.rollGearloc(battle, gearloc);
    battle.phase = 'acting';
    battle.turnActions = { moved: false, attacked: false, usedSkill: false };
    UI.updateBattle(battle, gearloc);
    Audio.diceRoll();
    setTimeout(() => Audio.diceResult(), 400);
  },

  _handleMoveMode(battle, gearloc) {
    this._actionMode = 'move';
    const moves = Combat.getValidMoves(battle, gearloc);
    Renderer.validMoves = moves;
    Renderer.validTargets = [];
  },

  _handleAttackMode(battle, gearloc) {
    this._actionMode = 'attack';
    const targets = Combat.getValidTargets(battle, gearloc);
    Renderer.validTargets = targets;
    Renderer.validMoves = [];
  },

  _handleSkill(battle, gearloc, skillId) {
    const skill = gearloc.unlockedSkills.find(s => s.id === skillId);
    if (!skill) return;

    // Skills that need targets
    const needsTarget = ['poison', 'damage', 'selfDmgDeal', 'aoe', 'stun', 'shieldBash',
      'reckless', 'charge', 'damageBurn'].includes(skill.effect.type);

    if (needsTarget) {
      this._actionMode = 'skill';
      this._pendingSkill = skillId;
      // Show all baddies as targets
      const targets = [];
      for (const b of battle.baddies) {
        if (b.hp > 0 && b.row !== null) targets.push([b.row, b.col]);
      }
      if (battle.tyrantUnit && battle.tyrantUnit.hp > 0 && battle.tyrantUnit.row !== null) {
        targets.push([battle.tyrantUnit.row, battle.tyrantUnit.col]);
      }
      Renderer.validTargets = targets;
      Renderer.validMoves = [];
    } else {
      const result = Gearloc.useSkill(gearloc, skillId, null, battle);
      if (result.success) {
        const endCheck = Combat.checkBattleEnd(battle, gearloc);
        if (endCheck.ended) {
          this._endBattle(endCheck.victory, endCheck.reason);
          return;
        }
        battle.turnActions.usedSkill = true;
        UI.updateBattle(battle, gearloc);
      }
    }
  },

  _handleBackupPlan(battle, gearloc) {
    const result = Gearloc.activateBackupPlan(gearloc, battle);
    if (result.success) {
      if (result.needsTarget) {
        this._actionMode = 'attack'; // reuse attack targeting
      }
      UI.updateBattle(battle, gearloc);
    }
  },

  _handleBombMode(battle, gearloc) {
    this._actionMode = 'bomb';
    const targets = [];
    for (const b of battle.baddies) {
      if (b.hp > 0 && b.row !== null) targets.push([b.row, b.col]);
    }
    if (battle.tyrantUnit && battle.tyrantUnit.hp > 0 && battle.tyrantUnit.row !== null) {
      targets.push([battle.tyrantUnit.row, battle.tyrantUnit.col]);
    }
    Renderer.validTargets = targets;
    Renderer.validMoves = [];
  },

  _handleLoot(battle, gearloc, lootIndex) {
    const item = gearloc.loot[lootIndex];
    if (!item) return;

    const result = Encounter.useLoot(lootIndex, gearloc, battle);
    if (result.success) {
      if (result.needsTarget) {
        this._actionMode = 'loot';
        this._pendingLoot = lootIndex;
        const targets = [];
        for (const b of battle.baddies) {
          if (b.hp > 0 && b.row !== null) targets.push([b.row, b.col]);
        }
        if (battle.tyrantUnit && battle.tyrantUnit.hp > 0) {
          targets.push([battle.tyrantUnit.row, battle.tyrantUnit.col]);
        }
        Renderer.validTargets = targets;
      } else {
        UI.updateBattle(battle, gearloc);
      }
    }
  },

  async _handleEndTurn(battle, gearloc) {
    Renderer.clearOverlays();
    this._actionMode = null;

    // Process enemy turns
    let current = Combat.nextTurn(battle, gearloc);

    while (current && !current.isGearloc) {
      battle.phase = 'enemy_turn';
      UI.updateBattle(battle, gearloc);

      await Utils.wait(400);

      const actions = await Combat.processEnemyTurn(battle, gearloc);

      // Animate enemy actions
      if (actions) {
        for (const action of actions) {
          if (action.type === 'attack' && action.damage > 0) {
            UI.screenShake();
            Renderer.addAnimation({ type: 'damage', row: gearloc.row, col: gearloc.col, value: action.damage, duration: 800 });
          }
          if (action.type === 'devour' || action.type === 'aoe_damage') {
            UI.screenShake();
          }
        }
      }

      // Check battle end
      const endCheck = Combat.checkBattleEnd(battle, gearloc);
      if (endCheck.ended) {
        await Utils.wait(500);
        this._endBattle(endCheck.victory, endCheck.reason);
        return;
      }

      current = Combat.nextTurn(battle, gearloc);
    }

    // Back to gearloc turn
    if (current && current.isGearloc) {
      battle.phase = 'rolling';
      battle.turnActions = { moved: false, attacked: false, usedSkill: false };
      battle.diceResults = null;
      UI.updateBattle(battle, gearloc);
    }
  },

  _endBattle(victory, reason) {
    const state = State.get();
    const battle = state.battle;
    const gearloc = state.gearloc;

    if (battle.isTyrant && victory) {
      Combat.endBattle(battle, gearloc, true);
      State.set('phase', Config.PHASES.GAME_WIN);
      UI.renderWin(state);
      State.clearSave();
      return;
    }

    if (!victory) {
      Combat.endBattle(battle, gearloc, false);
      State.set('phase', Config.PHASES.GAME_LOSE);
      UI.renderLose(state, reason);
      State.clearSave();
      return;
    }

    // Normal battle victory
    Combat.endBattle(battle, gearloc, true);
    State.set('phase', Config.PHASES.BATTLE_END);

    UI.showModal('Battle Complete!', `<p>${reason}</p><p>Gained 1 Training Point</p>`, [
      { text: 'Continue', primary: true, action: () => {
        UI.hideModal();
        if (state.training.points > 0) {
          this.showTraining();
        } else {
          this.showRecovery();
        }
      }}
    ]);
  },

  showTraining() {
    const state = State.get();
    State.set('phase', Config.PHASES.TRAINING);

    const renderTraining = () => {
      UI.renderTraining(
        state.gearloc,
        state.training.points,
        (skillId) => {
          // Unlock skill
          const skill = state.gearloc.skills.find(s => s.id === skillId);
          if (skill && !skill.unlocked && state.training.points >= skill.cost) {
            skill.unlocked = true;
            state.gearloc.unlockedSkills.push(skill);
            state.training.points -= skill.cost;
            Audio.skillUse();
            renderTraining();
          }
        },
        (stat) => {
          // Stat upgrade
          if (state.training.points >= 1) {
            if (stat === 'maxHp') {
              state.gearloc.maxHp += 1;
              state.gearloc.hp += 1;
            } else {
              state.gearloc[stat] += 1;
            }
            state.training.points -= 1;
            Audio.skillUse();
            renderTraining();
          }
        },
        () => {
          this.showRecovery();
        }
      );
    };

    renderTraining();
  },

  showRecovery() {
    const state = State.get();
    State.set('phase', Config.PHASES.RECOVERY);
    UI.renderRecovery(state.gearloc, (choice) => {
      switch (choice) {
        case 'rest':
          state.gearloc.hp = state.gearloc.maxHp;
          State.log('Rested and fully healed!');
          Audio.heal();
          break;
        case 'search': {
          const lootDeck = Utils.shuffle([...Config.LOOT]);
          const item = lootDeck[0];
          state.gearloc.loot.push(item);
          State.log(`Found ${item.name}!`);
          Audio.encounter();
          break;
        }
        case 'scout':
          state.progressPoints++;
          State.log('Scouted ahead and gained 1 Progress Point!');
          Audio.encounter();
          break;
      }
      this.nextDay();
    });
  },

  _resumeFromState() {
    const state = State.get();
    switch (state.phase) {
      case Config.PHASES.TITLE_SCREEN:
        this.showTitle();
        break;
      case Config.PHASES.DAY_START:
        UI.renderDayStart(state, (choice) => {
          if (choice === 'tyrant') this.startTyrantBattle();
          else this.drawEncounter();
        });
        break;
      case Config.PHASES.TRAINING:
        this.showTraining();
        break;
      case Config.PHASES.RECOVERY:
        this.showRecovery();
        break;
      default:
        // For battle states or others, restart the day
        UI.renderDayStart(state, (choice) => {
          if (choice === 'tyrant') this.startTyrantBattle();
          else this.drawEncounter();
        });
    }
  }
};

// ===== DEBUG / RENDER TO TEXT =====
window.render_game_to_text = function() {
  const state = State.get();
  if (!state) return JSON.stringify({ error: 'No game state' });

  const output = {
    phase: state.phase,
    day: state.day,
    maxDays: state.maxDays,
    progressPoints: state.progressPoints,
    requiredProgress: state.requiredProgress,
    tyrant: state.tyrantKey,
    gearloc: state.gearloc ? {
      name: state.gearloc.name,
      hp: state.gearloc.hp,
      maxHp: state.gearloc.maxHp,
      atk: state.gearloc.atk,
      def: state.gearloc.def,
      dex: state.gearloc.dex,
      skills: state.gearloc.unlockedSkills.map(s => s.name),
      loot: state.gearloc.loot.map(l => l.name),
      backupPlan: state.gearloc.backupPlan.length,
      position: state.gearloc.row !== null ? [state.gearloc.row, state.gearloc.col] : null,
      rage: state.gearloc.rage,
      bombs: state.gearloc.bombs,
      statusEffects: state.gearloc.statusEffects
    } : null,
    battle: state.battle ? {
      round: state.battle.round,
      phase: state.battle.phase,
      isTyrant: state.battle.isTyrant,
      currentTurn: Combat.getCurrentTurn(state.battle),
      baddiesOnMat: state.battle.baddies.filter(b => b.hp > 0 && b.row !== null).map(b => ({
        name: b.name, hp: b.hp, maxHp: b.maxHp, position: [b.row, b.col]
      })),
      baddieQueue: state.battle.baddieQueue.length,
      tyrant: state.battle.tyrantUnit ? {
        name: state.battle.tyrantUnit.name,
        hp: state.battle.tyrantUnit.hp,
        maxHp: state.battle.tyrantUnit.maxHp,
        position: [state.battle.tyrantUnit.row, state.battle.tyrantUnit.col]
      } : null,
      grid: state.battle.grid.map(row => row.map(cell => cell || '.'))
    } : null,
    training: state.training,
    log: state.log.slice(-10).map(l => l.msg)
  };

  return JSON.stringify(output, null, 2);
};

// ===== INIT ON LOAD =====
window.addEventListener('DOMContentLoaded', () => {
  Game.init();
});
