import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Types & Interfaces ---

type Team = 'left' | 'right';
type EntityType = 'knight' | 'giant' | 'archer' | 'skeleton' | 'dragon' | 'cannon' | 'wizard' | 'mini_pekka' | 'bats' | 'tower';
type CardType = 'knight' | 'giant' | 'archer' | 'skeleton_army' | 'dragon' | 'cannon' | 'wizard' | 'mini_pekka' | 'bats' | 'fireball' | 'log' | 'freeze';
type GameView = 'menu' | 'game' | 'credits';
type Difficulty = 'easy' | 'medium' | 'hard';
type WinnerType = Team | 'draw' | null;

interface CardStats {
  id: CardType;
  name: string;
  cost: number;
  icon: string;
  description: string;
  cooldown: number;
}

// --- DATA DEFINITIONS (MOVED TO TOP) ---

const CARDS: Record<CardType, CardStats> = {
  knight: { id: 'knight', name: 'Knight', cost: 3, icon: '⚔️', description: 'Melee mini-tank. Good stats for cost.', cooldown: 3000 },
  giant: { id: 'giant', name: 'Giant', cost: 5, icon: '💪', description: 'Ignores troops. Attacks buildings only.', cooldown: 5000 },
  archer: { id: 'archer', name: 'Archer', cost: 3, icon: '🏹', description: 'Ranged attackers. Good vs air.', cooldown: 3000 },
  skeleton_army: { id: 'skeleton_army', name: 'Skel Army', cost: 3, icon: '💀', description: 'Swarm of skeletons. Weak to splash.', cooldown: 6000 },
  bats: { id: 'bats', name: 'Bats', cost: 2, icon: '🦇', description: 'Fast flying swarm. Cheap cycle.', cooldown: 3000 },
  dragon: { id: 'dragon', name: 'Inf Dragon', cost: 4, icon: '🐲', description: 'Flying. Damage ramps up over time.', cooldown: 7000 },
  wizard: { id: 'wizard', name: 'Wizard', cost: 5, icon: '🧙‍♂️', description: 'Deals area damage (Splash).', cooldown: 5000 },
  mini_pekka: { id: 'mini_pekka', name: 'Mini P.E.K.K.A', cost: 4, icon: '🤖', description: 'High single target damage. Glass cannon.', cooldown: 4000 },
  cannon: { id: 'cannon', name: 'Cannon', cost: 3, icon: '💣', description: 'Defensive building. Distracts giants.', cooldown: 8000 },
  fireball: { id: 'fireball', name: 'Fireball', cost: 4, icon: '🔥', description: 'Spell. Deals area damage anywhere.', cooldown: 6000 },
  freeze: { id: 'freeze', name: 'Freeze', cost: 4, icon: '❄️', description: 'Spell. Freezes enemies for 4 seconds.', cooldown: 8000 },
  log: { id: 'log', name: 'The Log', cost: 2, icon: '🪵', description: 'Spell. Rolls and pushes back ground troops.', cooldown: 4000 },
};

const UNIT_KNOWLEDGE: Record<CardType, { tip: string; lore: string }> = {
    knight: {
        tip: "A cheap tank. Place him in front of Archers or Wizards to soak up damage while they deal the pain.",
        lore: "He has a magnificent mustache, but refuses to take off his helmet to show it. He smells like cheap cologne."
    },
    giant: {
        tip: "He ignores enemy troops to punch buildings. Use him as a meat shield to distract enemies while your other troops kill them!",
        lore: "He's actually a pacifist who just really, really hates architecture. He wants to return the world to nature."
    },
    archer: {
        tip: "Great vs air units and distractions. Split them behind your King Tower to defend both lanes at once!",
        lore: "Two sisters with pink hair. They constantly argue about whose aim is better, but they never miss lunch."
    },
    skeleton_army: {
        tip: "The ultimate tank killer! Surround a Giant or Mini P.E.K.K.A with these guys to melt them instantly. Watch out for Arrows!",
        lore: "Larry leads the pack. The other 14 skeletons are just his cousins named Harry, Barry, Gary, Jerry..."
    },
    bats: {
        tip: "Fast and cheap air cycle. Use them to distract an Inferno Dragon or chip down a Knight freely.",
        lore: "They screech at high frequencies. If you listen closely, they are actually complaining about the cave rent prices."
    },
    dragon: {
        tip: "Damage ramps up over time! Protect him for 4 seconds and he will melt through Giants and Towers like butter.",
        lore: "He wears a helmet because he's clumsy. His mom packed him a lunchbox that he keeps inside his armor."
    },
    wizard: {
        tip: "Deals splash damage! He is the best counter to Skeleton Army and Bats. Keep him behind a tank.",
        lore: "He controls fire with his hands but still can't toast a piece of bread without burning it. Show-off."
    },
    mini_pekka: {
        tip: "High damage glass cannon. He destroys Giants in 3 hits but gets distracted by Skeletons easily.",
        lore: "The armor is just for show. Inside, he is powered by a relentless, unending desire for pancakes."
    },
    cannon: {
        tip: "Pull building-targeters like Giants to the center of the arena so both your towers can shoot them!",
        lore: "It's a cannon on wheels, but the wheels are rusted shut. It hasn't moved since 2016."
    },
    fireball: {
        tip: "Knocks back units and deals area damage. Save it for when the enemy groups their Wizard and Archers together!",
        lore: "It's literally a ball of fire. It solves most problems. If it doesn't, use a bigger fireball."
    },
    freeze: {
        tip: "Surprise element! Freeze the enemy tower right when your Balloon or Army connects for massive damage.",
        lore: "It doesn't kill them, it just makes them really, really cold and awkward for 4 seconds."
    },
    log: {
        tip: "Pushes back all ground units. Use it to reset a charging Prince or clear a Skeleton Army instantly.",
        lore: "It was once a tree. Now it seeks revenge on everything that walks. It hates sawdust."
    }
};

// --- GEMINI API ---
const apiKey = ""; // Set by environment

const callGemini = async (prompt: string, systemPrompt: string) => {
    if (!apiKey) return null;
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] }
                }),
            }
        );
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e) {
        // console.error("Gemini API Error:", e);
        return null;
    }
};

// --- Audio System ---

const getAudioContext = () => {
    const win = window as any;
    if (!win.gameAudioContext) {
        const AudioContext = win.AudioContext || win.webkitAudioContext;
        if (AudioContext) {
            win.gameAudioContext = new AudioContext();
        }
    }
    return win.gameAudioContext;
};

// SFX Player
const playSound = (type: 'spawn' | 'attack' | 'explosion' | 'win' | 'lose' | 'log' | 'arrow' | 'freeze' | 'magic' | 'time' | 'squeak' | 'cannon' | 'full' | 'draw' | 'tiebreaker' | 'chat') => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    
    switch (type) {
      case 'spawn':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'full': 
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); 
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'chat': 
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'time':
        // SINGLE short alert
        osc.type = 'triangle'; 
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.3); 
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.35);
        break;
      case 'tiebreaker':
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now); // A5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1108, now); // C#6
        gain2.gain.setValueAtTime(0.08, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        osc.start(now); osc.stop(now + 1.5);
        osc2.start(now); osc2.stop(now + 1.5);
        break;
      case 'attack': 
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'arrow':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'cannon':
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'magic':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'squeak': 
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'explosion': 
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'freeze': 
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'log': 
        osc.type = 'square';
        osc.frequency.setValueAtTime(80, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.5);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'win':
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.setValueAtTime(600, now + 0.1);
        osc.frequency.setValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'lose':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'draw':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(300, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
    }
  } catch (e) {
    // console.error('Audio not supported');
  }
};

// --- Music System (Procedural) ---
const MusicEngine = {
    audioContext: null as AudioContext | null,
    isPlaying: false,
    intervalId: null as any,
    currentTrack: 'none' as 'menu' | 'game' | 'none',
    
    init() {
        this.audioContext = getAudioContext();
    },

    stop() {
        if (this.intervalId) clearInterval(this.intervalId);
        this.intervalId = null;
        this.isPlaying = false;
        this.currentTrack = 'none';
    },

    playMenuMusic() {
        if (this.currentTrack === 'menu' && this.isPlaying) return;
        this.stop();
        this.currentTrack = 'menu';
        this.isPlaying = true;
        
        let step = 0;
        const notes = [261.63, 329.63, 392.00, 493.88]; 
        
        this.intervalId = setInterval(() => {
            if (!this.audioContext || this.audioContext.state !== 'running') return;
            const now = this.audioContext.currentTime;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'triangle'; 
            const freq = notes[step % notes.length];
            const finalFreq = Math.random() > 0.8 ? freq * 2 : freq;
            
            osc.frequency.setValueAtTime(finalFreq, now);
            gain.gain.setValueAtTime(0.0, now);
            gain.gain.linearRampToValueAtTime(0.08, now + 0.1); 
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5); 
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(now);
            osc.stop(now + 1.5);
            
            step++;
        }, 600); 
    },

    playGameMusic() {
        if (this.currentTrack === 'game' && this.isPlaying) return;
        this.stop();
        this.currentTrack = 'game';
        this.isPlaying = true;

        let beat = 0;
        
        this.intervalId = setInterval(() => {
            if (!this.audioContext || this.audioContext.state !== 'running') return;
            const now = this.audioContext.currentTime;
            
            const isKick = beat % 4 === 0 || beat % 4 === 2.5; 
            const isTom = beat % 4 === 2;
            
            if (isKick || isTom) {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = isKick ? 'sine' : 'square';
                const baseFreq = isKick ? 60 : 80;
                
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.exponentialRampToValueAtTime(30, now + 0.2);
                
                gain.gain.setValueAtTime(0.15, now); 
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.start(now);
                osc.stop(now + 0.2);
            }
            
            const notes = [130.81, 155.56, 196.00, 130.81]; 
            const note = notes[Math.floor(beat) % 4];
            
            const synthOsc = this.audioContext.createOscillator();
            const synthGain = this.audioContext.createGain();
            synthOsc.type = 'triangle';
            synthOsc.frequency.setValueAtTime(note, now);
            
            synthGain.gain.setValueAtTime(0.05, now);
            synthGain.gain.linearRampToValueAtTime(0.02, now + 0.1);
            synthGain.gain.linearRampToValueAtTime(0, now + 0.2);
            
            synthOsc.connect(synthGain);
            synthGain.connect(this.audioContext.destination);
            synthOsc.start(now);
            synthOsc.stop(now + 0.2);
            
            beat += 0.5;
        }, 300); 
    }
};

interface BaseEntity {
  id: string;
  team: Team;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  damage: number;
  range: number;
  sightRange: number;
  attackCooldown: number;
  lastAttackTime: number;
  color: string;
  type: EntityType;
  cost?: number; 
  isFlying?: boolean;
  isBuilding?: boolean;
  targetId?: string | null;
  rampUpValue?: number;
  frozenUntil?: number; 
}

interface Unit extends BaseEntity {
  speed: number;
  state: 'moving' | 'attacking' | 'idle';
}

interface Tower extends BaseEntity {
  // Towers don't move
}

interface Projectile {
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  color: string;
  damage?: number;
  area?: boolean; 
  areaRadius?: number; 
  isLog?: boolean; 
  isArrow?: boolean; 
  isMagic?: boolean; 
  isCannonball?: boolean; 
  ownerTeam?: Team;
  hitIds?: string[];
  life?: number;
  targetId?: string;
  hitFlying?: boolean;
}

// --- Game Constants ---

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400; 
const LANE_Y = 300; 
const FLYING_Y = 200; 
const TOWER_HP = 3000; 
const MATCH_DURATION = 120; // 2 minutes
const DOUBLE_ELIXIR_TIME = 60; 

// --- Helper Functions ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const shuffleDeck = (deck: CardType[]) => {
    const d = [...deck];
    for (let i = d.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
};

const createUnit = (team: Team, type: EntityType, xPos?: number): Unit[] => {
  const isLeft = team === 'left';
  const baseX = xPos !== undefined ? xPos : (isLeft ? 100 : CANVAS_WIDTH - 100);
  const teamColor = isLeft ? '#3b82f6' : '#ef4444'; 
  
  // Assigned cost to stats so AI can read it
  let stats: Partial<Unit> = {
    width: 30, height: 30, hp: 100, maxHp: 100, damage: 10, range: 30, sightRange: 200, speed: 40, 
    attackCooldown: 1000, color: teamColor, isFlying: false, type: type, cost: 1
  };

  switch(type) {
    case 'knight':
      stats = { ...stats, width: 30, height: 40, hp: 750, maxHp: 750, damage: 80, speed: 50, range: 40, sightRange: 200, attackCooldown: 1200, cost: 3 };
      break;
    case 'giant':
      stats = { ...stats, width: 50, height: 70, hp: 2200, maxHp: 2200, damage: 140, speed: 30, range: 40, sightRange: 600, attackCooldown: 1500, cost: 5 };
      break;
    case 'archer':
      stats = { ...stats, width: 25, height: 35, hp: 200, maxHp: 200, damage: 45, range: 170, sightRange: 220, speed: 50, attackCooldown: 1000, cost: 3 };
      break;
    case 'skeleton':
      stats = { ...stats, width: 15, height: 20, hp: 50, maxHp: 50, damage: 40, range: 20, sightRange: 200, speed: 65, attackCooldown: 800, cost: 1 }; // Approx cost per unit in swarm
      break;
    case 'bats':
      stats = { ...stats, width: 20, height: 15, hp: 40, maxHp: 40, damage: 40, range: 20, sightRange: 200, speed: 85, isFlying: true, attackCooldown: 600, color: isLeft ? '#818cf8' : '#7f1d1d', cost: 1 }; 
      break;
    case 'dragon':
      stats = { ...stats, width: 40, height: 30, hp: 400, maxHp: 400, damage: 5, range: 110, sightRange: 200, speed: 45, isFlying: true, attackCooldown: 400, cost: 4 };
      break;
    case 'wizard':
      stats = { ...stats, width: 30, height: 40, hp: 350, maxHp: 350, damage: 130, range: 165, sightRange: 220, speed: 50, attackCooldown: 1400, color: isLeft ? '#6366f1' : '#b91c1c', cost: 5 };
      break;
    case 'mini_pekka':
      stats = { ...stats, width: 35, height: 35, hp: 650, maxHp: 650, damage: 350, range: 30, sightRange: 200, speed: 60, attackCooldown: 1600, color: isLeft ? '#0ea5e9' : '#dc2626', cost: 4 };
      break;
    case 'cannon':
      stats = { ...stats, width: 40, height: 40, hp: 700, maxHp: 700, damage: 70, range: 200, sightRange: 200, speed: 0, isBuilding: true, color: isLeft ? '#1e3a8a' : '#7f1d1d', attackCooldown: 900, cost: 3 };
      break;
  }

  const createSingle = (offsetX = 0, offsetY = 0): Unit => ({
    id: generateId(),
    team,
    type,
    x: baseX + offsetX,
    y: (stats.isFlying ? FLYING_Y : (stats.isBuilding ? LANE_Y - 10 : LANE_Y)) + offsetY,
    width: stats.width!,
    height: stats.height!,
    hp: stats.hp!,
    maxHp: stats.maxHp!,
    damage: stats.damage!,
    range: stats.range!,
    sightRange: stats.sightRange!,
    speed: stats.speed!,
    attackCooldown: stats.attackCooldown!,
    lastAttackTime: 0,
    color: stats.color!,
    state: 'moving',
    isFlying: stats.isFlying,
    isBuilding: stats.isBuilding,
    rampUpValue: 0,
    targetId: null,
    frozenUntil: 0,
    cost: stats.cost // Ensure cost is applied
  });

  if (type === 'skeleton') {
    return Array.from({ length: 7 }).map((_, i) => createSingle(i * -15)); 
  }
  if (type === 'bats') {
    return Array.from({ length: 5 }).map((_, i) => createSingle(i * -12, (i % 2 === 0 ? -10 : 10))); 
  }

  return [createSingle()];
};

const createTower = (team: Team): Tower => {
  const isLeft = team === 'left';
  return {
    id: `tower-${team}`,
    team,
    type: 'tower',
    x: isLeft ? 30 : CANVAS_WIDTH - 80,
    y: LANE_Y - 60,
    width: 50,
    height: 100,
    hp: TOWER_HP,
    maxHp: TOWER_HP,
    damage: 60, 
    range: 300, 
    sightRange: 300,
    attackCooldown: 800,
    lastAttackTime: 0,
    color: isLeft ? '#2563eb' : '#dc2626',
    targetId: null,
    frozenUntil: 0,
    cost: 0
  };
};

// --- Main Component ---

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  const unitsRef = useRef<Unit[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<{x: number, y: number, life: number, color: string, vx: number, vy: number}[]>([]);
  const starsRef = useRef<{x: number, y: number, alpha: number}[]>([]); 
  const cratersRef = useRef<{x: number, y: number, width: number, height: number}[]>([]);

  const [view, setView] = useState<GameView>('menu');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [winner, setWinner] = useState<WinnerType>(null);
  const [isMusicOn, setIsMusicOn] = useState(true);
  
  const [elixir, setElixir] = useState(0);
  
  const [timeRemaining, setTimeRemaining] = useState(MATCH_DURATION);
  const [doubleElixir, setDoubleElixir] = useState(false);
  const [isTiebreaker, setIsTiebreaker] = useState(false);
  
  const elixirFullSoundPlayedRef = useRef(false);
  const doubleElixirTriggeredRef = useRef(false); 
  const isGameOverRef = useRef(false); 

  // GEMINI CHATTER & RECAP STATE
  const [opponentMessage, setOpponentMessage] = useState<string | null>(null);
  const aiChatCooldownRef = useRef(0);
  
  // Strategy Tip & Lore State
  const [strategyTip, setStrategyTip] = useState<{tip: string, lore: string, cardName: string} | null>(null);
  const [isGeneratingTip, setIsGeneratingTip] = useState(false);
  
  const [battleRecap, setBattleRecap] = useState<string | null>(null); 

  // PLAYER DECK STATE
  const [hand, setHand] = useState<CardType[]>([]);
  const [nextCard, setNextCard] = useState<CardType>('wizard');
  const [drawPile, setDrawPile] = useState<CardType[]>([]);
  const [cardCooldowns, setCardCooldowns] = useState<Record<string, number>>({});
  
  // AI DECK STATE
  const aiStateRef = useRef({
      hand: [] as CardType[],
      nextCard: 'knight' as CardType,
      drawPile: [] as CardType[],
      elixir: 0, 
      timer: 0
  });

  const [draggingCard, setDraggingCard] = useState<CardType | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const gameStartRef = useRef<number>(0);

  // --- Music Effect (Auto Resume) ---
  useEffect(() => {
      MusicEngine.init();
      
      const resumeAudio = () => {
          const ctx = getAudioContext();
          if (ctx && ctx.state === 'suspended') {
              ctx.resume();
          }
      };
      
      window.addEventListener('click', resumeAudio);
      window.addEventListener('touchstart', resumeAudio);

      return () => {
          window.removeEventListener('click', resumeAudio);
          window.removeEventListener('touchstart', resumeAudio);
      };
  }, []);

  useEffect(() => {
      if (isMusicOn) {
          if (view === 'menu' || view === 'credits') MusicEngine.playMenuMusic();
          if (view === 'game') MusicEngine.playGameMusic();
      } else {
          MusicEngine.stop();
      }
      return () => {
          if (!isMusicOn) MusicEngine.stop();
      }
  }, [view, isMusicOn]);

  const toggleMusic = () => {
      setIsMusicOn(prev => !prev);
  };

  // --- Local Fallback Chat Logic ---
  const LOCAL_TAUNTS = [
      "Hehehehe!", "Oops!", "Is that all?", "My tower!!!", "Stop that!", "I will win!", "Beat me if u can!", "Grrr!"
  ];

  const triggerOpponentChat = useCallback(async (context: string) => {
      if (Date.now() < aiChatCooldownRef.current) return;
      aiChatCooldownRef.current = Date.now() + 5000; 

      if (Math.random() > 0.5) {
          const randomTaunt = LOCAL_TAUNTS[Math.floor(Math.random() * LOCAL_TAUNTS.length)];
          setOpponentMessage(randomTaunt);
          playSound('chat');
          setTimeout(() => setOpponentMessage(null), 3500);
          return;
      }

      const msg = await callGemini(
          `Game Context: ${context}. Speak as the Red King.`,
          `You are the Red King from Clash Royale. Arrogant and funny. Max 5 words.`
      );
      
      if (msg) {
          setOpponentMessage(msg);
          playSound('chat');
          setTimeout(() => setOpponentMessage(null), 4000);
      } else {
          const randomTaunt = LOCAL_TAUNTS[Math.floor(Math.random() * LOCAL_TAUNTS.length)];
          setOpponentMessage(randomTaunt);
          playSound('chat');
          setTimeout(() => setOpponentMessage(null), 3500);
      }
  }, []);

  const getStrategyTip = async () => {
      setIsGeneratingTip(true);
      const cardKeys = Object.keys(CARDS);
      const randomCardKey = cardKeys[Math.floor(Math.random() * cardKeys.length)] as CardType;
      const randomCard = CARDS[randomCardKey];

      // Try API first
      const prompt = `Give me a pro strategy tip and a funny 1-sentence backstory lore for the card: ${randomCard.name}.`;
      const system = `You are a battle hardened War General. 
      Return the response in this EXACT format:
      Tip: [Strategy Tip here]
      Lore: [Backstory here]
      Keep the tip practical for a Clash Royale style game. Keep the lore funny or epic.`;

      const response = await callGemini(prompt, system);
      
      if (response) {
          const tipMatch = response.match(/Tip:\s*(.*)/);
          const loreMatch = response.match(/Lore:\s*(.*)/);
          
          setStrategyTip({
              tip: tipMatch ? tipMatch[1] : UNIT_KNOWLEDGE[randomCardKey].tip,
              lore: loreMatch ? loreMatch[1] : UNIT_KNOWLEDGE[randomCardKey].lore,
              cardName: randomCard.name
          });
      } else {
          // FALLBACK TO HARDCODED DB
          setStrategyTip({
              tip: UNIT_KNOWLEDGE[randomCardKey].tip,
              lore: UNIT_KNOWLEDGE[randomCardKey].lore,
              cardName: randomCard.name
          });
      }
      setIsGeneratingTip(false);
  };

  const generateBattleRecap = async (result: string, time: number, hpLeft: number, hpRight: number) => {
      if (!apiKey) return;
      
      const prompt = `Match Result: ${result} won. Time Remaining: ${Math.floor(time)}s. Left Tower HP: ${Math.floor(hpLeft)}. Right Tower HP: ${Math.floor(hpRight)}.`;
      const system = "You are a hysterical medieval sports commentator. Give a 12-word max recap of this battle outcome. Use emojis.";
      const recap = await callGemini(prompt, system);
      if (recap) setBattleRecap(recap);
  };

  // --- Logic ---

  const initGame = useCallback(() => {
    unitsRef.current = [];
    towersRef.current = [createTower('left'), createTower('right')];
    projectilesRef.current = [];
    particlesRef.current = [];
    
    // Scenery Generation
    starsRef.current = Array.from({length: 50}).map(() => ({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * (LANE_Y - 50),
        alpha: Math.random() * 0.8 + 0.2
    }));
    
    // Generate Craters
    cratersRef.current = Array.from({length: 8}).map(() => ({
        x: Math.random() * CANVAS_WIDTH,
        y: LANE_Y + Math.random() * 80,
        width: 30 + Math.random() * 30,
        height: 10 + Math.random() * 10
    }));

    setWinner(null);
    setElixir(0); 
    elixirFullSoundPlayedRef.current = false;
    doubleElixirTriggeredRef.current = false; 
    setOpponentMessage(null);
    setBattleRecap(null); 
    aiChatCooldownRef.current = 0;
    isGameOverRef.current = false; 
    
    aiStateRef.current.elixir = 0;
    aiStateRef.current.timer = 0;
    
    lastTimeRef.current = performance.now();
    gameStartRef.current = performance.now();
    setTimeRemaining(MATCH_DURATION);
    setDoubleElixir(false);
    setIsTiebreaker(false);
    
    const fullDeck: CardType[] = ['knight', 'archer', 'giant', 'skeleton_army', 'dragon', 'cannon', 'wizard', 'mini_pekka', 'bats', 'fireball', 'log', 'freeze'];
    const pDeck = shuffleDeck([...fullDeck]); 
    setHand(pDeck.slice(0, 4));
    setNextCard(pDeck[4]);
    setDrawPile(pDeck.slice(5));
    
    const aiDeck = shuffleDeck([...fullDeck]);
    aiStateRef.current.hand = aiDeck.slice(0, 4);
    aiStateRef.current.nextCard = aiDeck[4];
    aiStateRef.current.drawPile = aiDeck.slice(5);

    setCardCooldowns({});

    setTimeout(() => triggerOpponentChat("Match Start"), 1000);

  }, [triggerOpponentChat]);

  const spawnCard = (card: CardType, team: Team, xPos: number) => {
    // SPELLS
    if (card === 'fireball') {
      playSound('spawn');
      projectilesRef.current.push({
        x: xPos, y: -200, tx: xPos, ty: LANE_Y, speed: 300, color: '#f97316', damage: 325, area: true, areaRadius: 80, ownerTeam: team
      });
      return;
    }

    if (card === 'freeze') {
        playSound('freeze');
        const radius = 120;
        const duration = 4000; 
        const now = performance.now();
        [...unitsRef.current, ...towersRef.current].forEach(e => {
            if (e.team !== team && Math.abs(e.x - xPos) < radius) {
                e.frozenUntil = now + duration;
                e.rampUpValue = 0;
            }
        });
        for(let i=0; i<30; i++) {
             particlesRef.current.push({
                x: xPos + (Math.random()*radius*2 - radius),
                y: LANE_Y + (Math.random()*40 - 20),
                life: 2.0, color: '#67e8f9',
                vx: 0, vy: -0.5
            });
        }
        return;
    }

    if (card === 'log') {
        playSound('log');
        const direction = team === 'left' ? 1 : -1;
        projectilesRef.current.push({
            x: xPos, y: LANE_Y + 10, tx: 0, ty: 0, 
            speed: 160 * direction, 
            color: '#854d0e',
            damage: 80, 
            isLog: true, 
            ownerTeam: team,
            hitIds: [] as string[], // Explicitly cast to string array
            life: 350
        });
        for(let i=0; i<5; i++) {
            particlesRef.current.push({
                x: xPos, y: LANE_Y + 10, life: 0.5, color: '#a16207',
                vx: Math.random()*4-2, vy: Math.random()*(-4)
            });
        }
        return;
    }

    // UNITS
    if (card === 'bats') playSound('squeak');
    else playSound('spawn');

    let type: EntityType = 'knight';
    if (card === 'skeleton_army') type = 'skeleton';
    else if (card === 'giant') type = 'giant';
    else if (card === 'archer') type = 'archer';
    else if (card === 'dragon') type = 'dragon';
    else if (card === 'cannon') type = 'cannon';
    else if (card === 'wizard') type = 'wizard';
    else if (card === 'mini_pekka') type = 'mini_pekka';
    else if (card === 'bats') type = 'bats';

    const newUnits = createUnit(team, type, xPos);
    unitsRef.current.push(...newUnits);
  };

  const handleCardUse = (card: CardType, x: number) => {
     if (winner || isTiebreaker) return; // BLOCKS INPUT

     const stats = CARDS[card];
     if (elixir < stats.cost) return;

     const isSpell = card === 'fireball' || card === 'log' || card === 'freeze';
     if (!isSpell && x > CANVAS_WIDTH / 2) return; 

     spawnCard(card, 'left', x);
     setElixir(prev => prev - stats.cost);

     const usedCard = card;
     const newCard = nextCard;
     const newNext = drawPile[0];
     const newDrawPile = [...drawPile.slice(1), usedCard];

     setHand(prev => {
         const idx = prev.indexOf(usedCard);
         const h = [...prev];
         h[idx] = newCard;
         return h;
     });
     setNextCard(newNext);
     setDrawPile(newDrawPile);

     setCardCooldowns(prev => ({...prev, [card]: Date.now() + stats.cooldown}));
     setTimeout(() => {
        setCardCooldowns(prev => {
            const n = {...prev};
            delete n[card];
            return n;
        });
     }, stats.cooldown);
  };

  const handleNextLevel = () => {
    if (difficulty === 'easy') setDifficulty('medium');
    else if (difficulty === 'medium') setDifficulty('hard');
    initGame();
  };

  const update = (dt: number) => {
    if (winner || view !== 'game') return;

    const elapsed = (performance.now() - gameStartRef.current) / 1000;
    const remaining = Math.max(0, MATCH_DURATION - elapsed);
    setTimeRemaining(remaining);
    
    // --- TIEBREAKER / GAME END LOGIC START ---
    if (remaining <= 0) {
        if (!isTiebreaker) {
            setIsTiebreaker(true);
            playSound('tiebreaker'); // RENG RENG
            triggerOpponentChat("Tiebreaker started! Towers losing health!");
        }
        
        // ONLY TOWER HEALTH UPDATES - EVERYTHING ELSE FROZEN
        towersRef.current[0].hp -= dt * 0.3;
        towersRef.current[1].hp -= dt * 0.3;

        const leftHP = towersRef.current[0].hp;
        const rightHP = towersRef.current[1].hp;

        // Check for Game Over Condition
        if (leftHP <= 0 || rightHP <= 0) {
            if (!isGameOverRef.current) {
                isGameOverRef.current = true;
                if (Math.abs(leftHP - rightHP) < 2.0) { 
                     setWinner('draw'); playSound('draw');
                     triggerOpponentChat("A draw? Unacceptable!");
                     generateBattleRecap('draw', 0, leftHP, rightHP);
                } else if (leftHP > rightHP) {
                     setWinner('left'); playSound('win');
                     triggerOpponentChat("You got lucky this time!");
                     generateBattleRecap('left', 0, leftHP, rightHP);
                } else {
                     setWinner('right'); playSound('lose');
                     triggerOpponentChat("Hah! Too easy!");
                     generateBattleRecap('right', 0, leftHP, rightHP);
                }
            }
        }
        
        // CRITICAL: Return here to skip ALL other logic (movement, attacks, elixir)
        return; 
    }
    // --- TIEBREAKER LOGIC END ---

    // --- FIX: USE REF FOR SOUND TRIGGER TO PREVENT GLITCHING ---
    if (remaining <= DOUBLE_ELIXIR_TIME && !doubleElixirTriggeredRef.current) {
        setDoubleElixir(true);
        doubleElixirTriggeredRef.current = true; // Mark as played
        playSound('time'); // Single soft alert
        triggerOpponentChat("Double Elixir! Mana flowing!");
    }

    // --- ELIXIR LOGIC ---
    // Standard Clash Royale Elixir Speed:
    // Normal: 1 Elixir every 2.8 seconds
    // Double: 1 Elixir every 1.4 seconds
    const secondsPerElixir = remaining <= DOUBLE_ELIXIR_TIME ? 1.4 : 2.8;
    
    // Calculate elixir gained this frame (dt is in ms)
    const elixirGained = (dt / 1000) * (1 / secondsPerElixir);
    
    if (elixir < 10) {
        setElixir(e => Math.min(e + elixirGained, 10)); 
        if (elixir < 9.9) { 
            elixirFullSoundPlayedRef.current = false;
        }
    } else {
        // Elixir is full
        if (!elixirFullSoundPlayedRef.current) {
            playSound('full'); 
            elixirFullSoundPlayedRef.current = true;
        }
    }
    
    if (aiStateRef.current.elixir < 10) {
        aiStateRef.current.elixir = Math.min(aiStateRef.current.elixir + elixirGained, 10);
    }


    // --- AI LOGIC ---
    aiStateRef.current.timer += dt;
    const checkInterval = 1200; 

    if (aiStateRef.current.timer > checkInterval) { 
        const playerUnits = unitsRef.current.filter(u => u.team === 'left');
        const bridgeX = CANVAS_WIDTH / 2;
        // Analyze Board State
        const enemiesOnMySide = playerUnits.filter(u => u.x > bridgeX);
        const enemiesNearBridge = playerUnits.filter(u => u.x > bridgeX - 150);
        let threatLevel = 0;
        let hasSwarm = false;
        let hasTank = false;
        let hasAir = false;

        enemiesNearBridge.forEach(u => {
             threatLevel += (u.cost || 3); 
             if (u.type === 'skeleton' || u.type === 'bats') hasSwarm = true;
             if (u.type === 'giant' || u.type === 'knight') hasTank = true;
             if (u.type === 'dragon') hasAir = true;
        });

        // Trigger AI Chat based on threat (Local logic to guarantee it works)
        if (threatLevel > 10 && Math.random() > 0.7) {
            triggerOpponentChat("Stop attacking me!");
        }

        const aiHand = aiStateRef.current.hand;
        const currentElixir = aiStateRef.current.elixir;
        let bestCard: CardType | null = null;
        let spawnX = CANVAS_WIDTH - 100; // Default spawn

        const affordable = aiHand.filter(c => CARDS[c].cost <= currentElixir);

        if (affordable.length > 0) {
            
            if (difficulty === 'easy') {
                if (currentElixir > 6 || threatLevel > 2) {
                    bestCard = affordable[Math.floor(Math.random() * affordable.length)];
                    spawnX = CANVAS_WIDTH - 50 - Math.random() * 150;
                }
            } 
            else if (difficulty === 'medium') {
                if (threatLevel > 0) {
                    const counters = affordable.filter(c => {
                         if (hasSwarm) return ['log', 'fireball', 'wizard', 'archer', 'dragon', 'bats'].includes(c);
                         if (hasTank) return ['mini_pekka', 'skeleton_army', 'dragon', 'cannon', 'bats'].includes(c);
                         if (hasAir) return ['wizard', 'archer', 'dragon', 'fireball', 'bats'].includes(c);
                         return false;
                    });
                    bestCard = counters.length > 0 ? counters[0] : affordable[0];
                    spawnX = enemiesNearBridge[0] ? enemiesNearBridge[0].x + 100 : CANVAS_WIDTH - 100;
                } else if (currentElixir > 8) {
                    bestCard = affordable[Math.floor(Math.random() * affordable.length)];
                }
            } 
            else {
                // HARD MODE (Simplified for stability)
                if (enemiesOnMySide.length > 0) {
                    const closestThreat = enemiesOnMySide.sort((a,b) => b.x - a.x)[0];
                    if (closestThreat.type === 'giant' || closestThreat.type === 'knight') {
                         const cannon = affordable.find(c => c === 'cannon');
                         const killer = affordable.find(c => c === 'mini_pekka' || c === 'skeleton_army');
                         if (cannon) { bestCard = 'cannon'; spawnX = CANVAS_WIDTH / 2 + 50; } 
                         else if (killer) { bestCard = killer; spawnX = closestThreat.x + 30; }
                    } 
                    else if (closestThreat.type === 'skeleton' || closestThreat.type === 'bats') {
                         const splasher = affordable.find(c => c === 'log' || c === 'wizard' || c === 'dragon');
                         if (splasher) { bestCard = splasher; spawnX = closestThreat.x + 100; }
                    }
                    if (!bestCard) {
                        bestCard = affordable.sort((a,b) => CARDS[a].cost - CARDS[b].cost)[0]; 
                        spawnX = closestThreat.x + 50;
                    }
                }
                else if (threatLevel === 0) {
                    if (currentElixir >= 9) {
                        const tank = affordable.find(c => c === 'giant' || c === 'knight');
                        if (tank) { bestCard = tank; spawnX = CANVAS_WIDTH - 20; } 
                        else { bestCard = affordable.sort((a,b) => CARDS[a].cost - CARDS[b].cost)[0]; spawnX = CANVAS_WIDTH - 20; }
                    } else if (currentElixir > 6) {
                        const myUnits = unitsRef.current.filter(u => u.team === 'right');
                        const myTank = myUnits.find(u => u.type === 'giant' && u.x < CANVAS_WIDTH - 100);
                        if (myTank) {
                            const support = affordable.find(c => c === 'wizard' || c === 'dragon' || c === 'archer');
                            if (support) { bestCard = support; spawnX = myTank.x + 50; }
                        }
                    }
                }
            }

            if (bestCard) {
                spawnX = Math.max(CANVAS_WIDTH/2 + 20, Math.min(CANVAS_WIDTH - 20, spawnX));
                if (bestCard === 'fireball' || bestCard === 'freeze') spawnX = playerUnits.length > 0 ? playerUnits[0].x : 100;
                if (bestCard === 'log') spawnX = CANVAS_WIDTH;

                spawnCard(bestCard, 'right', spawnX);
                aiStateRef.current.elixir -= CARDS[bestCard].cost;

                const usedIdx = aiStateRef.current.hand.indexOf(bestCard);
                const newCard = aiStateRef.current.nextCard;
                const newNext = aiStateRef.current.drawPile[0];
                aiStateRef.current.hand[usedIdx] = newCard;
                aiStateRef.current.nextCard = newNext;
                aiStateRef.current.drawPile = [...aiStateRef.current.drawPile.slice(1), bestCard];
            }
        }
        aiStateRef.current.timer = 0;
    }

    // 3. Units Update
    unitsRef.current.forEach(unit => {
      if (unit.frozenUntil && unit.frozenUntil > performance.now()) return;

      if (unit.isBuilding && unit.type === 'cannon') {
         unit.hp -= dt * 0.07; 
      }

      // CLAMP POSITIONS (Prevent walking off-screen)
      unit.x = Math.max(0, Math.min(CANVAS_WIDTH, unit.x));

      let target: BaseEntity | null = null;
      const allEnemies = [...unitsRef.current.filter(u => u.team !== unit.team), ...towersRef.current.filter(t => t.team !== unit.team)];

      // Giant Retargeting Logic
      if (unit.type === 'giant') {
          let closestBuilding: BaseEntity | null = null;
          let minBuildingDist = Infinity;
          
          allEnemies.forEach(enemy => {
              if (enemy.hp <= 0) return;
              if (enemy.isBuilding || enemy.type === 'tower') {
                  const dist = Math.abs(unit.x - enemy.x);
                  if (dist < minBuildingDist) {
                      minBuildingDist = dist;
                      closestBuilding = enemy;
                  }
              }
          });

          if (closestBuilding && closestBuilding.id !== unit.targetId) {
              unit.targetId = closestBuilding.id;
              unit.state = 'moving'; 
          }
      }

      if (unit.targetId) {
          const lockedTarget = allEnemies.find(e => e.id === unit.targetId);
          if (lockedTarget && lockedTarget.hp > 0) {
              if (unit.state === 'attacking') {
                  if (Math.abs(unit.x - lockedTarget.x) <= unit.range) {
                      target = lockedTarget;
                  } else {
                      unit.targetId = null; 
                      unit.rampUpValue = 0; 
                  }
              } else {
                  const isLockedOnBuilding = lockedTarget.type === 'tower' || lockedTarget.isBuilding;
                  const isBuildingTargeter = unit.type === 'giant';
                  if (isLockedOnBuilding && !isBuildingTargeter) target = null; 
                  else target = lockedTarget; 
              }
          } else {
              unit.targetId = null;
              unit.rampUpValue = 0;
          }
      }

      if (!target) {
         let closestEnemy: BaseEntity | null = null;
         let minEnemyDist = Infinity;
         
         allEnemies.forEach(enemy => {
             if (enemy.hp <= 0) return;
             if (enemy.isFlying && !unit.isFlying && unit.range < 100 && unit.type !== 'archer' && unit.type !== 'wizard') return; 
             if (unit.type === 'giant' && !enemy.isBuilding && enemy.type !== 'tower') return;

             const dist = Math.abs(unit.x - enemy.x);
             if (dist <= unit.sightRange) {
                 if (dist < minEnemyDist) {
                     minEnemyDist = dist;
                     closestEnemy = enemy;
                 }
             }
         });

         if (closestEnemy) {
             target = closestEnemy;
         } else {
             let closestBuilding: BaseEntity | null = null;
             let minBuildingDist = Infinity;

             allEnemies.forEach(enemy => {
                 if (enemy.hp <= 0) return;
                 if (enemy.type === 'tower' || enemy.isBuilding) {
                     const dist = Math.abs(unit.x - enemy.x);
                     if (dist < minBuildingDist) {
                         minBuildingDist = dist;
                         closestBuilding = enemy;
                     }
                 }
             });
             target = closestBuilding;
         }
      }

      if (target) {
          unit.targetId = target.id;
          const dist = Math.abs(unit.x - target.x);
          
          if (dist <= unit.range) {
              unit.state = 'attacking';
              
              if (performance.now() - unit.lastAttackTime > unit.attackCooldown) {
                  
                  if (unit.type === 'archer' || unit.type === 'wizard') {
                      const isMagic = unit.type === 'wizard';
                      playSound(isMagic ? 'magic' : 'arrow');
                      projectilesRef.current.push({
                          x: unit.x, y: unit.y + 10,
                          tx: target.x, ty: target.y + 10,
                          speed: isMagic ? 350 : 400, 
                          color: isMagic ? '#f472b6' : '#fcd34d', 
                          damage: unit.damage,
                          isArrow: !isMagic, 
                          isMagic: isMagic,
                          area: isMagic,
                          areaRadius: 40,
                          ownerTeam: unit.team, 
                          targetId: target.id,
                          hitFlying: target.isFlying
                      });
                  } else if (unit.type === 'cannon') {
                      playSound('cannon');
                      projectilesRef.current.push({
                          x: unit.x, y: unit.y,
                          tx: target.x, ty: target.y + 10,
                          speed: 400, color: '#111', damage: unit.damage,
                          isCannonball: true,
                          ownerTeam: unit.team, targetId: target.id
                      });
                  } else if (unit.type === 'bats') {
                      playSound('attack'); 
                      target.hp -= unit.damage;
                  } else {
                      playSound('attack');
                      let dmg = unit.damage;
                      if (unit.type === 'dragon') {
                          unit.rampUpValue = Math.min((unit.rampUpValue || 0) + 8, 200); 
                          dmg += unit.rampUpValue;
                      }
                      target.hp -= dmg;
                      for(let i=0; i<3; i++) {
                        particlesRef.current.push({
                            x: target.x + (Math.random()*40-20),
                            y: target.y + (Math.random()*40-20),
                            life: 1, color: '#fff',
                            vx: Math.random()*2-1, vy: Math.random()*2-1
                        });
                      }
                  }
                  unit.lastAttackTime = performance.now();
              }
          } else {
              unit.state = 'moving';
              const dir = target.x > unit.x ? 1 : -1;
              if (!unit.isBuilding) {
                  unit.x += (unit.speed * dt / 1000) * dir;
              }
          }
      } else {
          unit.state = 'idle';
          unit.targetId = null;
          unit.rampUpValue = 0;
      }
    });

    // 4. Towers Update
    towersRef.current.forEach(tower => {
        if(tower.hp <= 0) {
            // Trigger chat if tower just died
            if (!winner && !isTiebreaker && Math.random() > 0.7) {
                triggerOpponentChat(tower.team === 'left' ? "Hah! I destroyed your tower!" : "No! My tower! You'll pay for that!");
            }
            return;
        }
        if(tower.frozenUntil && tower.frozenUntil > performance.now()) return;
        
        let target = null;
        if (tower.targetId) {
            const locked = unitsRef.current.find(u => u.id === tower.targetId);
            if (locked && locked.hp > 0 && Math.abs(locked.x - tower.x) <= tower.range) {
                target = locked;
            } else {
                tower.targetId = null; 
            }
        }

        if (!target) {
            const enemies = unitsRef.current.filter(u => u.team !== tower.team && u.hp > 0);
            let minDist = tower.range;
            enemies.forEach(u => {
                const dist = Math.abs(u.x - tower.x);
                if (dist <= minDist) {
                    minDist = dist;
                    target = u;
                }
            });
            if (target) tower.targetId = (target as Unit).id;
        }

        if (target && performance.now() - tower.lastAttackTime > tower.attackCooldown) {
            playSound('arrow');
            const dist = Math.abs(tower.x - target.x);
            const damageMult = dist > 250 ? 0.5 : 1.0; 

            projectilesRef.current.push({
                x: tower.x + tower.width/2,
                y: tower.y,
                tx: target.x,
                ty: target.y,
                speed: 450,
                color: tower.team === 'left' ? '#60a5fa' : '#f87171',
                damage: tower.damage * damageMult,
                ownerTeam: tower.team,
                isArrow: true,
                targetId: target.id
            });
            tower.lastAttackTime = performance.now();
        }
    });

    // 5. Projectiles
    projectilesRef.current.forEach((p, idx) => {
        if (p.isLog) {
            p.x += (p.speed * dt) / 1000;
            p.life! -= Math.abs((p.speed * dt) / 1000);
            const enemies = unitsRef.current.filter(u => u.team !== p.ownerTeam);
            enemies.forEach(e => {
                if (e.isFlying) return;
                if (p.hitIds?.includes(e.id)) return;
                if (Math.abs(e.x - p.x) < 30) {
                    e.hp -= p.damage!;
                    p.hitIds?.push(e.id);
                    if (!e.isBuilding) {
                        e.x += (p.speed > 0 ? 40 : -40); 
                    }
                }
            });
            if (p.life! <= 0) projectilesRef.current.splice(idx, 1);
            return;
        }

        if ((p.isArrow || p.isCannonball) && p.targetId) {
             const target = [...unitsRef.current, ...towersRef.current].find(t => t.id === p.targetId);
             if (target && target.hp > 0) {
                 p.tx = target.x;
                 p.ty = target.y + target.height/2;
             }
        }

        const dx = p.tx - p.x;
        const dy = p.ty - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < 15) {
            if (p.area) {
                playSound('explosion');
                const radius = p.areaRadius || 80;
                unitsRef.current.forEach(t => {
                   if (t.team !== p.ownerTeam && Math.abs(t.x - p.tx) < radius) {
                       if (p.isMagic) {
                           if (t.isFlying === p.hitFlying) {
                               t.hp -= p.damage || 0;
                           }
                       } else {
                           t.hp -= p.damage || 0;
                       }
                   }
                });
                towersRef.current.forEach(t => {
                    if (t.team !== p.ownerTeam && Math.abs(t.x + t.width/2 - p.tx) < radius) {
                        t.hp -= (p.damage || 0) * (p.isMagic ? 1.0 : 0.35); 
                    }
                });
                for(let i=0; i<10; i++) {
                    particlesRef.current.push({
                        x: p.tx, y: LANE_Y, life: 1.0, color: p.color,
                        vx: Math.random()*10-5, vy: Math.random()*10-5
                    });
                }
            } else {
                const targets = unitsRef.current.filter(u => Math.abs(u.x - p.tx) < 30 && u.team !== p.ownerTeam);
                if (targets.length > 0) targets[0].hp -= p.damage || 0;
                const towers = towersRef.current.filter(t => Math.abs((t.x+t.width/2) - p.tx) < 30 && t.team !== p.ownerTeam);
                if (towers.length > 0) towers[0].hp -= p.damage || 0;
            }
            projectilesRef.current.splice(idx, 1);
        } else {
            const move = (p.speed * dt) / 1000;
            p.x += (dx / dist) * move;
            p.y += (dy / dist) * move;
        }
    });

    // 6. Cleanup
    unitsRef.current = unitsRef.current.filter(u => u.hp > 0);
    
    if (!isTiebreaker) {
        if (towersRef.current[0].hp <= 0) { setWinner('right'); playSound('lose'); }
        if (towersRef.current[1].hp <= 0) { setWinner('left'); playSound('win'); }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
      // BG - NIGHT WAR ZONE
      const grad = ctx.createLinearGradient(0, 0, 0, LANE_Y);
      grad.addColorStop(0, '#0c0a09'); 
      grad.addColorStop(1, '#292524'); 
      ctx.fillStyle = grad;
      ctx.fillRect(0,0, CANVAS_WIDTH, LANE_Y);

      // Stars
      starsRef.current.forEach(star => {
         ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * 0.5})`;
         ctx.beginPath(); ctx.arc(star.x, star.y, Math.random() > 0.9 ? 2 : 1, 0, Math.PI*2); ctx.fill();
      });

      // Moon
      ctx.fillStyle = '#fca5a5'; 
      ctx.shadowBlur = 40; ctx.shadowColor = '#7f1d1d';
      ctx.beginPath(); ctx.arc(CANVAS_WIDTH - 100, 80, 40, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;

      // UNIFIED GROUND
      ctx.fillStyle = '#3f3f46'; // Base Ground Color
      ctx.fillRect(0, LANE_Y, CANVAS_WIDTH, CANVAS_HEIGHT - LANE_Y);
      
      // Lane Decoration (Path)
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; 
      ctx.fillRect(0, LANE_Y, CANVAS_WIDTH, 40);
      
      // Craters
      cratersRef.current.forEach(c => {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.width, c.height, 0, 0, Math.PI*2);
          ctx.fill();
      });

      // Bridge
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH/2, LANE_Y); ctx.lineTo(CANVAS_WIDTH/2, LANE_Y+40); ctx.stroke();
      ctx.lineWidth = 1;

      // Towers
      towersRef.current.forEach(t => {
          if (t.hp <= 0) return;
          if (t.frozenUntil && t.frozenUntil > performance.now()) {
              ctx.shadowBlur = 20;
              ctx.shadowColor = '#06b6d4';
          }
          ctx.font = '60px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(t.team === 'left' ? '🏰' : '🏯', t.x + t.width/2, t.y + 60);
          ctx.shadowBlur = 0; 
          
          const pct = Math.max(0, t.hp / t.maxHp);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(t.x, t.y - 10, t.width, 6);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(t.x, t.y - 10, t.width * pct, 6);
      });

      // Units
      unitsRef.current.forEach(u => {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.beginPath(); ctx.ellipse(u.x, LANE_Y + 20, u.width/2, 5, 0, 0, Math.PI*2); ctx.fill();

          ctx.font = '30px Arial';
          ctx.textAlign = 'center';
          let icon = '♟️';
          if (u.type === 'knight') icon = '⚔️';
          if (u.type === 'giant') { ctx.font='50px Arial'; icon = '💪'; }
          if (u.type === 'archer') icon = '🏹';
          if (u.type === 'skeleton') { ctx.font='20px Arial'; icon = '💀'; }
          if (u.type === 'dragon') icon = '🐲';
          if (u.type === 'cannon') icon = '💣';
          if (u.type === 'wizard') icon = '🧙‍♂️';
          if (u.type === 'mini_pekka') icon = '🤖';
          if (u.type === 'bats') { ctx.font='20px Arial'; icon = '🦇'; }

          ctx.save();
          if (u.frozenUntil && u.frozenUntil > performance.now()) {
               ctx.fillStyle = 'rgba(6, 182, 212, 0.5)';
               ctx.beginPath(); ctx.arc(u.x, u.y + u.height/2, 25, 0, Math.PI*2); ctx.fill();
          }

          let animOffsetX = 0;
          if (u.state === 'attacking' && !u.isBuilding && u.type !== 'dragon' && u.type !== 'archer' && u.type !== 'wizard') {
             const progress = (performance.now() - u.lastAttackTime) / u.attackCooldown;
             if (progress < 0.2) { 
                 animOffsetX = (u.team === 'left' ? 10 : -10);
             }
          }
          
          ctx.translate(u.x + animOffsetX, u.y);
          if (u.team === 'right') ctx.scale(-1, 1);
          
          ctx.fillStyle = u.team === 'left' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)';
          ctx.beginPath();
          ctx.arc(0, u.height/2, 20, 0, Math.PI*2);
          ctx.fill();

          ctx.fillText(icon, 0, u.height/2);
          ctx.restore();

          if (u.type === 'dragon' && u.state === 'attacking' && u.targetId && (!u.frozenUntil || u.frozenUntil < performance.now())) {
             const target = [...unitsRef.current, ...towersRef.current].find(t => t.id === u.targetId);
             if (target) {
                 ctx.save();
                 ctx.strokeStyle = '#f59e0b';
                 ctx.lineWidth = 2 + (u.rampUpValue || 0) / 40; 
                 ctx.lineCap = 'round';
                 ctx.beginPath();
                 ctx.moveTo(u.x, u.y + u.height/2);
                 ctx.lineTo(target.x, target.y + target.height/2);
                 ctx.stroke();
                 ctx.restore();
             }
          }

          const pct = u.hp / u.maxHp;
          ctx.fillStyle = 'red';
          ctx.fillRect(u.x - 10, u.y - 20, 20, 4);
          ctx.fillStyle = '#22c55e';
          ctx.fillRect(u.x - 10, u.y - 20, 20 * pct, 4);
      });

      // Projectiles
      projectilesRef.current.forEach(p => {
          if (p.isLog) {
              ctx.save();
              ctx.translate(p.x, p.y);
              // FREEZE ROTATION ON TIEBREAKER
              if (!winner && !isTiebreaker) {
                ctx.rotate(Date.now() / 100);
              }
              ctx.font = '30px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('🪵', 0, 0);
              ctx.restore();
          } else if (p.isArrow) {
              ctx.save();
              ctx.translate(p.x, p.y);
              const angle = Math.atan2(p.ty - p.y, p.tx - p.x);
              ctx.rotate(angle);
              ctx.fillStyle = '#d97706'; 
              ctx.fillRect(-10, -1, 20, 2); 
              ctx.fillStyle = '#fcd34d'; 
              ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(5, -3); ctx.lineTo(5, 3); ctx.fill();
              ctx.restore();
          } else if (p.isCannonball) {
              ctx.fillStyle = '#111827';
              ctx.beginPath();
              ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
              ctx.fill();
          } else {
              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.area ? (p.isMagic ? 6 : 10) : 4, 0, Math.PI*2);
              ctx.fill();
          }
      });

      particlesRef.current.forEach((p, i) => {
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, 4, 4);
          
          // FREEZE PARTICLES ON TIEBREAKER/WIN
          if (!winner && !isTiebreaker) {
              p.x += p.vx;
              p.y += p.vy;
              p.life -= 0.05;
          }
          
          if(p.life <= 0) particlesRef.current.splice(i, 1);
      });
      ctx.globalAlpha = 1;
  };

  const gameLoop = (time: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = time;
    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;
    
    update(dt);
    if(canvasRef.current) draw(canvasRef.current.getContext('2d')!);
    requestRef.current = requestAnimationFrame(gameLoop);
  };

  useEffect(() => {
     requestRef.current = requestAnimationFrame(gameLoop);
     return () => cancelAnimationFrame(requestRef.current!);
  }, [view, winner, elixir, difficulty, isTiebreaker, triggerOpponentChat]); 

  // --- Input Handlers ---

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent, card: CardType) => {
     if (elixir < CARDS[card].cost || cardCooldowns[card]) return;
     if (isTiebreaker || winner) return; // EXTRA SAFETY CHECK
     setDraggingCard(card);
  };

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
      if (!draggingCard) return;
      let cx, cy;
      if (e instanceof MouseEvent) { cx = e.clientX; cy = e.clientY; }
      else { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
      setDragPos({ x: cx, y: cy });
  }, [draggingCard]);

  const handleDragEnd = useCallback((e: MouseEvent | TouchEvent) => {
      if (!draggingCard) return;
      if (canvasRef.current) {
         const rect = canvasRef.current.getBoundingClientRect();
         let clientX, clientY;
         if (e instanceof MouseEvent) { clientX = e.clientX; clientY = e.clientY; }
         else { clientX = e.changedTouches[0].clientX; clientY = e.changedTouches[0].clientY; }

         const inCanvas = 
            clientX >= rect.left && 
            clientX <= rect.right && 
            clientY >= rect.top && 
            clientY <= rect.bottom;

         if (inCanvas) {
             const scaleX = CANVAS_WIDTH / rect.width;
             const gameX = (clientX - rect.left) * scaleX;
             handleCardUse(draggingCard, gameX);
         }
      }
      setDraggingCard(null);
  }, [draggingCard, elixir, isTiebreaker, winner]);

  useEffect(() => {
     window.addEventListener('mousemove', handleDragMove);
     window.addEventListener('mouseup', handleDragEnd);
     window.addEventListener('touchmove', handleDragMove);
     window.addEventListener('touchend', handleDragEnd);
     return () => {
         window.removeEventListener('mousemove', handleDragMove);
         window.removeEventListener('mouseup', handleDragEnd);
         window.removeEventListener('touchmove', handleDragMove);
         window.removeEventListener('touchend', handleDragEnd);
     }
  }, [handleDragMove, handleDragEnd]);


  // --- Render Views ---

  if (view === 'menu') {
      return (
          <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4 font-sans select-none">
              
              <button onClick={toggleMusic} className="absolute top-4 left-4 p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition">
                  {isMusicOn ? '🎵' : '🔇'}
              </button>

              <h1 className="text-6xl font-black bg-gradient-to-br from-yellow-400 to-red-600 bg-clip-text text-transparent mb-2">
                  CLASH BATTLE
              </h1>
              <p className="font-bold italic text-sm mb-8 transform -skew-x-6 bg-gradient-to-br from-yellow-400 to-red-600 bg-clip-text text-transparent opacity-80">
                  inspired by clash royale before it became pay 2 win
              </p>

              <div className="space-y-4 w-full max-w-xs">
                  {['easy', 'medium', 'hard'].map(d => (
                      <button 
                        key={d}
                        onClick={() => { setDifficulty(d as Difficulty); initGame(); setView('game'); }}
                        className="w-full py-4 bg-gray-800 border-2 border-gray-700 hover:border-yellow-500 rounded-xl font-bold text-xl uppercase tracking-widest transition-all hover:scale-105"
                      >
                          {d} Mode
                      </button>
                  ))}
                  <button 
                    onClick={() => setView('credits')}
                    className="w-full py-3 text-gray-400 hover:text-white transition"
                  >
                      Credits / How to Play
                  </button>
              </div>
          </div>
      );
  }

  if (view === 'credits') {
      return (
          <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4 py-10">
              <button onClick={toggleMusic} className="absolute top-4 left-4 p-3 bg-gray-800 rounded-full hover:bg-gray-700 transition">
                  {isMusicOn ? '🎵' : '🔇'}
              </button>
              <div className="w-full max-w-2xl bg-gray-800 p-8 rounded-2xl border border-gray-700 overflow-y-auto max-h-[85vh]">
                  <h2 className="text-3xl font-bold mb-4 text-yellow-500 sticky top-0 bg-gray-800 pb-2">How to Play</h2>
                  <ul className="list-disc pl-5 space-y-2 text-gray-300 mb-8 text-sm md:text-base">
                      <li>Drag cards from the bottom onto the LEFT side of the field.</li>
                      <li>Destroy the enemy tower to win!</li>
                      <li>Elixir regenerates over time. Spend wisely.</li>
                      <li><strong>Counters:</strong> Skeletons beat Giants, Archers beat Skeletons, Fireball clears swarms.</li>
                  </ul>

                  <div className="bg-gray-700/30 p-4 rounded-xl border border-yellow-500/30 mb-8 flex flex-col items-center text-center">
                        <div className="text-yellow-400 font-bold mb-2">✨ Ask the War General (AI)</div>
                        <p className="text-sm text-gray-400 mb-4">Get specific tips and lore for your cards!</p>
                        
                        {strategyTip ? (
                            <div className="animate-in fade-in space-y-3 w-full">
                                <div className="bg-gray-800/80 p-3 rounded-lg border-l-4 border-green-500 text-left">
                                    <span className="text-green-400 font-bold text-xs uppercase block mb-1">Strategy: {strategyTip.cardName}</span>
                                    <p className="text-sm font-mono text-gray-200">"{strategyTip.tip}"</p>
                                </div>
                                <div className="bg-gray-800/80 p-3 rounded-lg border-l-4 border-purple-500 text-left">
                                    <span className="text-purple-400 font-bold text-xs uppercase block mb-1">Lore</span>
                                    <p className="text-sm font-serif italic text-gray-300">"{strategyTip.lore}"</p>
                                </div>
                                <button 
                                    onClick={getStrategyTip}
                                    disabled={isGeneratingTip}
                                    className="mt-2 text-xs text-yellow-500 underline hover:text-yellow-400 disabled:opacity-50"
                                >
                                    {isGeneratingTip ? "Consulting..." : "Next Tip ➡"}
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={getStrategyTip}
                                disabled={isGeneratingTip}
                                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-full text-sm font-bold transition disabled:opacity-50 shadow-lg"
                            >
                                {isGeneratingTip ? "Consulting..." : "Get Strategy Tip"}
                            </button>
                        )}
                  </div>

                  <h3 className="text-2xl font-bold mb-4 text-blue-400 sticky top-12 bg-gray-800 pb-2 border-b border-gray-700">Troop Guide</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {Object.values(CARDS).map(card => (
                          <div key={card.id} className="flex items-center gap-3 bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                              <div className="text-4xl">{card.icon}</div>
                              <div>
                                  <div className="font-bold text-yellow-500 flex justify-between w-full">
                                      <span>{card.name}</span>
                                      <span className="text-purple-400 text-sm">💧 {card.cost}</span>
                                  </div>
                                  <div className="text-xs text-gray-300 leading-tight">{card.description}</div>
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="border-t border-gray-700 pt-6 text-center">
                      <p className="text-gray-400 text-sm uppercase tracking-widest mb-2">Created By</p>
                      <p className="text-2xl font-bold">Nhat Nam Do</p>
                      <p className="text-blue-400">namdok2k3@gmail.com</p>
                  </div>
                  <button onClick={() => setView('menu')} className="mt-8 w-full py-3 bg-gray-700 rounded-lg font-bold hover:bg-gray-600 transition">Back to Menu</button>
              </div>
          </div>
      );
  }

  // GAME VIEW
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white overflow-hidden select-none touch-none">
      
      {/* Top Bar */}
      <div className="w-full max-w-4xl flex justify-between items-center p-4 bg-gray-900 border-b border-gray-800">
         <div className="flex gap-2">
             <button onClick={() => setView('menu')} className="text-sm text-gray-500 hover:text-white">Exit</button>
             <button onClick={toggleMusic} className="text-sm text-gray-500 hover:text-white">
                 {isMusicOn ? '🎵' : '🔇'}
             </button>
         </div>
         
         <div className="flex flex-col items-center">
            <div className={`text-2xl font-mono font-bold ${timeRemaining <= 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {Math.floor(timeRemaining / 60)}:{(Math.floor(timeRemaining) % 60).toString().padStart(2, '0')}
            </div>
            {isTiebreaker ? (
                <div className="text-xs font-bold text-red-500 animate-bounce">TIEBREAKER!</div>
            ) : doubleElixir && (
                <div className="text-xs font-bold text-purple-400 animate-bounce">2x ELIXIR</div>
            )}
         </div>

         <div className="font-mono text-yellow-500">{difficulty.toUpperCase()}</div>
      </div>

      {/* Game Canvas */}
      <div className="relative w-full max-w-[800px] bg-[#0c0a09]" style={{ aspectRatio: '2/1' }}>
          <canvas 
            ref={canvasRef} 
            width={CANVAS_WIDTH} 
            height={CANVAS_HEIGHT} 
            className={`w-full h-full block bg-gray-900 border-x border-gray-800 shadow-2xl transition-all duration-1000 ${isTiebreaker ? 'border-red-500/50 shadow-red-900/50' : ''}`}
          />
          
          {/* AI CHAT BUBBLE (TOP RIGHT) - FIX: Guaranteed Visible */}
          {opponentMessage && (
              <div className="absolute top-4 right-16 z-[100] max-w-[200px] animate-in fade-in zoom-in duration-300 origin-top-right">
                  <div className="bg-white text-black p-3 rounded-2xl rounded-tr-none text-sm font-black shadow-[0_0_20px_rgba(255,0,0,0.5)] border-4 border-red-600 relative transform scale-110">
                      {opponentMessage}
                      <div className="absolute -right-2 top-0 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-red-600"></div>
                  </div>
              </div>
          )}

          {/* Winner Overlay */}
          {winner && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center animate-in fade-in duration-500 z-50 p-4 text-center">
                  <h1 className={`text-6xl font-black mb-2 ${winner === 'left' ? 'text-blue-500' : winner === 'right' ? 'text-red-500' : 'text-white'}`}>
                      {winner === 'left' ? 'VICTORY!' : winner === 'right' ? 'DEFEAT' : 'DRAW!'}
                  </h1>
                  
                  {/* Battle Recap Display */}
                  {battleRecap && (
                      <div className="bg-gray-800/80 border border-yellow-500/50 p-4 rounded-xl max-w-lg mb-6 animate-in slide-in-from-bottom-4 fade-in">
                          <p className="text-yellow-400 text-xs font-bold uppercase tracking-widest mb-1">✨ Battle Recap</p>
                          <p className="text-white font-medium italic">"{battleRecap}"</p>
                      </div>
                  )}

                  <div className="flex gap-4 mt-4">
                      <button onClick={() => setView('menu')} className="px-6 py-3 bg-gray-700 text-white font-bold rounded-full hover:bg-gray-600 transition">
                          Menu
                      </button>
                      
                      <button onClick={initGame} className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition">
                          Play Again
                      </button>

                      {winner === 'left' && difficulty !== 'hard' && (
                          <button onClick={handleNextLevel} className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold rounded-full hover:scale-105 transition shadow-lg shadow-orange-500/50">
                              Next Level ➡
                          </button>
                      )}
                  </div>
              </div>
          )}

          {/* Invalid Drop Zone Indicator (Right Side) */}
          {draggingCard && draggingCard !== 'fireball' && draggingCard !== 'log' && draggingCard !== 'freeze' && (
              <div className="absolute top-0 right-0 w-1/2 h-full bg-red-500/10 border-l-2 border-red-500/50 flex items-center justify-center pointer-events-none">
                  <span className="text-red-500 font-bold bg-black/50 px-2 rounded">No Deploy Zone</span>
              </div>
          )}
      </div>

      {/* HUD / Card Deck */}
      <div className="w-full max-w-4xl bg-gray-900 p-4 border-t border-gray-800 mt-auto">
          {/* ELIXIR BAR */}
          <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 flex gap-1 h-10 bg-black/40 p-1 rounded-xl border border-gray-700 backdrop-blur">
                  {Array.from({length: 10}).map((_, i) => {
                      const amountInSegment = Math.max(0, Math.min(1, elixir - i));
                      const isMax = elixir >= 10;
                      return (
                        <div key={i} className="flex-1 bg-gray-800 rounded-sm relative overflow-hidden border border-gray-600/50">
                            <div 
                                className={`absolute inset-0 origin-left transition-transform duration-100 ease-linear ${
                                    isMax 
                                    ? 'bg-gradient-to-t from-yellow-400 to-orange-500 shadow-[0_0_15px_rgba(234,179,8,0.8)]' 
                                    : doubleElixir 
                                        ? 'bg-gradient-to-t from-pink-600 to-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.5)]' 
                                        : 'bg-gradient-to-t from-purple-700 to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                                }`}
                                style={{ transform: `scaleX(${amountInSegment})` }}
                            />
                        </div>
                      );
                  })}
              </div>
              <div className="w-12 h-12 flex items-center justify-center font-black text-xl text-white bg-gray-800 rounded-lg border border-gray-600 shadow-inner">
                  {Math.floor(elixir)}
              </div>
              
              <div className="text-xs text-gray-500 text-center flex flex-col items-center justify-end">
                  <span className="mb-1 text-[10px] font-bold tracking-wider">NEXT</span>
                  <div className={`
                    w-12 h-14 bg-gray-800 rounded border-2 flex flex-col items-center justify-center transition-colors
                    ${elixir >= CARDS[nextCard].cost ? 'border-gray-500 shadow-sm' : 'border-gray-800 opacity-60'}
                  `}>
                      <div className="text-2xl">{CARDS[nextCard].icon}</div>
                      <div className={`text-[10px] font-black ${elixir >= CARDS[nextCard].cost ? 'text-purple-400' : 'text-red-500'}`}>
                        {CARDS[nextCard].cost}
                      </div>
                  </div>
              </div>
          </div>

          {/* Hand */}
          <div className="flex justify-center gap-2 md:gap-4 overflow-x-auto pb-2">
              {hand.map(cardId => {
                  const stats = CARDS[cardId];
                  const canAfford = elixir >= stats.cost;
                  const onCooldown = cardCooldowns[cardId] && cardCooldowns[cardId] > Date.now();
                  const isDisabled = isTiebreaker || winner; 

                  return (
                      <div 
                        key={cardId}
                        onMouseDown={(e) => handleDragStart(e, cardId)}
                        onTouchStart={(e) => handleDragStart(e, cardId)}
                        className={`
                            relative group flex-shrink-0 w-20 h-28 md:w-24 md:h-32 bg-gray-800 rounded-lg border-2 
                            flex flex-col items-center justify-between p-2 cursor-pointer transition-all select-none
                            ${isDisabled ? 'opacity-30 grayscale cursor-not-allowed' : 
                              (canAfford && !onCooldown ? 'border-gray-600 hover:border-yellow-400 hover:-translate-y-2 shadow-lg hover:shadow-yellow-900/20' : 'border-gray-800 opacity-50 grayscale')}
                        `}
                      >
                          <div className="text-xs font-bold text-gray-400 w-full text-center truncate">{stats.name}</div>
                          <div className="text-4xl md:text-5xl drop-shadow-lg">{stats.icon}</div>
                          <div className={`
                             w-full text-center font-black text-sm md:text-base border-t border-gray-700 pt-1
                             ${canAfford ? 'text-purple-400' : 'text-red-500'}
                          `}>
                              {stats.cost}
                          </div>

                          {/* Cooldown Overlay */}
                          {onCooldown && (
                              <div className="absolute inset-0 bg-black/60 rounded flex items-center justify-center">
                                  <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                              </div>
                          )}
                      </div>
                  );
              })}
          </div>
      </div>

      {/* Drag Proxy Visual */}
      {draggingCard && (
          <div 
            className="fixed pointer-events-none z-50 opacity-80"
            style={{ 
                left: dragPos.x, top: dragPos.y, 
                transform: 'translate(-50%, -50%) scale(1.2)' 
            }}
          >
              <div className="text-6xl">{CARDS[draggingCard].icon}</div>
          </div>
      )}

    </div>
  );
}