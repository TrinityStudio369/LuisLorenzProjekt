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
  humanity: number;
  kiControl: number;
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
  NODE = 'node'
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
