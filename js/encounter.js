// encounter.js - Encounter card system, choices, rewards

const Encounter = {
  // Initialize encounter deck (shuffle all encounters)
  initDeck() {
    const deck = Utils.shuffle([...Config.ENCOUNTERS]);
    State.set('encounterDeck', deck);
    return deck;
  },

  // Draw next encounter
  draw() {
    const state = State.get();
    let deck = state.encounterDeck;

    if (deck.length === 0) {
      deck = this.initDeck();
    }

    const encounter = deck.shift();
    State.set('encounterDeck', deck);
    State.set('encounter', { current: encounter, choice: null, resolved: false });
    return encounter;
  },

  // Resolve a choice
  resolveChoice(choiceIndex) {
    const state = State.get();
    const encounter = state.encounter.current;
    const choice = encounter.choices[choiceIndex];
    const gearloc = state.gearloc;

    const result = {
      type: choice.type,
      success: true,
      rewards: [],
      penalties: [],
      triggerBattle: false,
      baddies: null,
      message: ''
    };

    switch (choice.type) {
      case 'battle':
        result.triggerBattle = true;
        result.baddies = choice.baddies;
        result.progress = choice.progress || 0;
        result.bonusReward = choice.bonusReward || null;
        result.message = 'Prepare for battle!';
        break;

      case 'reward':
        this._applyReward(choice.reward, gearloc, result);
        break;

      case 'skill_check': {
        const stat = choice.stat;
        const dc = choice.dc;
        const statVal = gearloc[stat] || 1;
        const check = Dice.skillCheck(stat, statVal);

        result.skillCheck = {
          stat,
          dc,
          rolled: check.total,
          dice: check.results,
          success: check.total >= dc
        };

        if (check.total >= dc) {
          result.success = true;
          result.message = `Skill check passed! (${check.total} vs DC ${dc})`;
          if (choice.successReward) {
            this._applyReward(choice.successReward, gearloc, result);
          }
        } else {
          result.success = false;
          result.message = `Skill check failed! (${check.total} vs DC ${dc})`;
          if (choice.failResult) {
            this._applyPenalty(choice.failResult, gearloc, result);
          }
        }
        break;
      }

      case 'cost': {
        if (choice.cost.type === 'loot' && gearloc.loot.length >= choice.cost.value) {
          gearloc.loot.splice(0, choice.cost.value);
          if (choice.reward) {
            this._applyReward(choice.reward, gearloc, result);
          }
          result.message = `Paid ${choice.cost.value} loot.`;
        } else {
          result.success = false;
          result.message = 'Not enough loot to pay!';
        }
        break;
      }
    }

    State.update(s => {
      s.encounter.choice = choiceIndex;
      s.encounter.resolved = true;
      s.encounter.result = result;
    });

    return result;
  },

  _applyReward(reward, gearloc, result) {
    switch (reward.type) {
      case 'heal': {
        const healed = Math.min(reward.value, gearloc.maxHp - gearloc.hp);
        gearloc.hp += healed;
        result.rewards.push({ type: 'heal', value: healed });
        result.message = `Healed ${healed} HP!`;
        Audio.heal();
        break;
      }
      case 'healFull': {
        const healed = gearloc.maxHp - gearloc.hp;
        gearloc.hp = gearloc.maxHp;
        result.rewards.push({ type: 'heal', value: healed });
        result.message = `Fully healed!`;
        Audio.heal();
        break;
      }
      case 'loot': {
        const lootItems = this._drawLoot(reward.value);
        for (const item of lootItems) {
          gearloc.loot.push(item);
        }
        result.rewards.push({ type: 'loot', items: lootItems });
        result.message = `Found ${lootItems.map(l => l.name).join(', ')}!`;
        Audio.encounter();
        break;
      }
      case 'training': {
        State.update(s => { s.training.points += reward.value; });
        result.rewards.push({ type: 'training', value: reward.value });
        result.message = `Gained ${reward.value} Training Point${reward.value > 1 ? 's' : ''}!`;
        Audio.encounter();
        break;
      }
      case 'progress': {
        State.update(s => { s.progressPoints += reward.value; });
        result.rewards.push({ type: 'progress', value: reward.value });
        result.message = `Gained ${reward.value} Progress Point${reward.value > 1 ? 's' : ''}!`;
        Audio.encounter();
        break;
      }
      case 'nothing':
        result.message = 'Nothing happens.';
        break;
    }
  },

  _applyPenalty(penalty, gearloc, result) {
    switch (penalty.type) {
      case 'damage': {
        gearloc.hp -= penalty.value;
        result.penalties.push({ type: 'damage', value: penalty.value });
        result.message += ` Took ${penalty.value} damage!`;
        if (gearloc.hp <= 0) gearloc.hp = 1; // Don't die from encounters
        Audio.hit();
        break;
      }
      case 'poison': {
        gearloc.statusEffects.push({ type: 'poison', value: penalty.value, duration: penalty.duration });
        result.penalties.push({ type: 'poison' });
        result.message += ' Got poisoned!';
        Audio.poison();
        break;
      }
    }
  },

  _drawLoot(count) {
    const state = State.get();
    let lootDeck = state.lootDeck;
    if (!lootDeck || lootDeck.length < count) {
      lootDeck = Utils.shuffle([...Config.LOOT]);
      State.set('lootDeck', lootDeck);
    }
    const drawn = [];
    for (let i = 0; i < count; i++) {
      if (lootDeck.length > 0) {
        drawn.push(lootDeck.shift());
      }
    }
    State.set('lootDeck', lootDeck);
    return drawn;
  },

  // Apply loot item effect
  useLoot(lootIndex, gearloc, battle) {
    const item = gearloc.loot[lootIndex];
    if (!item) return { success: false, msg: 'No item' };

    let msg = '';
    switch (item.effect.type) {
      case 'heal':
        const healed = Math.min(item.effect.value, gearloc.maxHp - gearloc.hp);
        gearloc.hp += healed;
        msg = `Used ${item.name}: Healed ${healed} HP!`;
        Audio.heal();
        break;
      case 'damage':
        msg = `Used ${item.name}: Select a target for ${item.effect.value} damage.`;
        return { success: true, msg, needsTarget: true, damage: item.effect.value, lootIndex };
      case 'training':
        State.update(s => { s.training.points += item.effect.value; });
        msg = `Used ${item.name}: Gained ${item.effect.value} Training Points!`;
        break;
      case 'maxHpBoost':
        gearloc.maxHp += item.effect.value;
        gearloc.hp += item.effect.value;
        msg = `Used ${item.name}: +${item.effect.value} Max HP!`;
        break;
      case 'tempAtk':
        gearloc.tempBonuses.atk = (gearloc.tempBonuses.atk || 0) + item.effect.value;
        msg = `Used ${item.name}: +${item.effect.value} ATK this battle!`;
        break;
      case 'tempDef':
        gearloc.tempBonuses.def = (gearloc.tempBonuses.def || 0) + item.effect.value;
        msg = `Used ${item.name}: +${item.effect.value} DEF this battle!`;
        break;
      case 'tempDex':
        gearloc.tempBonuses.dex = (gearloc.tempBonuses.dex || 0) + item.effect.value;
        msg = `Used ${item.name}: +${item.effect.value} DEX this battle!`;
        break;
      case 'atkBonus':
        gearloc.tempBonuses.atkBonus = (gearloc.tempBonuses.atkBonus || 0) + item.effect.value;
        msg = `Used ${item.name}: +${item.effect.value} to all attack rolls!`;
        break;
      case 'rageTonic':
        if (gearloc.key === 'tantrum') {
          gearloc.rage = (gearloc.rage || 0) + item.effect.value;
          msg = `Used ${item.name}: Gained ${item.effect.value} Rage!`;
        } else {
          gearloc.tempBonuses.atk = (gearloc.tempBonuses.atk || 0) + item.effect.value;
          msg = `Used ${item.name}: +${item.effect.value} ATK this battle!`;
        }
        break;
      default:
        msg = `Used ${item.name}!`;
    }

    // Remove consumable
    if (item.type === 'consumable') {
      gearloc.loot.splice(lootIndex, 1);
    }

    State.log(msg);
    return { success: true, msg };
  }
};
