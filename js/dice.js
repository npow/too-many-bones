// dice.js - Dice rolling, animation, allocation

const Dice = {
  // Roll a single die from a face definition array
  rollDie(faces) {
    const idx = Utils.randInt(0, faces.length - 1);
    return { ...faces[idx], faceIndex: idx };
  },

  // Roll multiple dice
  rollMultiple(faces, count) {
    const results = [];
    for (let i = 0; i < count; i++) {
      results.push(this.rollDie(faces));
    }
    return results;
  },

  // Roll all dice for a gearloc's turn
  rollGearlocDice(gearloc) {
    const atk = this.rollMultiple(Config.DICE.ATTACK, gearloc.atk + (gearloc.tempBonuses.atk || 0));
    const def = this.rollMultiple(Config.DICE.DEFENSE, gearloc.def + (gearloc.tempBonuses.def || 0));
    const dex = this.rollMultiple(Config.DICE.DEXTERITY, gearloc.dex + (gearloc.tempBonuses.dex || 0));

    return {
      attack: atk.map((d, i) => ({ ...d, id: `atk_${i}`, category: 'attack', allocated: false })),
      defense: def.map((d, i) => ({ ...d, id: `def_${i}`, category: 'defense', allocated: false })),
      dexterity: dex.map((d, i) => ({ ...d, id: `dex_${i}`, category: 'dexterity', allocated: false }))
    };
  },

  // Roll attack dice for a baddie
  rollBaddieAttack(baddie) {
    // Baddies have fixed ATK, simulated as single roll
    const totalAtk = baddie.atk;
    return totalAtk;
  },

  // Sum attack dice results
  sumAttack(diceResults, bonuses = 0) {
    let total = 0;
    for (const d of diceResults) {
      if (d.type === 'sword') {
        total += d.value + bonuses;
      }
    }
    return Math.max(0, total);
  },

  // Sum defense dice results
  sumDefense(diceResults, bonuses = 0) {
    let total = 0;
    for (const d of diceResults) {
      if (d.type === 'shield') {
        total += d.value + bonuses;
      }
    }
    return Math.max(0, total);
  },

  // Sum dex dice results
  sumDex(diceResults) {
    let total = 0;
    for (const d of diceResults) {
      if (d.type === 'dex') {
        total += d.value;
      }
    }
    return total;
  },

  // Count bones
  countBones(allDice) {
    let count = 0;
    const all = [...(allDice.attack || []), ...(allDice.defense || []), ...(allDice.dexterity || [])];
    for (const d of all) {
      if (d.type === 'bones') count += d.value;
    }
    return count;
  },

  // Get all bones dice
  getBones(allDice) {
    const all = [...(allDice.attack || []), ...(allDice.defense || []), ...(allDice.dexterity || [])];
    return all.filter(d => d.type === 'bones');
  },

  // Animate dice roll (returns promise, triggers UI animation)
  async animateRoll(diceElements, results) {
    Audio.diceRoll();

    // Add rolling class
    diceElements.forEach(el => el.classList.add('rolling'));

    // Wait for animation
    await Utils.wait(600);

    // Remove rolling, show results
    diceElements.forEach((el, i) => {
      el.classList.remove('rolling');
      if (results[i]) {
        Dice.updateDieElement(el, results[i]);
      }
    });

    Audio.diceResult();
    await Utils.wait(200);
  },

  // Create a die DOM element
  createDieElement(result, category) {
    const el = document.createElement('div');
    el.className = `die ${this.getDieClass(result, category)}`;
    el.dataset.id = result.id || '';
    el.dataset.category = category || result.category || '';
    this.updateDieElement(el, result);
    return el;
  },

  // Update die element content
  updateDieElement(el, result) {
    el.innerHTML = '';
    const valEl = document.createElement('span');
    valEl.className = 'die-value';
    valEl.textContent = this.getDieSymbol(result);
    el.appendChild(valEl);

    const typeEl = document.createElement('span');
    typeEl.className = 'die-type-icon';
    typeEl.textContent = this.getDieTypeLabel(result);
    el.appendChild(typeEl);
  },

  getDieClass(result, category) {
    if (result.type === 'bones') return 'bone-die';
    switch (category || result.category) {
      case 'attack': return 'attack-die';
      case 'defense': return 'defense-die';
      case 'dexterity': return 'dex-die';
      case 'skill': return 'skill-die';
      default: return '';
    }
  },

  getDieSymbol(result) {
    switch (result.type) {
      case 'sword': return result.value;
      case 'shield': return result.value;
      case 'dex': return result.value;
      case 'bones': return '\u2620';  // ☠ skull
      default: return result.value;
    }
  },

  getDieTypeLabel(result) {
    switch (result.type) {
      case 'sword': return 'ATK';
      case 'shield': return 'DEF';
      case 'dex': return 'DEX';
      case 'bones': return '';
      default: return '';
    }
  },

  // Perform a skill check: roll N dex dice, sum dex faces
  skillCheck(stat, count) {
    let faces;
    switch (stat) {
      case 'dex': faces = Config.DICE.DEXTERITY; break;
      case 'atk': faces = Config.DICE.ATTACK; break;
      case 'def': faces = Config.DICE.DEFENSE; break;
      default: faces = Config.DICE.DEXTERITY;
    }
    const results = this.rollMultiple(faces, count);
    let total = 0;
    for (const r of results) {
      if (r.type !== 'bones') total += r.value;
    }
    return { results, total };
  }
};
