export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  position: Position;
  size: number;
  color: string;
  update(deltaTime: number): void;
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface GameState {
  score: number;
  isGameRunning: boolean;
  isGameWon: boolean;
  isGameLost: boolean;
}

export interface Skill {
  id: string;
  name: string;
  keybind: string;
  cooldown: number;
  currentCooldown: number;
  isActive: boolean;
  activateTime?: number;
}

export enum EntityType {
  PLAYER = 'player',
  DRONE = 'drone',
  DATA_PELLET = 'data_pellet',
  CIV = 'civ',
  ALLY = 'ally',
  NODE = 'node',
  SPEED_BOOST = 'speed_boost',
  BOSS_BOT = 'boss_bot',
  POINT_MULTIPLIER = 'point_multiplier',
  FUSION_POWER = 'fusion_power'
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  worldWidth: number;
  worldHeight: number;
  worldBounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  playerStartSize: number;
  pelletCount: number;
  droneCount: number;
  civCount: number;
  nodeCount: number;
}

export interface Particle {
  position: Position;
  velocity: Velocity;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface SplitAnimation {
  id: string;
  startPosition: Position;
  endPosition: Position;
  progress: number;
  duration: number;
  type: 'split' | 'merge';
}

export interface MergeAnimation {
  id: string;
  cells: Position[];
  centerPosition: Position;
  progress: number;
  duration: number;
}

export interface EatingAnimation {
  id: string;
  entityId: string;
  startScale: number;
  targetScale: number;
  progress: number;
  duration: number;
}

export interface SplitScaleAnimation {
  id: string;
  entityId: string;
  startScale: number;
  targetScale: number;
  progress: number;
  duration: number;
}

export interface SpeedBoost {
  id: string;
  startTime: number;
  duration: number;
  multiplier: number;
}

export interface SpawnAnimation {
  id: string;
  position: Position;
  startTime: number;
  duration: number;
  maxRadius: number;
  color: string;
}
