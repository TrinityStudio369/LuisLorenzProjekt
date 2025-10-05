import { Entity, Camera, Position } from '../types/game';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private entities: Entity[] = [];
  private camera: Camera;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;
    this.camera = camera;
  }

  addEntity(entity: Entity): void {
    this.entities.push(entity);
  }

  removeEntity(entity: Entity): void {
    const index = this.entities.indexOf(entity);
    if (index > -1) {
      this.entities.splice(index, 1);
    }
  }

  clearEntities(): void {
    this.entities = [];
  }

  getEntities(): Entity[] {
    return [...this.entities];
  }

  updateCamera(camera: Camera): void {
    this.camera = camera;
  }

  private update(deltaTime: number): void {
    // Update all entities
    this.entities.forEach(entity => {
      entity.update(deltaTime);
    });
  }

  private draw(): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Save context for camera transform
    this.ctx.save();

    // Apply camera transform (center canvas, apply zoom)
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    this.ctx.translate(-this.camera.x, -this.camera.y);

    // Draw all entities
    this.entities.forEach(entity => {
      entity.draw(this.ctx, this.camera);
    });

    // Restore context
    this.ctx.restore();
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.isRunning) return;

    const deltaTime = (timestamp - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.draw();

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  isGameRunning(): boolean {
    return this.isRunning;
  }

  // Utility method to convert screen coordinates to world coordinates
  screenToWorld(screenPos: Position): Position {
    return {
      x: (screenPos.x - this.canvas.width / 2) / this.camera.zoom + this.camera.x,
      y: (screenPos.y - this.canvas.height / 2) / this.camera.zoom + this.camera.y
    };
  }

  // Utility method to convert world coordinates to screen coordinates
  worldToScreen(worldPos: Position): Position {
    return {
      x: (worldPos.x - this.camera.x) * this.camera.zoom + this.canvas.width / 2,
      y: (worldPos.y - this.camera.y) * this.camera.zoom + this.canvas.height / 2
    };
  }
}


