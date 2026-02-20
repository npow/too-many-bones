// ui.js - DOM-based UI management

const UI = {
  screens: {},
  modal: null,
  tooltip: null,
  _battleActionCallback: null,

  init() {
    this.screens = {
      title: document.getElementById('title-screen'),
      charSelect: document.getElementById('character-select'),
      day: document.getElementById('day-screen'),
      encounter: document.getElementById('encounter-screen'),
      battle: document.getElementById('battle-screen'),
      training: document.getElementById('training-screen'),
      recovery: document.getElementById('recovery-screen'),
      reward: document.getElementById('reward-screen'),
      win: document.getElementById('win-screen'),
      lose: document.getElementById('lose-screen'),
    };
    this.modal = document.getElementById('modal-overlay');
    this.tooltip = document.getElementById('tooltip');
  },

  // Show a screen, hide all others
  showScreen(name) {
    for (const [key, el] of Object.entries(this.screens)) {
      if (el) {
        el.classList.remove('active', 'fade-in');
        el.style.display = 'none';
      }
    }
    const screen = this.screens[name];
    if (screen) {
      screen.style.display = '';
      screen.classList.add('active', 'fade-in');
    }
  },

  // ===== TITLE SCREEN =====
  renderTitle(onNewGame, onHowToPlay, hasSave, onContinue) {
    this.showScreen('title');
    const screen = this.screens.title;
    screen.innerHTML = `
      <div class="title-bg-pattern"></div>
      <div class="title-content">
        <div class="title-bones">&#9856; &#9858; &#9860; &#9861; &#9859; &#9857;</div>
        <h1 class="game-title">TOO MANY BONES</h1>
        <p class="game-subtitle">A Dice-Builder RPG</p>
        <div class="btn-group">
          <button class="btn btn-primary" id="btn-new-game">New Game</button>
          ${hasSave ? '<button class="btn" id="btn-continue">Continue</button>' : ''}
          <button class="btn btn-small" id="btn-how-to-play">How to Play</button>
        </div>
      </div>
    `;
    document.getElementById('btn-new-game').onclick = () => { Audio.buttonClick(); onNewGame(); };
    if (hasSave) {
      document.getElementById('btn-continue').onclick = () => { Audio.buttonClick(); onContinue(); };
    }
    document.getElementById('btn-how-to-play').onclick = () => { Audio.buttonClick(); onHowToPlay(); };
  },

  // ===== HOW TO PLAY =====
  showHowToPlay(onClose) {
    this.showModal('How to Play', `
      <div class="how-to-play">
        <h3>Overview</h3>
        <p>You are a Gearloc adventurer facing dangerous encounters over several days, building up strength to defeat a Tyrant boss.</p>
        <h3>Day Structure</h3>
        <p>Each day you face an Encounter with 2 choices. Some lead to battles, others give rewards or test your skills.</p>
        <h3>Combat</h3>
        <p>Battles take place on a 4x4 grid. Each round, roll your dice and allocate them: Attack dice deal damage, Defense dice block damage, Dexterity dice give movement points.</p>
        <p>Bones rolled go to your Backup Plan. Fill all 4 slots to trigger a special ability!</p>
        <h3>Skills & Training</h3>
        <p>After battles, spend Training Points to unlock skills or boost stats. Each Gearloc has unique abilities.</p>
        <h3>Winning</h3>
        <p>Accumulate enough Progress Points to face the Tyrant. Defeat the Tyrant to win!</p>
      </div>
    `, [{ text: 'Got it!', primary: true, action: onClose }]);
  },

  // ===== CHARACTER SELECT =====
  renderCharSelect(onSelect, onBack) {
    this.showScreen('charSelect');
    const screen = this.screens.charSelect;

    let gearlocHTML = '';
    for (const [key, g] of Object.entries(Config.GEARLOCS)) {
      gearlocHTML += `
        <div class="gearloc-card" data-gearloc="${key}">
          <div class="gearloc-chip" style="background:${g.chipColor}">${g.name[0]}</div>
          <div class="gearloc-name">${g.name}</div>
          <div class="gearloc-role">${g.role}</div>
          <div class="gearloc-stats">
            <div class="stat-item"><span class="stat-icon" style="color:#e05050">HP</span> <span class="stat-value">${g.hp}</span></div>
            <div class="stat-item"><span class="stat-icon" style="color:#e53935">ATK</span> <span class="stat-value">${g.atk}</span></div>
            <div class="stat-item"><span class="stat-icon" style="color:#2196f3">DEF</span> <span class="stat-value">${g.def}</span></div>
            <div class="stat-item"><span class="stat-icon" style="color:#4caf50">DEX</span> <span class="stat-value">${g.dex}</span></div>
          </div>
          <div class="gearloc-flavor">${g.flavor}</div>
          <div class="gearloc-innate"><b>${g.innate}:</b> ${g.innateDesc}</div>
        </div>
      `;
    }

    let tyrantHTML = '';
    for (const [key, t] of Object.entries(Config.TYRANTS)) {
      tyrantHTML += `
        <div class="tyrant-card" data-tyrant="${key}">
          <div class="tyrant-name">${t.name}</div>
          <div class="tyrant-title-label">${t.title}</div>
          <div class="tyrant-desc">${t.desc}</div>
          <div class="tyrant-stats">HP: ${t.hp} | ATK: ${t.atk} | Days: ${t.maxDays}</div>
        </div>
      `;
    }

    screen.innerHTML = `
      <h2 class="select-title">Choose Your Gearloc</h2>
      <div class="gearloc-grid">${gearlocHTML}</div>
      <div class="tyrant-section">
        <p class="select-subtitle">Choose Your Tyrant</p>
        <div class="tyrant-grid">${tyrantHTML}</div>
      </div>
      <div class="btn-group" style="flex-direction:row;gap:10px">
        <button class="btn btn-small" id="btn-back">Back</button>
        <button class="btn btn-primary" id="btn-begin" disabled>Begin Adventure</button>
      </div>
    `;

    let selectedGearloc = null;
    let selectedTyrant = null;

    const updateBegin = () => {
      document.getElementById('btn-begin').disabled = !(selectedGearloc && selectedTyrant);
    };

    screen.querySelectorAll('.gearloc-card').forEach(card => {
      card.onclick = () => {
        Audio.click();
        screen.querySelectorAll('.gearloc-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedGearloc = card.dataset.gearloc;
        updateBegin();
      };
    });

    screen.querySelectorAll('.tyrant-card').forEach(card => {
      card.onclick = () => {
        Audio.click();
        screen.querySelectorAll('.tyrant-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedTyrant = card.dataset.tyrant;
        updateBegin();
      };
    });

    document.getElementById('btn-back').onclick = () => { Audio.buttonClick(); onBack(); };
    document.getElementById('btn-begin').onclick = () => {
      if (selectedGearloc && selectedTyrant) {
        Audio.buttonClick();
        onSelect(selectedGearloc, selectedTyrant);
      }
    };
  },

  // ===== DAY START =====
  renderDayStart(state, onContinue) {
    this.showScreen('day');
    const screen = this.screens.day;
    const g = state.gearloc;
    const progressPct = Math.min(100, (state.progressPoints / state.requiredProgress) * 100);
    const canFaceTyrant = state.progressPoints >= state.requiredProgress;

    screen.innerHTML = `
      <div class="day-header">
        <div class="day-counter">Day ${state.day} of ${state.maxDays}</div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width:${progressPct}%"></div>
          <div class="progress-bar-text">Progress: ${state.progressPoints} / ${state.requiredProgress}</div>
        </div>
        ${canFaceTyrant ? '<p style="color:var(--accent-red);margin-top:8px">The Tyrant awaits!</p>' : ''}
      </div>
      <div class="gearloc-hud">
        <div class="gearloc-hud-chip" style="background:${g.chipColor}">${g.name[0]}</div>
        <div class="gearloc-hud-stats">
          <div class="gearloc-hud-name">${g.name} - ${g.role}</div>
          <div class="gearloc-hud-hp">HP: ${g.hp}/${g.maxHp} | ATK: ${g.atk} | DEF: ${g.def} | DEX: ${g.dex}</div>
          <div style="font-size:0.75rem;color:var(--text-dim)">Training: ${state.training.points} | Loot: ${g.loot.length} | Skills: ${g.unlockedSkills.length}</div>
        </div>
      </div>
      <div class="btn-group" style="margin-top:1.5rem">
        ${canFaceTyrant ? `<button class="btn btn-danger" id="btn-face-tyrant">Face ${Config.TYRANTS[state.tyrantKey].name}</button>` : ''}
        <button class="btn btn-primary" id="btn-next-encounter">${state.day >= state.maxDays && !canFaceTyrant ? 'Final Day...' : 'Draw Encounter'}</button>
      </div>
    `;

    document.getElementById('btn-next-encounter').onclick = () => { Audio.buttonClick(); onContinue('encounter'); };
    if (canFaceTyrant) {
      document.getElementById('btn-face-tyrant').onclick = () => { Audio.buttonClick(); onContinue('tyrant'); };
    }
  },

  // ===== ENCOUNTER =====
  renderEncounter(encounter, onChoice) {
    this.showScreen('encounter');
    const screen = this.screens.encounter;
    const state = State.get();
    const progressPct = Math.min(100, (state.progressPoints / state.requiredProgress) * 100);

    let choicesHTML = '';
    encounter.choices.forEach((choice, i) => {
      let typeLabel = '';
      if (choice.type === 'battle') typeLabel = '\u2694 Battle';
      else if (choice.type === 'skill_check') typeLabel = `\u272A ${choice.stat.toUpperCase()} Check (DC ${choice.dc})`;
      else if (choice.type === 'reward') typeLabel = '\u2605 Reward';
      else if (choice.type === 'cost') typeLabel = '\u26C1 Cost';

      choicesHTML += `
        <div class="encounter-choice" data-choice="${i}">
          <div class="choice-text">${choice.text}</div>
          <div class="choice-type">${typeLabel}</div>
        </div>
      `;
    });

    screen.innerHTML = `
      <div class="day-header">
        <div class="day-counter" style="font-size:1.5rem">Day ${state.day} of ${state.maxDays}</div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width:${progressPct}%"></div>
          <div class="progress-bar-text">Progress: ${state.progressPoints} / ${state.requiredProgress}</div>
        </div>
      </div>
      <div class="encounter-card">
        <div class="encounter-title">${encounter.title}</div>
        <div class="encounter-text">${encounter.text}</div>
        <div class="encounter-choices">${choicesHTML}</div>
      </div>
    `;

    screen.querySelectorAll('.encounter-choice').forEach(el => {
      el.onclick = () => {
        Audio.buttonClick();
        onChoice(parseInt(el.dataset.choice));
      };
    });

    Audio.encounter();
  },

  // Show encounter result
  showEncounterResult(result, onContinue) {
    let body = `<p>${result.message}</p>`;

    if (result.skillCheck) {
      const sc = result.skillCheck;
      body += `<div class="skill-check-result">`;
      body += `<p>${sc.stat.toUpperCase()} Check: Rolled ${sc.rolled} vs DC ${sc.dc}</p>`;
      body += `<div class="skill-check-dice">`;
      for (const d of sc.dice) {
        const cls = d.type === 'bones' ? 'bone-die' : (sc.stat === 'atk' ? 'attack-die' : (sc.stat === 'def' ? 'defense-die' : 'dex-die'));
        body += `<div class="die ${cls}"><span class="die-value">${d.type === 'bones' ? '\u2620' : d.value}</span></div>`;
      }
      body += `</div>`;
      body += `<div class="skill-check-outcome ${sc.success ? 'success' : 'failure'}">${sc.success ? 'Success!' : 'Failed!'}</div>`;
      body += `</div>`;
    }

    if (result.rewards.length > 0) {
      body += `<div class="reward-items">`;
      for (const r of result.rewards) {
        if (r.type === 'heal') body += `<div class="reward-item"><div class="reward-item-name">Healed ${r.value} HP</div></div>`;
        if (r.type === 'loot') {
          for (const item of r.items) {
            body += `<div class="reward-item"><div class="reward-item-name">${item.name}</div><div class="reward-item-desc">${item.desc}</div></div>`;
          }
        }
        if (r.type === 'training') body += `<div class="reward-item"><div class="reward-item-name">+${r.value} Training</div></div>`;
        if (r.type === 'progress') body += `<div class="reward-item"><div class="reward-item-name">+${r.value} Progress</div></div>`;
      }
      body += `</div>`;
    }

    const btnText = result.triggerBattle ? 'To Battle!' : 'Continue';
    this.showModal('Encounter Result', body, [
      { text: btnText, primary: true, action: onContinue }
    ]);
  },

  // ===== BATTLE SCREEN =====
  renderBattle(battle, gearloc) {
    this.showScreen('battle');
    this._updateBattleUI(battle, gearloc);
  },

  _updateBattleUI(battle, gearloc) {
    if (!battle) return;
    const screen = this.screens.battle;

    // Top bar with turn banner
    const topBar = screen.querySelector('.battle-top-bar') || document.createElement('div');
    topBar.className = 'battle-top-bar';
    const current = Combat.getCurrentTurn(battle);
    const isPlayerTurn = current && current.isGearloc && battle.phase !== 'enemy_turn';
    const phaseInfo = this._getPhaseLabel(battle);
    const phaseSteps = this._getPhaseSteps(battle);
    topBar.innerHTML = `
      <div class="turn-banner ${isPlayerTurn ? 'player-turn' : 'enemy-turn'}">
        <span class="round-badge">Round ${battle.round}</span>
        <div style="text-align:center">
          <div class="turn-banner-text">${isPlayerTurn ? 'Your Turn' : (current ? current.name + "'s Turn" : 'Battle')}</div>
          <div class="turn-banner-phase">${phaseInfo.phase}</div>
          ${isPlayerTurn ? phaseSteps : ''}
        </div>
        <span class="battle-info-badge">${battle.isTyrant ? 'TYRANT' : ''} ${battle.baddieQueue.length > 0 ? 'Queue: ' + battle.baddieQueue.length : ''}</span>
      </div>
    `;

    // Left panel - selected unit info
    const leftPanel = screen.querySelector('.battle-left-panel') || document.createElement('div');
    leftPanel.className = 'battle-left-panel';
    leftPanel.innerHTML = this._renderUnitInfo(battle, gearloc);

    // Right panel - initiative + combat log
    const rightPanel = screen.querySelector('.battle-right-panel') || document.createElement('div');
    rightPanel.className = 'battle-right-panel';
    rightPanel.innerHTML = this._renderInitiative(battle) + this._renderCombatLog(battle);

    // Bottom bar - actions
    const bottomBar = screen.querySelector('.battle-bottom-bar') || document.createElement('div');
    bottomBar.className = 'battle-bottom-bar';
    bottomBar.innerHTML = this._renderActionBar(battle, gearloc);

    // Ensure structure
    if (!screen.querySelector('.battle-top-bar')) {
      screen.innerHTML = '';
      screen.appendChild(topBar);
      screen.appendChild(leftPanel);

      const center = document.createElement('div');
      center.className = 'battle-center';
      let canvas = document.getElementById('battle-canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'battle-canvas';
      }
      center.appendChild(canvas);
      screen.appendChild(center);

      screen.appendChild(rightPanel);
      screen.appendChild(bottomBar);

      Renderer.init(canvas);
    } else {
      screen.querySelector('.battle-top-bar').replaceWith(topBar);
      screen.querySelector('.battle-left-panel').replaceWith(leftPanel);
      screen.querySelector('.battle-right-panel').replaceWith(rightPanel);
      screen.querySelector('.battle-bottom-bar').replaceWith(bottomBar);
    }

    this._bindBattleActions(battle, gearloc);
    Renderer.render(battle, gearloc);
  },

  _getPhaseLabel(battle) {
    const current = Combat.getCurrentTurn(battle);
    if (!current) return { text: '', phase: '' };
    const isPlayer = current.isGearloc;
    if (!isPlayer || battle.phase === 'enemy_turn') {
      return { text: current.name, phase: 'Taking Action' };
    }
    switch (battle.phase) {
      case 'rolling': return { text: current.name, phase: 'Roll Your Dice' };
      case 'allocating': return { text: current.name, phase: 'Choose Your Actions' };
      case 'acting': return { text: current.name, phase: 'Choose Your Actions' };
      default: return { text: current.name, phase: '' };
    }
  },

  _getPhaseSteps(battle) {
    const current = Combat.getCurrentTurn(battle);
    if (!current || !current.isGearloc || battle.phase === 'enemy_turn') return '';
    const rolled = battle.phase === 'acting' || battle.phase === 'allocating';
    const steps = [
      { label: 'Roll', active: battle.phase === 'rolling', completed: rolled },
      { label: 'Act', active: rolled, completed: false },
      { label: 'End Turn', active: false, completed: false }
    ];
    let html = '<div class="phase-steps">';
    steps.forEach((step, i) => {
      if (i > 0) html += '<span class="phase-step-divider">\u203A</span>';
      const cls = step.completed ? 'completed' : (step.active ? 'active' : '');
      html += `<span class="phase-step ${cls}">${step.label}</span>`;
    });
    html += '</div>';
    return html;
  },

  _renderUnitInfo(battle, gearloc) {
    let html = '';
    const hpPct = gearloc.hp / gearloc.maxHp;
    const hpClass = hpPct > 0.5 ? 'hp-high' : (hpPct > 0.25 ? 'hp-medium' : 'hp-low');

    // Gearloc info
    html += `<div class="unit-info-panel">`;
    html += `<div class="unit-info-header"><span class="unit-info-chip" style="background:${gearloc.chipColor}">${gearloc.name[0]}</span>${gearloc.name}</div>`;
    html += `<div class="hp-bar"><div class="hp-bar-fill ${hpClass}" style="width:${hpPct * 100}%"></div></div>`;
    html += `<div class="unit-stat-row"><span class="unit-stat-label" style="color:#e05050">HP</span><span class="unit-stat-value">${gearloc.hp} / ${gearloc.maxHp}</span></div>`;
    html += `<div class="unit-stat-row"><span class="unit-stat-label" style="color:#c62828">ATK</span><span class="unit-stat-value">${gearloc.atk}${battle.rageBonus ? ' <span style="color:var(--accent-red)">+' + battle.rageBonus + '</span>' : ''}</span></div>`;
    html += `<div class="unit-stat-row"><span class="unit-stat-label" style="color:#1976d2">DEF</span><span class="unit-stat-value">${gearloc.def}${battle.shieldWallActive ? ' <span style="color:var(--accent-blue)">+' + battle.shieldWallValue + '</span>' : ''}</span></div>`;
    html += `<div class="unit-stat-row"><span class="unit-stat-label" style="color:#388e3c">DEX</span><span class="unit-stat-value">${gearloc.dex}</span></div>`;
    if (gearloc.rage > 0) html += `<div class="unit-stat-row"><span class="unit-stat-label" style="color:var(--accent-red)">Rage</span><span class="unit-stat-value" style="color:var(--accent-red)">${gearloc.rage}</span></div>`;
    if (gearloc.bombs > 0) html += `<div class="unit-stat-row"><span class="unit-stat-label" style="color:var(--accent-red)">Bombs</span><span class="unit-stat-value" style="color:var(--accent-red)">${gearloc.bombs}</span></div>`;
    if (gearloc.statusEffects.length > 0) {
      html += `<div class="status-effects">`;
      for (const e of gearloc.statusEffects) {
        html += `<span class="status-badge ${e.type}">${e.type} (${e.duration})</span>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    // Selected baddie info
    if (Renderer.selectedCell) {
      const { row, col } = Renderer.selectedCell;
      const baddie = battle.baddies.find(b => b.row === row && b.col === col && b.hp > 0);
      const tyrant = battle.tyrantUnit && battle.tyrantUnit.row === row && battle.tyrantUnit.col === col ? battle.tyrantUnit : null;
      const unit = baddie || tyrant;
      if (unit) {
        const uHpPct = unit.hp / unit.maxHp;
        const uHpClass = uHpPct > 0.5 ? 'hp-high' : (uHpPct > 0.25 ? 'hp-medium' : 'hp-low');
        html += `<div class="unit-info-panel">`;
        html += `<div class="unit-info-header" style="color:var(--accent-red)"><span class="unit-info-chip" style="background:${unit.color || unit.chipColor}">${unit.name[0]}</span>${unit.name}${unit.isTyrant ? ' (Tyrant)' : ''}</div>`;
        html += `<div class="hp-bar"><div class="hp-bar-fill ${uHpClass}" style="width:${uHpPct * 100}%"></div></div>`;
        html += `<div class="unit-stat-row"><span class="unit-stat-label" style="color:#e05050">HP</span><span class="unit-stat-value">${unit.hp} / ${unit.maxHp}</span></div>`;
        html += `<div class="unit-stat-row"><span class="unit-stat-label" style="color:#c62828">ATK</span><span class="unit-stat-value">${unit.atk}</span></div>`;
        html += `<div class="unit-stat-row"><span class="unit-stat-label" style="color:#1976d2">DEF</span><span class="unit-stat-value">${unit.def}</span></div>`;
        html += `<div class="unit-stat-row"><span class="unit-stat-label">Type</span><span class="unit-stat-value">${unit.type}</span></div>`;
        if (unit.statusEffects && unit.statusEffects.length > 0) {
          html += `<div class="status-effects">`;
          for (const e of unit.statusEffects) {
            html += `<span class="status-badge ${e.type}">${e.type} (${e.duration})</span>`;
          }
          html += `</div>`;
        }
        html += `</div>`;
      }
    }

    return html;
  },

  _renderInitiative(battle) {
    let html = `<div class="initiative-list"><div class="initiative-title">Turn Order</div>`;
    battle.initiative.forEach((unit, i) => {
      const isActive = i === battle.currentTurnIndex;
      // Check if unit is dead
      let isDead = false;
      if (!unit.isGearloc) {
        const found = Combat.findUnit(battle, unit.id);
        if (found && found.hp <= 0) isDead = true;
      }
      const cls = isDead ? 'dead-unit' : (isActive ? 'active-turn' : '');
      html += `<div class="init-entry ${cls}">
        <div class="init-chip" style="background:${unit.color}">${unit.name[0]}</div>
        <span class="init-name">${unit.name}</span>
        <span class="init-hp">${isDead ? '\u2620' : unit.init}</span>
      </div>`;
    });
    html += `</div>`;
    return html;
  },

  _renderCombatLog(battle) {
    let html = `<div class="combat-log"><div class="combat-log-title">Combat Log</div>`;
    const logs = battle.combatLog.slice(-20);
    for (const entry of logs) {
      let cls = 'info';
      if (entry.msg.includes('damage') || entry.msg.includes('attacks')) cls = 'damage';
      else if (entry.msg.includes('heal') || entry.msg.includes('regenerate')) cls = 'heal';
      else if (entry.msg.startsWith('---')) cls = 'round';
      html += `<div class="log-entry ${cls}">${entry.msg}</div>`;
    }
    html += `</div>`;
    return html;
  },

  _renderActionBar(battle, gearloc) {
    const current = Combat.getCurrentTurn(battle);
    const isGearlocTurn = current && current.isGearloc;
    let html = '';

    if (isGearlocTurn && battle.phase === 'rolling') {
      html += `<div class="action-section" style="flex:1;text-align:center">
        <div class="action-section-label">Step 1: Roll Dice</div>
        <button class="btn btn-primary" id="btn-roll-dice" style="margin-top:4px">Roll Dice</button>
      </div>`;
    }

    if (isGearlocTurn && (battle.phase === 'allocating' || battle.phase === 'acting')) {
      // Dice results
      const results = battle.diceResults;
      if (results) {
        // Calculate totals for display
        const atkTotal = Dice.sumAttack(results.attack || [], (battle.rageBonus || 0) + Gearloc.getPassiveBonus(gearloc, 'atk') + (gearloc.tempBonuses.atkBonus || 0));
        const defTotal = Dice.sumDefense(results.defense || []);
        const dexTotal = Dice.sumDex(results.dexterity || []);

        html += `<div class="action-section"><div class="action-section-label" style="color:#e53935">Attack: ${atkTotal}</div><div class="dice-pool">`;
        for (const d of (results.attack || [])) {
          html += `<div class="die ${Dice.getDieClass(d, 'attack')}" title="ATK: ${d.type === 'bones' ? 'Bone' : d.value}"><span class="die-value">${Dice.getDieSymbol(d)}</span><span class="die-type-icon">${Dice.getDieTypeLabel(d)}</span></div>`;
        }
        html += `</div></div>`;

        html += `<div class="action-section"><div class="action-section-label" style="color:#2196f3">Defense: ${defTotal}</div><div class="dice-pool">`;
        for (const d of (results.defense || [])) {
          html += `<div class="die ${Dice.getDieClass(d, 'defense')}" title="DEF: ${d.type === 'bones' ? 'Bone' : d.value}"><span class="die-value">${Dice.getDieSymbol(d)}</span><span class="die-type-icon">${Dice.getDieTypeLabel(d)}</span></div>`;
        }
        html += `</div></div>`;

        html += `<div class="action-section"><div class="action-section-label" style="color:#4caf50">Dexterity: ${dexTotal}</div><div class="dice-pool">`;
        for (const d of (results.dexterity || [])) {
          html += `<div class="die ${Dice.getDieClass(d, 'dexterity')}" title="DEX: ${d.type === 'bones' ? 'Bone' : d.value}"><span class="die-value">${Dice.getDieSymbol(d)}</span><span class="die-type-icon">${Dice.getDieTypeLabel(d)}</span></div>`;
        }
        html += `</div></div>`;
      }

      // Backup plan
      html += `<div class="action-section"><div class="action-section-label">Backup Plan</div><div class="backup-plan ${gearloc.backupPlan.length >= Config.MAX_BACKUP_PLAN ? 'backup-plan-ready' : ''}">`;
      for (let i = 0; i < Config.MAX_BACKUP_PLAN; i++) {
        html += `<div class="backup-slot ${i < gearloc.backupPlan.length ? 'filled' : ''}">${i < gearloc.backupPlan.length ? '\u2620' : ''}</div>`;
      }
      html += `</div>`;
      if (gearloc.backupPlan.length >= Config.MAX_BACKUP_PLAN) {
        html += `<button class="btn btn-small" id="btn-backup-plan" style="margin-top:4px">Activate!</button>`;
      }
      html += `</div>`;

      // Skills
      const activeSkills = gearloc.unlockedSkills.filter(s => s.type !== 'passive');
      if (activeSkills.length > 0) {
        html += `<div class="action-section"><div class="action-section-label">Skills</div><div class="skill-buttons">`;
        for (const skill of activeSkills) {
          html += `<button class="skill-btn" data-skill="${skill.id}" title="${skill.desc}">${skill.name}</button>`;
        }
        html += `</div></div>`;
      }

      // Bombs (Boomer)
      if (gearloc.bombs > 0) {
        html += `<div class="action-section"><div class="action-section-label">Bombs: ${gearloc.bombs}</div>
          <button class="btn btn-small btn-danger" id="btn-use-bomb">Throw Bomb</button>
        </div>`;
      }

      // Loot
      if (gearloc.loot.length > 0) {
        html += `<div class="action-section"><div class="action-section-label">Loot</div><div class="skill-buttons">`;
        gearloc.loot.forEach((item, i) => {
          html += `<button class="skill-btn" data-loot="${i}" title="${item.desc}">${item.name}</button>`;
        });
        html += `</div></div>`;
      }

      // Action buttons with move/attack state
      const hasTargets = Combat.getValidTargets(battle, gearloc).length > 0;
      const hasMoves = battle.diceResults && Dice.sumDex(battle.diceResults.dexterity || []) > 0;
      html += `<div class="action-buttons">
        <button class="btn btn-small" id="btn-move" ${!hasMoves ? 'disabled title="No DEX points"' : ''}>Move</button>
        <button class="btn btn-small btn-danger" id="btn-attack" ${!hasTargets ? 'disabled title="No adjacent enemies"' : ''}>Attack</button>
        <button class="btn btn-primary btn-small" id="btn-end-turn">End Turn</button>
      </div>`;
    }

    if (!isGearlocTurn || battle.phase === 'enemy_turn') {
      html += `<div class="enemy-turn-waiting">Enemy Turn \u2014 Waiting for enemies...</div>`;
    }

    return html;
  },

  _bindBattleActions(battle, gearloc) {
    const rollBtn = document.getElementById('btn-roll-dice');
    if (rollBtn) {
      rollBtn.onclick = () => {
        Audio.buttonClick();
        if (this._battleActionCallback) this._battleActionCallback('roll');
      };
    }

    const moveBtn = document.getElementById('btn-move');
    if (moveBtn) {
      moveBtn.onclick = () => {
        Audio.buttonClick();
        if (this._battleActionCallback) this._battleActionCallback('move');
      };
    }

    const atkBtn = document.getElementById('btn-attack');
    if (atkBtn) {
      atkBtn.onclick = () => {
        Audio.buttonClick();
        if (this._battleActionCallback) this._battleActionCallback('attack');
      };
    }

    const endBtn = document.getElementById('btn-end-turn');
    if (endBtn) {
      endBtn.onclick = () => {
        Audio.buttonClick();
        if (this._battleActionCallback) this._battleActionCallback('endTurn');
      };
    }

    const bpBtn = document.getElementById('btn-backup-plan');
    if (bpBtn) {
      bpBtn.onclick = () => {
        Audio.buttonClick();
        if (this._battleActionCallback) this._battleActionCallback('backupPlan');
      };
    }

    const bombBtn = document.getElementById('btn-use-bomb');
    if (bombBtn) {
      bombBtn.onclick = () => {
        Audio.buttonClick();
        if (this._battleActionCallback) this._battleActionCallback('bomb');
      };
    }

    // Skill buttons
    document.querySelectorAll('.skill-btn[data-skill]').forEach(btn => {
      btn.onclick = () => {
        Audio.buttonClick();
        if (this._battleActionCallback) this._battleActionCallback('skill', btn.dataset.skill);
      };
    });

    // Loot buttons
    document.querySelectorAll('.skill-btn[data-loot]').forEach(btn => {
      btn.onclick = () => {
        Audio.buttonClick();
        if (this._battleActionCallback) this._battleActionCallback('loot', parseInt(btn.dataset.loot));
      };
    });
  },

  onBattleAction(callback) {
    this._battleActionCallback = callback;
  },

  updateBattle(battle, gearloc) {
    this._updateBattleUI(battle, gearloc);
  },

  // ===== TRAINING =====
  renderTraining(gearloc, trainingPoints, onUnlock, onStatUp, onDone) {
    this.showScreen('training');
    const screen = this.screens.training;

    let skillsHTML = '';
    for (const skill of gearloc.skills) {
      const isUnlocked = skill.unlocked;
      const canAfford = trainingPoints >= skill.cost;
      const cls = isUnlocked ? 'unlocked' : (!canAfford ? 'locked' : '');
      skillsHTML += `
        <div class="skill-node ${cls}" data-skill="${skill.id}" ${!isUnlocked && canAfford ? '' : ''}>
          <div class="skill-node-name">${skill.name} ${isUnlocked ? '&#10003;' : ''}</div>
          <div class="skill-node-cost">${isUnlocked ? 'Unlocked' : `Cost: ${skill.cost} TP`}</div>
          <div class="skill-node-desc">${skill.desc}</div>
        </div>
      `;
    }

    screen.innerHTML = `
      <div class="training-container">
        <div class="training-header">
          <h2 class="select-title">Training</h2>
          <div class="training-points-display">${trainingPoints} Training Points</div>
        </div>
        <p class="select-subtitle">Unlock Skills</p>
        <div class="skill-tree">${skillsHTML}</div>
        <p class="select-subtitle">Boost Stats (1 TP each)</p>
        <div class="stat-upgrades">
          <div class="stat-upgrade-btn" data-stat="maxHp"><div class="stat-name">HP</div><div class="stat-current">${gearloc.maxHp}</div></div>
          <div class="stat-upgrade-btn" data-stat="atk"><div class="stat-name">ATK</div><div class="stat-current">${gearloc.atk}</div></div>
          <div class="stat-upgrade-btn" data-stat="def"><div class="stat-name">DEF</div><div class="stat-current">${gearloc.def}</div></div>
          <div class="stat-upgrade-btn" data-stat="dex"><div class="stat-name">DEX</div><div class="stat-current">${gearloc.dex}</div></div>
        </div>
        <div class="btn-group"><button class="btn btn-primary" id="btn-done-training">Done</button></div>
      </div>
    `;

    screen.querySelectorAll('.skill-node:not(.unlocked):not(.locked)').forEach(node => {
      node.onclick = () => { Audio.buttonClick(); onUnlock(node.dataset.skill); };
    });
    screen.querySelectorAll('.stat-upgrade-btn').forEach(btn => {
      btn.onclick = () => { Audio.buttonClick(); onStatUp(btn.dataset.stat); };
    });
    document.getElementById('btn-done-training').onclick = () => { Audio.buttonClick(); onDone(); };
  },

  // ===== RECOVERY =====
  renderRecovery(gearloc, onChoice) {
    this.showScreen('recovery');
    const screen = this.screens.recovery;
    screen.innerHTML = `
      <h2 class="select-title">Recovery Phase</h2>
      <p class="select-subtitle" style="margin-bottom:1.5rem">Choose one action</p>
      <div class="recovery-options">
        <div class="recovery-card" data-choice="rest">
          <div class="recovery-icon">&#9829;</div>
          <div class="recovery-name">Rest</div>
          <div class="recovery-desc">Fully restore HP</div>
        </div>
        <div class="recovery-card" data-choice="search">
          <div class="recovery-icon">&#9734;</div>
          <div class="recovery-name">Search</div>
          <div class="recovery-desc">Find a random loot item</div>
        </div>
        <div class="recovery-card" data-choice="scout">
          <div class="recovery-icon">&#9788;</div>
          <div class="recovery-name">Scout</div>
          <div class="recovery-desc">Gain 1 Progress Point</div>
        </div>
      </div>
    `;

    screen.querySelectorAll('.recovery-card').forEach(card => {
      card.onclick = () => { Audio.buttonClick(); onChoice(card.dataset.choice); };
    });
  },

  // ===== REWARD =====
  renderReward(rewards, onContinue) {
    this.showScreen('reward');
    const screen = this.screens.reward;

    let itemsHTML = '';
    for (const r of rewards) {
      itemsHTML += `<div class="reward-item"><div class="reward-item-name">${r.name || r.type}</div><div class="reward-item-desc">${r.desc || ''}</div></div>`;
    }

    screen.innerHTML = `
      <div class="reward-container">
        <div class="reward-title">Rewards!</div>
        <div class="reward-items">${itemsHTML}</div>
        <button class="btn btn-primary" id="btn-claim-reward">Continue</button>
      </div>
    `;

    document.getElementById('btn-claim-reward').onclick = () => { Audio.buttonClick(); onContinue(); };
  },

  // ===== WIN / LOSE =====
  renderWin(state) {
    this.showScreen('win');
    Audio.victory();
    const screen = this.screens.win;
    screen.innerHTML = `
      <div class="end-title victory">VICTORY!</div>
      <div class="end-subtitle">${state.gearloc.name} has defeated ${Config.TYRANTS[state.tyrantKey].name}!</div>
      <div class="end-stats">
        <p>Days Survived: ${state.day}</p>
        <p>Progress Points: ${state.progressPoints}</p>
        <p>Skills Unlocked: ${state.gearloc.unlockedSkills.length}</p>
        <p>Remaining HP: ${state.gearloc.hp} / ${state.gearloc.maxHp}</p>
      </div>
      <button class="btn btn-primary" id="btn-play-again">Play Again</button>
    `;
    document.getElementById('btn-play-again').onclick = () => { Audio.buttonClick(); Game.init(); };
  },

  renderLose(state, reason) {
    this.showScreen('lose');
    Audio.defeat();
    const screen = this.screens.lose;
    screen.innerHTML = `
      <div class="end-title defeat">DEFEAT</div>
      <div class="end-subtitle">${reason || `${state.gearloc.name} has fallen...`}</div>
      <div class="end-stats">
        <p>Days Survived: ${state.day}</p>
        <p>Progress Points: ${state.progressPoints}</p>
        <p>Skills Unlocked: ${state.gearloc.unlockedSkills.length}</p>
      </div>
      <button class="btn btn-primary" id="btn-play-again">Play Again</button>
    `;
    document.getElementById('btn-play-again').onclick = () => { Audio.buttonClick(); Game.init(); };
  },

  // ===== MODAL =====
  showModal(title, body, buttons = []) {
    const overlay = this.modal;
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-title">${title}</div>
        <div class="modal-body">${body}</div>
        <div class="modal-buttons">
          ${buttons.map((b, i) => `<button class="btn ${b.primary ? 'btn-primary' : ''} btn-small" data-btn="${i}">${b.text}</button>`).join('')}
        </div>
      </div>
    `;
    overlay.classList.add('active');

    buttons.forEach((b, i) => {
      overlay.querySelector(`[data-btn="${i}"]`).onclick = () => {
        this.hideModal();
        if (b.action) b.action();
      };
    });
  },

  hideModal() {
    this.modal.classList.remove('active');
  },

  // ===== SCREEN SHAKE =====
  screenShake() {
    const container = document.getElementById('game-container');
    container.classList.add('screen-shake');
    setTimeout(() => container.classList.remove('screen-shake'), 300);
  },

  // ===== FLOATING NUMBER =====
  floatingNumber(x, y, value, type = 'damage') {
    const el = document.createElement('div');
    el.className = `floating-number ${type}`;
    el.textContent = type === 'damage' ? `-${value}` : `+${value}`;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }
};
