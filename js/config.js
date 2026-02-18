// config.js - Game data: gearlocs, baddies, encounters, tyrants, loot

const Config = {
  GRID_ROWS: 4,
  GRID_COLS: 4,
  MAX_ON_MAT: 7,
  MAX_BACKUP_PLAN: 4,

  PHASES: {
    TITLE_SCREEN: 'TITLE_SCREEN',
    CHARACTER_SELECT: 'CHARACTER_SELECT',
    DAY_START: 'DAY_START',
    ENCOUNTER: 'ENCOUNTER',
    BATTLE_SETUP: 'BATTLE_SETUP',
    BATTLE: 'BATTLE',
    BATTLE_END: 'BATTLE_END',
    REWARD: 'REWARD',
    TRAINING: 'TRAINING',
    RECOVERY: 'RECOVERY',
    TYRANT_BATTLE: 'TYRANT_BATTLE',
    GAME_WIN: 'GAME_WIN',
    GAME_LOSE: 'GAME_LOSE'
  },

  // Die face definitions
  DICE: {
    ATTACK: [
      { type: 'sword', value: 1 },
      { type: 'sword', value: 1 },
      { type: 'sword', value: 1 },
      { type: 'sword', value: 1 },
      { type: 'sword', value: 2 },
      { type: 'bones', value: 1 }
    ],
    DEFENSE: [
      { type: 'shield', value: 1 },
      { type: 'shield', value: 1 },
      { type: 'shield', value: 1 },
      { type: 'shield', value: 2 },
      { type: 'shield', value: 3 },
      { type: 'bones', value: 1 }
    ],
    DEXTERITY: [
      { type: 'dex', value: 1 },
      { type: 'dex', value: 1 },
      { type: 'dex', value: 1 },
      { type: 'dex', value: 2 },
      { type: 'dex', value: 2 },
      { type: 'bones', value: 1 }
    ]
  },

  GEARLOCS: {
    patches: {
      name: 'Patches',
      role: 'Healer / Toxin Specialist',
      flavor: 'A brilliant but unhinged medic who weaponizes toxins and heals allies with questionable potions.',
      hp: 6, maxHp: 6,
      atk: 1, def: 2, dex: 3,
      innate: 'Toxic Coating',
      innateDesc: 'Once per round, add Poison to one attack. Poisoned baddies take 1 damage at start of their turn.',
      color: '#4CAF50',
      chipColor: '#2E7D32',
      skills: [
        { id: 'medpack', name: 'Med Pack', cost: 1, type: 'active', desc: 'Heal 3 HP', effect: { type: 'heal', value: 3 }, dice: null },
        { id: 'toxin1', name: 'Mild Toxin', cost: 1, type: 'active', desc: 'Apply Poison (1 dmg/turn for 2 turns)', effect: { type: 'poison', value: 1, duration: 2 }, dice: null },
        { id: 'antidote', name: 'Antidote', cost: 2, type: 'active', desc: 'Remove all status effects from self', effect: { type: 'cleanse' }, dice: null },
        { id: 'toxin2', name: 'Potent Toxin', cost: 2, type: 'active', desc: 'Apply Poison (2 dmg/turn for 3 turns)', effect: { type: 'poison', value: 2, duration: 3 }, dice: null },
        { id: 'transfusion', name: 'Transfusion', cost: 3, type: 'active', desc: 'Spend 2 HP to deal 4 damage', effect: { type: 'selfDmgDeal', selfDmg: 2, dmg: 4 }, dice: null },
        { id: 'plague', name: 'Plague', cost: 3, type: 'active', desc: 'Poison all baddies on mat (1 dmg/turn, 2 turns)', effect: { type: 'poisonAll', value: 1, duration: 2 }, dice: null },
        { id: 'surgicalprecision', name: 'Surgical Precision', cost: 4, type: 'passive', desc: '+1 to all Attack dice results', effect: { type: 'atkBonus', value: 1 }, dice: null },
        { id: 'pandemicstrike', name: 'Pandemic Strike', cost: 5, type: 'active', desc: 'Deal 3 damage to all baddies', effect: { type: 'damageAll', value: 3 }, dice: null }
      ],
      backupPlanEffect: { type: 'heal', value: 2, desc: 'Heal 2 HP' }
    },
    boomer: {
      name: 'Boomer',
      role: 'Ranged Demolitions Expert',
      flavor: 'Loves explosions a bit too much. Crafts bombs mid-battle and lobs them across the mat.',
      hp: 5, maxHp: 5,
      atk: 2, def: 1, dex: 3,
      innate: 'Bomb Craft',
      innateDesc: 'At start of each round, gain 1 Bomb token. Spend Bombs as bonus ranged attacks (2 dmg, any target on mat).',
      color: '#FF5722',
      chipColor: '#BF360C',
      skills: [
        { id: 'fraggrenade', name: 'Frag Grenade', cost: 1, type: 'active', desc: 'Deal 2 damage to target and adjacent baddies', effect: { type: 'aoe', value: 2 }, dice: null },
        { id: 'flashbang', name: 'Flashbang', cost: 1, type: 'active', desc: 'Stun target baddie for 1 turn', effect: { type: 'stun', duration: 1 }, dice: null },
        { id: 'demolish', name: 'Demolish', cost: 2, type: 'active', desc: 'Deal 4 damage to single target', effect: { type: 'damage', value: 4 }, dice: null },
        { id: 'clusterbomb', name: 'Cluster Bomb', cost: 2, type: 'active', desc: 'Deal 1 damage to ALL baddies', effect: { type: 'damageAll', value: 1 }, dice: null },
        { id: 'incendiary', name: 'Incendiary', cost: 3, type: 'active', desc: 'Deal 2 damage and apply Burn (1 dmg/turn, 3 turns)', effect: { type: 'damageBurn', dmg: 2, burnDmg: 1, duration: 3 }, dice: null },
        { id: 'fortify', name: 'Fortify', cost: 3, type: 'active', desc: 'Gain +3 DEF until next turn', effect: { type: 'tempDef', value: 3 }, dice: null },
        { id: 'chainreaction', name: 'Chain Reaction', cost: 4, type: 'passive', desc: 'Bombs deal +1 damage', effect: { type: 'bombBonus', value: 1 }, dice: null },
        { id: 'megabomb', name: 'Mega Bomb', cost: 5, type: 'active', desc: 'Deal 5 damage to all baddies', effect: { type: 'damageAll', value: 5 }, dice: null }
      ],
      backupPlanEffect: { type: 'bomb', value: 1, desc: 'Gain 1 Bomb token' }
    },
    picket: {
      name: 'Picket',
      role: 'Tank / Shield Specialist',
      flavor: 'An immovable wall of armor and determination. The shield IS the weapon.',
      hp: 8, maxHp: 8,
      atk: 2, def: 3, dex: 1,
      innate: 'Shield Wall',
      innateDesc: 'At battle start, roll all DEF dice. Keep shields active for Round 1. Baddies must attack Picket if adjacent.',
      color: '#2196F3',
      chipColor: '#1565C0',
      skills: [
        { id: 'shieldbash', name: 'Shield Bash', cost: 1, type: 'active', desc: 'Deal damage equal to current DEF shields', effect: { type: 'shieldBash' }, dice: null },
        { id: 'taunt', name: 'Taunt', cost: 1, type: 'active', desc: 'All baddies must target Picket for 1 round', effect: { type: 'taunt', duration: 1 }, dice: null },
        { id: 'ironhide', name: 'Iron Hide', cost: 2, type: 'passive', desc: '+1 DEF permanently', effect: { type: 'statBoost', stat: 'def', value: 1 }, dice: null },
        { id: 'bodyblock', name: 'Body Block', cost: 2, type: 'active', desc: 'Move to any space and block all movement through it', effect: { type: 'block' }, dice: null },
        { id: 'revenge', name: 'Revenge', cost: 3, type: 'passive', desc: 'When hit, deal 1 damage back to attacker', effect: { type: 'thorns', value: 1 }, dice: null },
        { id: 'unbreakable', name: 'Unbreakable', cost: 3, type: 'active', desc: 'Reduce next incoming damage to 0', effect: { type: 'invuln', duration: 1 }, dice: null },
        { id: 'fortresswall', name: 'Fortress Wall', cost: 4, type: 'passive', desc: 'Shield Wall rolls gain +2 to each die', effect: { type: 'shieldWallBonus', value: 2 }, dice: null },
        { id: 'juggernaut', name: 'Juggernaut', cost: 5, type: 'active', desc: 'Deal 3 damage to all adjacent baddies and push them back 1', effect: { type: 'aoePush', dmg: 3 }, dice: null }
      ],
      backupPlanEffect: { type: 'shieldBash', desc: 'Shield Bash: deal DEF as damage' }
    },
    tantrum: {
      name: 'Tantrum',
      role: 'Berserker / Melee DPS',
      flavor: 'Gets angrier as the fight goes on. Pain is fuel. Rage is power.',
      hp: 7, maxHp: 7,
      atk: 3, def: 1, dex: 2,
      innate: 'Rage',
      innateDesc: 'Gain 1 Rage when taking damage. Each Rage adds +1 to all Attack dice. Rage resets at battle end.',
      color: '#F44336',
      chipColor: '#B71C1C',
      skills: [
        { id: 'recklessstrike', name: 'Reckless Strike', cost: 1, type: 'active', desc: 'Deal ATK+2 damage but take 1 damage', effect: { type: 'reckless', bonusDmg: 2, selfDmg: 1 }, dice: null },
        { id: 'bloodlust', name: 'Bloodlust', cost: 1, type: 'passive', desc: 'Heal 1 HP when killing a baddie', effect: { type: 'lifeOnKill', value: 1 }, dice: null },
        { id: 'bodycount', name: 'Body Count', cost: 2, type: 'passive', desc: '+1 ATK for each baddie killed this battle', effect: { type: 'killStacks' }, dice: null },
        { id: 'charge', name: 'Charge', cost: 2, type: 'active', desc: 'Move up to 3 spaces and deal 2 damage to target', effect: { type: 'charge', move: 3, dmg: 2 }, dice: null },
        { id: 'battlecry', name: 'Battle Cry', cost: 3, type: 'active', desc: 'Stun all adjacent baddies for 1 turn', effect: { type: 'aoeStun', duration: 1 }, dice: null },
        { id: 'berserkerrage', name: 'Berserker Rage', cost: 3, type: 'active', desc: 'Double current Rage bonus for 1 round', effect: { type: 'doubleRage', duration: 1 }, dice: null },
        { id: 'hornofzerker', name: "Horn o' the Zerker", cost: 4, type: 'active', desc: 'Gain 3 Rage immediately', effect: { type: 'gainRage', value: 3 }, dice: null },
        { id: 'unstoppable', name: 'Unstoppable', cost: 5, type: 'active', desc: 'Attack every baddie on the mat for ATK damage', effect: { type: 'attackAll' }, dice: null }
      ],
      backupPlanEffect: { type: 'rage', value: 1, desc: 'Gain 1 Rage' }
    }
  },

  BADDIES: {
    // 1-point baddies
    goblin: { name: 'Goblin', points: 1, hp: 2, atk: 1, def: 0, init: 3, type: 'melee', color: '#8BC34A', skills: [] },
    rat: { name: 'Giant Rat', points: 1, hp: 1, atk: 1, def: 0, init: 5, type: 'melee', color: '#795548', skills: [] },
    skeleton: { name: 'Skeleton', points: 1, hp: 3, atk: 1, def: 1, init: 2, type: 'melee', color: '#BDBDBD', skills: [] },
    imp: { name: 'Imp', points: 1, hp: 2, atk: 2, def: 0, init: 4, type: 'ranged', range: 2, color: '#E91E63', skills: [] },
    slime: { name: 'Slime', points: 1, hp: 4, atk: 0, def: 0, init: 1, type: 'melee', color: '#00BCD4', skills: [{ type: 'poison', value: 1, duration: 1, desc: 'Toxic Touch: applies Poison on hit' }] },

    // 5-point baddies
    orc: { name: 'Orc Warrior', points: 5, hp: 6, atk: 3, def: 1, init: 3, type: 'melee', color: '#4CAF50', skills: [] },
    archer: { name: 'Dark Archer', points: 5, hp: 4, atk: 3, def: 0, init: 4, type: 'ranged', range: 3, color: '#607D8B', skills: [] },
    shaman: { name: 'Goblin Shaman', points: 5, hp: 5, atk: 1, def: 1, init: 2, type: 'ranged', range: 2, color: '#9C27B0', skills: [{ type: 'heal', value: 2, desc: 'Dark Heal: heals an ally for 2 HP per turn' }] },
    brute: { name: 'Brute', points: 5, hp: 8, atk: 2, def: 2, init: 1, type: 'melee', color: '#3E2723', skills: [] },
    assassin: { name: 'Shadow Assassin', points: 5, hp: 3, atk: 4, def: 0, init: 6, type: 'melee', color: '#37474F', skills: [{ type: 'backstab', value: 2, desc: 'Backstab: +2 damage if attacking from behind' }] },

    // 20-point baddies
    dragon: { name: 'Young Dragon', points: 20, hp: 15, atk: 5, def: 3, init: 4, type: 'ranged', range: 3, color: '#FF6F00', skills: [{ type: 'fireBreath', value: 3, desc: 'Fire Breath: deal 3 damage to all units in a row' }] },
    golem: { name: 'Stone Golem', points: 20, hp: 20, atk: 4, def: 5, init: 1, type: 'melee', color: '#455A64', skills: [{ type: 'quake', value: 2, desc: 'Quake: deal 2 damage to all adjacent units' }] },
  },

  TYRANTS: {
    nom: {
      name: 'Nom',
      title: 'The Insatiable',
      desc: 'A massive beast that devours everything in its path. Grows stronger each day it feeds.',
      hp: 25, atk: 4, def: 3, init: 3,
      maxDays: 6,
      requiredProgress: 4,
      type: 'melee',
      color: '#E65100',
      chipColor: '#BF360C',
      abilities: [
        { name: 'Devour', trigger: 'active', desc: 'Deal 5 damage and heal for amount dealt', effect: { type: 'devour', dmg: 5 } },
        { name: 'Summon Minions', trigger: 'round_start', desc: 'Spawn a 1pt baddie each round', effect: { type: 'spawn', points: 1 } }
      ],
      spawns: ['goblin', 'rat', 'slime']
    },
    goblinKing: {
      name: 'Goblin King',
      title: 'Lord of the Horde',
      desc: 'Commands endless goblin waves. Alone he is weak, but he is never alone.',
      hp: 18, atk: 3, def: 2, init: 4,
      maxDays: 7,
      requiredProgress: 5,
      type: 'melee',
      color: '#33691E',
      chipColor: '#1B5E20',
      abilities: [
        { name: 'Rally Horde', trigger: 'round_start', desc: 'Spawn two 1pt baddies each round', effect: { type: 'spawn', points: 2 } },
        { name: 'Royal Guard', trigger: 'passive', desc: 'Takes half damage while minions are alive', effect: { type: 'damageReduction', factor: 0.5, condition: 'minionsAlive' } }
      ],
      spawns: ['goblin', 'goblin', 'imp', 'skeleton']
    },
    mulmesh: {
      name: 'Mulmesh',
      title: 'The Relentless',
      desc: 'A towering juggernaut of bone and rage. Slow but devastating, with attacks that shake the ground.',
      hp: 30, atk: 6, def: 4, init: 1,
      maxDays: 8,
      requiredProgress: 6,
      type: 'melee',
      color: '#4A148C',
      chipColor: '#311B92',
      abilities: [
        { name: 'Ground Slam', trigger: 'active', desc: 'Deal 3 damage to ALL units on the mat', effect: { type: 'damageAll', value: 3 } },
        { name: 'Bone Armor', trigger: 'passive', desc: 'Regenerate 1 DEF at the start of each round', effect: { type: 'regenDef', value: 1 } }
      ],
      spawns: ['skeleton', 'brute']
    }
  },

  ENCOUNTERS: [
    {
      id: 'e1', title: 'Goblin Ambush',
      text: 'A band of goblins blocks the forest path, brandishing crude weapons and snarling.',
      choices: [
        { text: 'Fight through them', type: 'battle', baddies: ['goblin', 'goblin', 'imp'], progress: 1 },
        { text: 'Sneak around via the ravine', type: 'skill_check', stat: 'dex', dc: 3, successReward: { type: 'progress', value: 1 }, failResult: { type: 'damage', value: 2 } }
      ]
    },
    {
      id: 'e2', title: 'Merchant Caravan',
      text: 'A traveling merchant offers rare wares, but bandits eye the caravan from the hills.',
      choices: [
        { text: 'Trade with the merchant', type: 'reward', reward: { type: 'loot', value: 1 } },
        { text: 'Guard the caravan', type: 'battle', baddies: ['assassin', 'goblin'], progress: 1, bonusReward: { type: 'loot', value: 1 } }
      ]
    },
    {
      id: 'e3', title: 'Mysterious Shrine',
      text: 'An ancient shrine pulses with faint energy. Runes along its base glow invitingly.',
      choices: [
        { text: 'Pray at the shrine', type: 'reward', reward: { type: 'heal', value: 3 } },
        { text: 'Study the runes', type: 'reward', reward: { type: 'training', value: 1 } }
      ]
    },
    {
      id: 'e4', title: 'Bridge Troll',
      text: 'A massive troll guards the only bridge across a deep chasm. It demands tribute.',
      choices: [
        { text: 'Pay the troll (lose 1 loot)', type: 'cost', cost: { type: 'loot', value: 1 }, reward: { type: 'progress', value: 1 } },
        { text: 'Challenge the troll', type: 'battle', baddies: ['brute'], progress: 1 }
      ]
    },
    {
      id: 'e5', title: 'Abandoned Camp',
      text: 'A recently abandoned campsite. Supplies are scattered among the remains.',
      choices: [
        { text: 'Search the supplies', type: 'reward', reward: { type: 'loot', value: 1 } },
        { text: 'Follow the tracks', type: 'battle', baddies: ['orc', 'goblin'], progress: 1, bonusReward: { type: 'training', value: 1 } }
      ]
    },
    {
      id: 'e6', title: 'Poisoned Spring',
      text: 'A once-clear spring now bubbles with dark corruption. Something taints the water.',
      choices: [
        { text: 'Purify the spring', type: 'skill_check', stat: 'dex', dc: 4, successReward: { type: 'healFull' }, failResult: { type: 'poison', value: 1, duration: 2 } },
        { text: 'Find another path', type: 'reward', reward: { type: 'progress', value: 1 } }
      ]
    },
    {
      id: 'e7', title: 'Undead Rising',
      text: 'The ground trembles as skeletal hands claw their way up from unmarked graves.',
      choices: [
        { text: 'Stand and fight', type: 'battle', baddies: ['skeleton', 'skeleton', 'skeleton'], progress: 1 },
        { text: 'Run for it', type: 'skill_check', stat: 'dex', dc: 3, successReward: { type: 'nothing' }, failResult: { type: 'damage', value: 3 } }
      ]
    },
    {
      id: 'e8', title: 'Traveling Healer',
      text: 'A wandering cleric offers aid to those who fight against the darkness.',
      choices: [
        { text: 'Accept healing', type: 'reward', reward: { type: 'heal', value: 4 } },
        { text: 'Ask for training', type: 'reward', reward: { type: 'training', value: 1 } }
      ]
    },
    {
      id: 'e9', title: 'Dark Cavern',
      text: 'A cave entrance beckons. Strange sounds echo from within, along with the glint of treasure.',
      choices: [
        { text: 'Explore the cave', type: 'battle', baddies: ['orc', 'shaman'], progress: 1, bonusReward: { type: 'loot', value: 1 } },
        { text: 'Camp at the entrance', type: 'reward', reward: { type: 'heal', value: 2 } }
      ]
    },
    {
      id: 'e10', title: 'Orc Warband',
      text: 'A warband of orcs marches toward the nearby village. They haven\'t noticed you yet.',
      choices: [
        { text: 'Ambush the warband', type: 'battle', baddies: ['orc', 'orc'], progress: 2 },
        { text: 'Warn the village', type: 'reward', reward: { type: 'progress', value: 1 } }
      ]
    },
    {
      id: 'e11', title: 'Enchanted Glade',
      text: 'Fireflies dance in a clearing of ancient trees. The air hums with magic.',
      choices: [
        { text: 'Rest in the glade', type: 'reward', reward: { type: 'healFull' } },
        { text: 'Channel the magic', type: 'skill_check', stat: 'atk', dc: 3, successReward: { type: 'training', value: 2 }, failResult: { type: 'damage', value: 2 } }
      ]
    },
    {
      id: 'e12', title: 'Trapped Chest',
      text: 'An ornate chest sits in the middle of a ruined hall. Almost certainly trapped.',
      choices: [
        { text: 'Disarm and open', type: 'skill_check', stat: 'dex', dc: 4, successReward: { type: 'loot', value: 2 }, failResult: { type: 'damage', value: 3 } },
        { text: 'Leave it alone', type: 'reward', reward: { type: 'nothing' } }
      ]
    },
    {
      id: 'e13', title: 'Rat Infestation',
      text: 'A cellar beneath the old inn swarms with oversized rodents. The innkeeper begs for help.',
      choices: [
        { text: 'Clear the cellar', type: 'battle', baddies: ['rat', 'rat', 'rat', 'slime'], progress: 1, bonusReward: { type: 'heal', value: 3 } },
        { text: 'Seal the entrance', type: 'reward', reward: { type: 'progress', value: 1 } }
      ]
    },
    {
      id: 'e14', title: 'Shadow Stalker',
      text: 'Something has been following you for miles. The shadows seem to move with purpose.',
      choices: [
        { text: 'Set an ambush', type: 'battle', baddies: ['assassin'], progress: 1 },
        { text: 'Travel through the night', type: 'skill_check', stat: 'dex', dc: 5, successReward: { type: 'progress', value: 1 }, failResult: { type: 'damage', value: 4 } }
      ]
    },
    {
      id: 'e15', title: 'Volcanic Vent',
      text: 'The ground is scorched and cracked. Geysers of flame erupt unpredictably.',
      choices: [
        { text: 'Navigate carefully', type: 'skill_check', stat: 'dex', dc: 4, successReward: { type: 'progress', value: 2 }, failResult: { type: 'damage', value: 3 } },
        { text: 'Find a safe detour', type: 'reward', reward: { type: 'nothing' } }
      ]
    },
    {
      id: 'e16', title: 'Dwarven Forge',
      text: 'An abandoned dwarven forge still glows with embers. Tools and materials lie scattered.',
      choices: [
        { text: 'Craft equipment', type: 'reward', reward: { type: 'loot', value: 1 } },
        { text: 'Study the techniques', type: 'reward', reward: { type: 'training', value: 1 } }
      ]
    },
    {
      id: 'e17', title: 'Dragon Sighting',
      text: 'A young dragon circles overhead. It seems wounded and disoriented, but still dangerous.',
      choices: [
        { text: 'Drive it away', type: 'battle', baddies: ['dragon'], progress: 3, bonusReward: { type: 'loot', value: 2 } },
        { text: 'Hide and wait', type: 'reward', reward: { type: 'nothing' } }
      ]
    },
    {
      id: 'e18', title: 'Bonfire of the Lost',
      text: 'Spirits gather around an ethereal bonfire. They whisper forgotten knowledge.',
      choices: [
        { text: 'Listen to the spirits', type: 'reward', reward: { type: 'training', value: 2 } },
        { text: 'Banish the spirits', type: 'battle', baddies: ['skeleton', 'shaman'], progress: 1 }
      ]
    }
  ],

  LOOT: [
    { id: 'l1', name: 'Health Potion', desc: 'Heal 3 HP', type: 'consumable', effect: { type: 'heal', value: 3 } },
    { id: 'l2', name: 'Bone Shield', desc: '+2 DEF for one battle', type: 'equipment', effect: { type: 'tempDef', value: 2 } },
    { id: 'l3', name: 'Lucky Charm', desc: 'Reroll one die per battle', type: 'equipment', effect: { type: 'reroll', uses: 1 } },
    { id: 'l4', name: 'Whetstone', desc: '+1 ATK for one battle', type: 'consumable', effect: { type: 'tempAtk', value: 1 } },
    { id: 'l5', name: 'Boots of Speed', desc: '+2 DEX for one battle', type: 'equipment', effect: { type: 'tempDex', value: 2 } },
    { id: 'l6', name: 'Bomb Satchel', desc: 'Deal 3 damage to any target', type: 'consumable', effect: { type: 'damage', value: 3 } },
    { id: 'l7', name: 'Bone Totem', desc: 'Start next battle with 2 Bones in Backup Plan', type: 'equipment', effect: { type: 'startBones', value: 2 } },
    { id: 'l8', name: 'War Paint', desc: '+1 to all attack rolls for one battle', type: 'consumable', effect: { type: 'atkBonus', value: 1 } },
    { id: 'l9', name: 'Ancient Rune', desc: 'Gain 2 Training Points', type: 'consumable', effect: { type: 'training', value: 2 } },
    { id: 'l10', name: 'Troll Hide Armor', desc: 'Regenerate 1 HP per round', type: 'equipment', effect: { type: 'regen', value: 1 } },
    { id: 'l11', name: 'Venom Blade', desc: 'Attacks apply Poison (1 dmg, 2 turns)', type: 'equipment', effect: { type: 'poisonOnHit', value: 1, duration: 2 } },
    { id: 'l12', name: 'Elixir of Fortitude', desc: '+3 Max HP permanently', type: 'consumable', effect: { type: 'maxHpBoost', value: 3 } },
    { id: 'l13', name: 'Bandage Kit', desc: 'Heal 5 HP', type: 'consumable', effect: { type: 'heal', value: 5 } },
    { id: 'l14', name: "Scout's Cloak", desc: 'Preview next encounter', type: 'equipment', effect: { type: 'scout' } },
    { id: 'l15', name: 'Rage Tonic', desc: 'Gain 2 Rage (Tantrum) or +2 ATK this battle (others)', type: 'consumable', effect: { type: 'rageTonic', value: 2 } }
  ]
};
