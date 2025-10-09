import { create } from 'zustand';
import { GameState, Skill } from '../types/game';

export interface PowerUpStatus {
  speedBoost: {
    isActive: boolean;
    multiplier: number;
    timeRemaining: number;
  };
  pointMultiplier: {
    isActive: boolean;
    multiplier: number;
    timeRemaining: number;
  };
  fusionCooldownReduction: {
    isActive: boolean;
    timeRemaining: number;
  };
}

interface GameStore extends GameState {
  // Actions
  updateScore: (amount: number) => void;
  startGame: () => void;
  endGame: (won: boolean) => void;
  resetGame: () => void;

  // Skills
  skills: Skill[];
  activateSkill: (skillId: string) => boolean;
  updateSkillCooldowns: (deltaTime: number) => void;

  // Power-ups
  powerUpStatus: PowerUpStatus;
  updatePowerUpStatus: (status: PowerUpStatus) => void;

  // Game config
  isPaused: boolean;
  togglePause: () => void;
}

const initialSkills: Skill[] = [
  {
    id: 'parley',
    name: 'Parley',
    keybind: 'Q',
    cooldown: 10000, // 10 seconds
    currentCooldown: 0,
    isActive: false
  },
  {
    id: 'stealth',
    name: 'Stealth',
    keybind: 'Shift',
    cooldown: 15000, // 15 seconds
    currentCooldown: 0,
    isActive: false
  },
  {
    id: 'decoy',
    name: 'Decoy',
    keybind: 'E',
    cooldown: 8000, // 8 seconds
    currentCooldown: 0,
    isActive: false
  },
  {
    id: 'breach',
    name: 'Breach',
    keybind: 'F',
    cooldown: 12000, // 12 seconds
    currentCooldown: 0,
    isActive: false
  }
];

const initialPowerUpStatus: PowerUpStatus = {
  speedBoost: {
    isActive: false,
    multiplier: 1.0,
    timeRemaining: 0
  },
  pointMultiplier: {
    isActive: false,
    multiplier: 1.0,
    timeRemaining: 0
  },
  fusionCooldownReduction: {
    isActive: false,
    timeRemaining: 0
  }
};

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  score: 0,
  isGameRunning: false,
  isGameWon: false,
  isGameLost: false,
  isPaused: false,
  skills: initialSkills,
  powerUpStatus: initialPowerUpStatus,

  // Actions
  updateScore: (amount: number) => {
    set((state) => ({
      score: Math.max(0, state.score + amount)
    }));
  },

  startGame: () => {
    set({
      isGameRunning: true,
      isGameWon: false,
      isGameLost: false,
      score: 0
    });
  },

  endGame: (won: boolean) => {
    set({
      isGameRunning: false,
      isGameWon: won,
      isGameLost: !won
    });
  },

  resetGame: () => {
    set({
      score: 0,
      isGameRunning: false,
      isGameWon: false,
      isGameLost: false,
      skills: initialSkills.map(skill => ({ ...skill, currentCooldown: 0, isActive: false })),
      powerUpStatus: initialPowerUpStatus
    });
  },

  activateSkill: (skillId: string) => {
    const skills = get().skills;
    const skill = skills.find(s => s.id === skillId);

    if (!skill || skill.currentCooldown > 0) {
      return false;
    }

    set((state) => ({
      skills: state.skills.map(s =>
        s.id === skillId
          ? { ...s, currentCooldown: s.cooldown, isActive: true, activateTime: Date.now() }
          : s
      )
    }));

    return true;
  },

  updateSkillCooldowns: (deltaTime: number) => {
    set((state) => ({
      skills: state.skills.map(skill => {
        let newCooldown = Math.max(0, skill.currentCooldown - deltaTime);

        // Deactivate skills after their duration
        let isActive = skill.isActive;
        if (skill.isActive && skill.activateTime) {
          const duration = skill.id === 'stealth' ? 5000 : 0; // Stealth lasts 5 seconds
          if (Date.now() - skill.activateTime >= duration) {
            isActive = false;
            newCooldown = skill.cooldown; // Reset cooldown after use
          }
        }

        return {
          ...skill,
          currentCooldown: newCooldown,
          isActive
        };
      })
    }));
  },

  togglePause: () => {
    set((state) => ({
      isPaused: !state.isPaused
    }));
  },

  updatePowerUpStatus: (status: PowerUpStatus) => {
    set({ powerUpStatus: status });
  }
}));
