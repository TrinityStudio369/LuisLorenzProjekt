interface GameSave {
  id: string;
  timestamp: number;
  score: number;
  playerSize: number;
  allyCount: number;
  gameTime: number;
}

interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
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
  score: number;
  playerSize: number;
  allyCount: number;
  gameTime: number;
}): void => {
  const save: GameSave = {
    id: `save_${Date.now()}`,
    timestamp: Date.now(),
    ...gameState
  };

  const existingSaves = getGameSaves();
  existingSaves.push(save);
  
  // Keep only the last 10 saves
  const recentSaves = existingSaves
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);
  
  localStorage.setItem(STORAGE_KEYS.GAME_SAVES, JSON.stringify(recentSaves));
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

export const deleteGame = (saveId: string): void => {
  const saves = getGameSaves();
  const filteredSaves = saves.filter(save => save.id !== saveId);
  localStorage.setItem(STORAGE_KEYS.GAME_SAVES, JSON.stringify(filteredSaves));
};

// Settings Management
export const saveSettings = (settings: {
  musicVolume: number;
  soundVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  showFPS: boolean;
}): void => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

export const getSettings = (): {
  musicVolume: number;
  soundVolume: number;
  graphicsQuality: 'low' | 'medium' | 'high';
  showFPS: boolean;
} => {
  try {
    const settings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (settings) {
      return JSON.parse(settings);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  
  // Default settings
  return {
    musicVolume: 0.7,
    soundVolume: 0.8,
    graphicsQuality: 'medium',
    showFPS: false
  };
};

// Leaderboard Management
export const addToLeaderboard = (entry: Omit<LeaderboardEntry, 'id' | 'timestamp'>): void => {
  const leaderboard = getLeaderboard();
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `entry_${Date.now()}`,
    timestamp: Date.now()
  };
  
  leaderboard.push(newEntry);
  
  // Keep only top 50 entries
  const topEntries = leaderboard
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);
  
  localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(topEntries));
};

export const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    const leaderboard = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
    if (leaderboard) {
      return JSON.parse(leaderboard);
    }
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
  
  // Return mock data if no leaderboard exists
  if (localStorage.getItem(STORAGE_KEYS.LEADERBOARD) === null) {
    const mockEntries: LeaderboardEntry[] = [
      { id: '1', playerName: 'CellMaster', score: 50000, timestamp: Date.now() - 86400000, achievement: 'Perfect Score' },
      { id: '2', playerName: 'DigitalNomad', score: 45000, timestamp: Date.now() - 172800000 },
      { id: '3', playerName: 'AICrusader', score: 42000, timestamp: Date.now() - 259200000 },
      { id: '4', playerName: 'BalanceKeeper', score: 38000, timestamp: Date.now() - 345600000, achievement: 'Survivor' },
      { id: '5', playerName: 'GameMaster', score: 35000, timestamp: Date.now() - 432000000 }
    ];
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(mockEntries));
    return mockEntries;
  }
  
  return [];
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

export const getAchievements = (): Achievement[] => {
  const achievements: Achievement[] = [
    {
      id: 'first_split',
      name: 'First Division',
      description: 'Split your cell for the first time',
      icon: '🔀',
      unlocked: false
    },
    {
      id: 'massive_cell',
      name: 'Giant Cell',
      description: 'Reach a mass of 100 or more',
      icon: '🔴',
      unlocked: false
    },
    {
      id: 'speed_demon',
      name: 'Speed Demon',
      description: 'Collect 10 speed boost powerups',
      icon: '⚡',
      unlocked: false
    },
    {
      id: 'survivor',
      name: 'Survivor',
      description: 'Survive for 5 minutes without dying',
      icon: '🛡️',
      unlocked: false
    },
    {
      id: 'score_master',
      name: 'Score Master',
      description: 'Reach a score of 50,000',
      icon: '🏆',
      unlocked: false
    }
  ];
  
  return achievements;
};

export const checkAchievements = (gameStats: {
  won: boolean;
  score: number;
  allyCount: number;
  nodesDestroyed: number;
  gameTime: number;
  maxMass: number;
  speedBoostsCollected: number;
}): Achievement[] => {
  const achievements = getAchievements();
  const unlockedAchievements: Achievement[] = [];
  
  achievements.forEach(achievement => {
    if (achievement.unlocked) return;
    
    let shouldUnlock = false;
    
    switch (achievement.id) {
      case 'first_split':
        shouldUnlock = gameStats.maxMass >= 40; // Assuming split at mass 40
        break;
      case 'massive_cell':
        shouldUnlock = gameStats.maxMass >= 100;
        break;
      case 'speed_demon':
        shouldUnlock = gameStats.speedBoostsCollected >= 10;
        break;
      case 'survivor':
        shouldUnlock = gameStats.gameTime >= 300000; // 5 minutes in milliseconds
        break;
      case 'score_master':
        shouldUnlock = gameStats.score >= 50000;
        break;
    }
    
    if (shouldUnlock) {
      achievement.unlocked = true;
      achievement.unlockedAt = Date.now();
      unlockedAchievements.push(achievement);
    }
  });
  
  return unlockedAchievements;
};

// Utility Functions
export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEYS.GAME_SAVES);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.LEADERBOARD);
};

export const exportData = (): string => {
  const data = {
    saves: getGameSaves(),
    settings: getSettings(),
    leaderboard: getLeaderboard()
  };
  return JSON.stringify(data, null, 2);
};

export const importData = (jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData);
    
    if (data.saves) {
      localStorage.setItem(STORAGE_KEYS.GAME_SAVES, JSON.stringify(data.saves));
    }
    if (data.settings) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
    }
    if (data.leaderboard) {
      localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(data.leaderboard));
    }
    
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
};