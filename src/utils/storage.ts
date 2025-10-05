interface GameSave {
  id: string;
  timestamp: number;
  humanity: number;
  kiControl: number;
  score: number;
  playerSize: number;
  allyCount: number;
  gameTime: number;
}

interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  humanity: number;
  kiControl: number;
  timestamp: number;
  achievement?: string;
}

const STORAGE_KEYS = {
  GAME_SAVES: 'louig_i_game_saves',
  SETTINGS: 'louig_i_settings',
  LEADERBOARD: 'louig_i_leaderboard'
};

// Game Save Management
export const saveGame = (gameState: {
  humanity: number;
  kiControl: number;
  score: number;
  playerSize: number;
  allyCount: number;
  gameTime: number;
}): string => {
  const save: GameSave = {
    id: generateId(),
    timestamp: Date.now(),
    ...gameState
  };

  const saves = getGameSaves();
  saves.push(save);

  // Keep only the 5 most recent saves
  if (saves.length > 5) {
    saves.sort((a, b) => b.timestamp - a.timestamp);
    saves.splice(5);
  }

  localStorage.setItem(STORAGE_KEYS.GAME_SAVES, JSON.stringify(saves));
  return save.id;
};

export const getGameSaves = (): GameSave[] => {
  try {
    const saves = localStorage.getItem(STORAGE_KEYS.GAME_SAVES);
    return saves ? JSON.parse(saves) : [];
  } catch (error) {
    console.error('Error loading game saves:', error);
    return [];
  }
};

export const loadGame = (saveId: string): GameSave | null => {
  const saves = getGameSaves();
  return saves.find(save => save.id === saveId) || null;
};

export const deleteGameSave = (saveId: string): void => {
  const saves = getGameSaves().filter(save => save.id !== saveId);
  localStorage.setItem(STORAGE_KEYS.GAME_SAVES, JSON.stringify(saves));
};

// Settings Management
interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  particlesEnabled: boolean;
  showIntro: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
}

const defaultSettings: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  particlesEnabled: true,
  showIntro: true,
  difficulty: 'normal'
};

export const getSettings = (): GameSettings => {
  try {
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return settings ? { ...defaultSettings, ...JSON.parse(settings) } : defaultSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    return defaultSettings;
  }
};

export const saveSettings = (settings: Partial<GameSettings>): void => {
  const currentSettings = getSettings();
  const newSettings = { ...currentSettings, ...settings };
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(newSettings));
};

// Leaderboard Management (Mock API)
export const submitScore = async (entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const leaderboardEntry: LeaderboardEntry = {
    ...entry,
    id: generateId(),
    timestamp: Date.now()
  };

  const leaderboard = getLeaderboard();
  leaderboard.push(leaderboardEntry);

  // Sort by score descending and keep top 100
  leaderboard.sort((a, b) => b.score - a.score);
  if (leaderboard.length > 100) {
    leaderboard.splice(100);
  }

  localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(leaderboard));
};

export const getLeaderboard = (limit: number = 50): LeaderboardEntry[] => {
  try {
    const leaderboard = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
    const entries: LeaderboardEntry[] = leaderboard ? JSON.parse(leaderboard) : [];

    // Add some mock data if empty
    if (entries.length === 0) {
      const mockEntries: LeaderboardEntry[] = [
        { id: '1', playerName: 'HarmonySeeker', score: 50000, humanity: 95, kiControl: 15, timestamp: Date.now() - 86400000, achievement: 'Perfect Balance' },
        { id: '2', playerName: 'CellMaster', score: 45000, humanity: 85, kiControl: 25, timestamp: Date.now() - 172800000 },
        { id: '3', playerName: 'DigitalNomad', score: 42000, humanity: 78, kiControl: 35, timestamp: Date.now() - 259200000 },
        { id: '4', playerName: 'AICrusader', score: 38000, humanity: 92, kiControl: 20, timestamp: Date.now() - 345600000, achievement: 'Humanity Champion' },
        { id: '5', playerName: 'BalanceKeeper', score: 35000, humanity: 88, kiControl: 22, timestamp: Date.now() - 432000000 }
      ];
      localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(mockEntries));
      return mockEntries.slice(0, limit);
    }

    return entries.slice(0, limit);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    return [];
  }
};

export const getPlayerRank = (score: number): number => {
  const leaderboard = getLeaderboard(1000);
  const rank = leaderboard.findIndex(entry => entry.score <= score);
  return rank === -1 ? leaderboard.length + 1 : rank + 1;
};

// Achievement System
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_win',
    name: 'First Harmony',
    description: 'Achieve your first harmonious victory',
    icon: '🏆',
    unlocked: false
  },
  {
    id: 'high_scorer',
    name: 'Score Master',
    description: 'Reach a score of 50,000 points',
    icon: '⭐',
    unlocked: false
  },
  {
    id: 'humanity_champion',
    name: 'Humanity Champion',
    description: 'Win with Humanity at 90% or higher',
    icon: '❤️',
    unlocked: false
  },
  {
    id: 'shutdown_specialist',
    name: 'Shutdown Specialist',
    description: 'Win by achieving total KI shutdown',
    icon: '⚡',
    unlocked: false
  },
  {
    id: 'ally_commander',
    name: 'Ally Commander',
    description: 'Recruit 10 allies in a single game',
    icon: '👥',
    unlocked: false
  },
  {
    id: 'node_breaker',
    name: 'Node Breaker',
    description: 'Destroy 20 nodes in total',
    icon: '💥',
    unlocked: false
  }
];

export const checkAchievements = (gameStats: {
  won: boolean;
  score: number;
  humanity: number;
  kiControl: number;
  allyCount: number;
  nodesDestroyed: number;
}): Achievement[] => {
  const unlockedAchievements: Achievement[] = [];
  const currentAchievements = getAchievements();

  ACHIEVEMENTS.forEach(achievement => {
    if (!achievement.unlocked) {
      let shouldUnlock = false;

      switch (achievement.id) {
        case 'first_win':
          shouldUnlock = gameStats.won;
          break;
        case 'high_scorer':
          shouldUnlock = gameStats.score >= 50000;
          break;
        case 'humanity_champion':
          shouldUnlock = gameStats.won && gameStats.humanity >= 90;
          break;
        case 'shutdown_specialist':
          shouldUnlock = gameStats.won && gameStats.kiControl === 0;
          break;
        case 'ally_commander':
          shouldUnlock = gameStats.allyCount >= 10;
          break;
        case 'node_breaker':
          shouldUnlock = gameStats.nodesDestroyed >= 20;
          break;
      }

      if (shouldUnlock) {
        const unlockedAchievement = {
          ...achievement,
          unlocked: true,
          unlockedAt: Date.now()
        };
        unlockedAchievements.push(unlockedAchievement);
      }
    }
  });

  // Save unlocked achievements
  if (unlockedAchievements.length > 0) {
    const updatedAchievements = currentAchievements.map(ach =>
      unlockedAchievements.find(unlocked => unlocked.id === ach.id) || ach
    );
    localStorage.setItem('louig_i_achievements', JSON.stringify(updatedAchievements));
  }

  return unlockedAchievements;
};

export const getAchievements = (): Achievement[] => {
  try {
    const achievements = localStorage.getItem('louig_i_achievements');
    return achievements ? JSON.parse(achievements) : ACHIEVEMENTS.map(a => ({ ...a }));
  } catch (error) {
    console.error('Error loading achievements:', error);
    return ACHIEVEMENTS.map(a => ({ ...a }));
  }
};

// Utility functions
const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
};

// Export types
export type { GameSave, LeaderboardEntry, GameSettings };
// Achievement is already exported as an interface above
