import { create } from 'zustand';
import { GameState, Skill } from '../types/game';

interface GameStore extends GameState {
  // Actions
  updateHumanity: (amount: number) => void;
  updateKIControl: (amount: number) => void;
  updateScore: (amount: number) => void;
  startGame: () => void;
  endGame: (won: boolean) => void;
  resetGame: () => void;
  checkWinLoseConditions: () => void;

  // Skills
  skills: Skill[];
  activateSkill: (skillId: string) => boolean;
  updateSkillCooldowns: (deltaTime: number) => void;

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

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  humanity: 50,
  kiControl: 50,
  score: 0,
  isGameRunning: false,
  isGameWon: false,
  isGameLost: false,
  isPaused: false,
  skills: initialSkills,

  // Actions
  updateHumanity: (amount: number) => {
    set((state) => ({
      humanity: Math.max(0, Math.min(100, state.humanity + amount))
    }));
    get().checkWinLoseConditions();
  },

  updateKIControl: (amount: number) => {
    set((state) => ({
      kiControl: Math.max(0, Math.min(100, state.kiControl + amount))
    }));
    get().checkWinLoseConditions();
  },

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
      humanity: 50,
      kiControl: 50,
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
      humanity: 50,
      kiControl: 50,
      score: 0,
      isGameRunning: false,
      isGameWon: false,
      isGameLost: false,
      skills: initialSkills.map(skill => ({ ...skill, currentCooldown: 0, isActive: false }))
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

  // Helper method
  checkWinLoseConditions: () => {
    const state = get();
    if (state.humanity >= 85 && state.kiControl <= 20) {
      state.endGame(true); // Harmony achieved
    } else if (state.humanity <= 0 || state.kiControl >= 100) {
      state.endGame(false); // Lost
    }
  }
}));
