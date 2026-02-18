// state.js - Game state management, save/load

const State = {
  _state: null,
  _listeners: [],

  init() {
    this._state = {
      phase: Config.PHASES.TITLE_SCREEN,
      day: 0,
      maxDays: 0,
      progressPoints: 0,
      requiredProgress: 0,
      tyrant: null,
      tyrantKey: null,
      gearloc: null,
      gearlocKey: null,
      battle: null,
      encounter: null,
      encounterDeck: [],
      training: { points: 0 },
      loot: [],
      lootDeck: [],
      log: [],
      animations: [],
      settings: {
        soundEnabled: true,
        animSpeed: 1
      }
    };
    return this._state;
  },

  get() {
    return this._state;
  },

  set(key, value) {
    if (typeof key === 'object') {
      Object.assign(this._state, key);
    } else {
      this._state[key] = value;
    }
    this._notify();
  },

  update(fn) {
    fn(this._state);
    this._notify();
  },

  onChange(fn) {
    this._listeners.push(fn);
  },

  _notify() {
    for (const fn of this._listeners) fn(this._state);
  },

  // Initialize gearloc from config
  createGearloc(key) {
    const cfg = Config.GEARLOCS[key];
    return {
      key,
      name: cfg.name,
      role: cfg.role,
      hp: cfg.hp,
      maxHp: cfg.maxHp,
      atk: cfg.atk,
      def: cfg.def,
      dex: cfg.dex,
      innate: cfg.innate,
      innateDesc: cfg.innateDesc,
      color: cfg.color,
      chipColor: cfg.chipColor,
      skills: cfg.skills.map(s => ({ ...s, unlocked: false })),
      unlockedSkills: [],
      loot: [],
      backupPlan: [],
      backupPlanEffect: cfg.backupPlanEffect,
      rage: 0,
      bombs: 0,
      killCount: 0,
      statusEffects: [],
      tempBonuses: {},
      position: null,
      row: null,
      col: null
    };
  },

  // Initialize battle state
  createBattle(baddieKeys, isTyrant = false) {
    const grid = Array.from({ length: Config.GRID_ROWS }, () =>
      Array(Config.GRID_COLS).fill(null)
    );

    const baddies = baddieKeys.map((key, i) => {
      const cfg = Config.BADDIES[key];
      if (!cfg) return null;
      return {
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
    }).filter(Boolean);

    return {
      grid,
      baddies,
      baddieQueue: [],
      initiative: [],
      currentTurnIndex: 0,
      round: 1,
      phase: 'setup', // setup, rolling, allocating, acting, enemy_turn, round_end
      selectedUnit: null,
      selectedAction: null,
      diceResults: [],
      allocatedDice: { attack: [], defense: [], skill: [] },
      availableDice: [],
      shieldWallActive: false,
      shieldWallValue: 0,
      turnActions: { moved: false, attacked: false, usedSkill: false },
      isTyrant,
      tyrantUnit: null,
      combatLog: [],
      pendingAnimations: []
    };
  },

  createTyrantUnit(key) {
    const cfg = Config.TYRANTS[key];
    return {
      id: 'tyrant_' + key,
      key,
      name: cfg.name,
      title: cfg.title,
      hp: cfg.hp,
      maxHp: cfg.hp,
      atk: cfg.atk,
      def: cfg.def,
      init: cfg.init,
      type: cfg.type,
      color: cfg.color,
      chipColor: cfg.chipColor,
      abilities: cfg.abilities,
      spawns: cfg.spawns,
      range: cfg.type === 'ranged' ? 3 : 1,
      statusEffects: [],
      row: null,
      col: null,
      isTyrant: true,
      stunned: false
    };
  },

  // Add to combat log
  log(msg) {
    if (this._state.battle) {
      this._state.battle.combatLog.push({ msg, time: Date.now() });
      if (this._state.battle.combatLog.length > 50) {
        this._state.battle.combatLog.shift();
      }
    }
    this._state.log.push({ msg, time: Date.now() });
    if (this._state.log.length > 100) this._state.log.shift();
  },

  // Save/Load
  save() {
    try {
      localStorage.setItem('tmb_save', JSON.stringify(this._state));
      return true;
    } catch (e) {
      console.error('Save failed:', e);
      return false;
    }
  },

  load() {
    try {
      const data = localStorage.getItem('tmb_save');
      if (!data) return false;
      this._state = JSON.parse(data);
      this._notify();
      return true;
    } catch (e) {
      console.error('Load failed:', e);
      return false;
    }
  },

  hasSave() {
    return !!localStorage.getItem('tmb_save');
  },

  clearSave() {
    localStorage.removeItem('tmb_save');
  }
};
