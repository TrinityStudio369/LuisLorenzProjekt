import { Entity, Position, Velocity, Camera, EntityType } from '../types/game';

// Agar.io Style Entities

export enum AIState {
  FARMING = 'farming',    // Suche nach kleinen Punkten
  HUNTING = 'hunting',    // Jage kleinere Zellen
  FLEEING = 'fleeing'     // Flüchte vor größeren Zellen
}

export class BaseEntity implements Entity {
  id: string;
  position: Position;
  velocity: Velocity;
  size: number;
  color: string;
  type: EntityType;

  constructor(id: string, x: number, y: number, size: number, color: string, type: EntityType) {
    this.id = id;
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.size = size;
    this.color = color;
    this.type = type;
  }

  update(deltaTime: number): void {
    // Update position based on velocity
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Boundary checking - keep entities within 0-3000 world bounds (9x larger)
    const worldMinX = 0;
    const worldMaxX = 3000;
    const worldMinY = 0;
    const worldMaxY = 3000;

    // Stricter boundary checking - prevent going outside bounds completely
    this.position.x = Math.max(worldMinX, Math.min(worldMaxX, this.position.x));
    this.position.y = Math.max(worldMinY, Math.min(worldMaxY, this.position.y));
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const screenX = (this.position.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
    const screenY = (this.position.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
    const screenSize = this.size * camera.zoom;

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
    ctx.fill();

    // Add glow effect
    ctx.shadowColor = this.color;
    ctx.shadowBlur = screenSize * 0.5;
    ctx.fill();
    ctx.restore();
  }
}

export class FoodPellet extends BaseEntity {
  private respawnTime: number = 0;

  constructor(id: string, x: number, y: number) {
    // Zufällige Farbe für Food Pellets
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    super(id, x, y, 3, color, EntityType.DATA_PELLET);
  }

  update(deltaTime: number): void {
    // Food Pellets bewegen sich nicht
    if (this.respawnTime > 0) {
      this.respawnTime -= deltaTime;
      if (this.respawnTime <= 0) {
        // Respawn an zufälliger Position in 0-3000 world
        this.position.x = Math.random() * 3000;
        this.position.y = Math.random() * 3000;
        this.respawnTime = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (this.respawnTime > 0) return; // Versteckt während respawn

    const screenX = (this.position.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
    const screenY = (this.position.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
    const screenSize = Math.max(1, this.size * camera.zoom);

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  getEaten(): void {
    this.respawnTime = 30000; // 30 Sekunden respawn
  }

  getMass(): number {
    return 3; // Food gibt 3 Score/Masse
  }
}

export class Cell extends BaseEntity {
  protected mass: number;
  protected maxSpeed: number = 120; // Even faster - 4x faster at start
  protected targetPosition: Position | null = null;
  protected lastHungerTick: number = 0;
  protected hungerRate: number = 0.1; // Basis Hunger Rate

  constructor(id: string, x: number, y: number, mass: number = 20, type: EntityType) {
    super(id, x, y, Math.sqrt(mass) * 2, '#ffffff', type);
    this.mass = mass;
    this.updateSizeFromMass();
  }

  protected updateSizeFromMass(): void {
    // Größe basiert auf Quadratwurzel der Masse für realistisches Wachstum
    this.size = Math.sqrt(this.mass) * 2;
  }

  update(deltaTime: number): void {
    // For bots: set random targets periodically
    if (this.type === EntityType.DRONE) {
      if (!this.targetPosition || Math.random() < 0.002) { // 0.2% chance per frame to change target (much less frequent)
        // Set random target within larger world bounds (0-3000)
        this.targetPosition = {
          x: Math.random() * 2800 + 100, // 100-2900 to avoid edges
          y: Math.random() * 2800 + 100  // 100-2900 to avoid edges
        };
      }
    }

    // Bewegung zur Zielposition
    if (this.targetPosition) {
      const dx = this.targetPosition.x - this.position.x;
      const dy = this.targetPosition.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0.1) { // Smaller threshold for smoother movement
        // Geschwindigkeit nimmt mit Größe ab (normal speed)
        let speed = this.maxSpeed / Math.sqrt(this.mass / 10);

        // Player gets 3x speed boost for cursor following
        if (this.type === EntityType.PLAYER) {
          speed *= 3; // Much faster cursor following
        }

        const moveX = (dx / distance) * speed * deltaTime;
        const moveY = (dy / distance) * speed * deltaTime;

        // Debug: Log movement for player
        if (this.type === EntityType.PLAYER && Math.random() < 0.01) {
          console.log(`🏃 Player moving: pos(${this.position.x.toFixed(1)},${this.position.y.toFixed(1)}) -> target(${this.targetPosition.x.toFixed(1)},${this.targetPosition.y.toFixed(1)}) speed:${speed.toFixed(1)}`);
        }

        this.position.x += moveX;
        this.position.y += moveY;
      }
    }

    // Hunger System - verliere Masse über Zeit
    this.lastHungerTick += deltaTime;
    if (this.lastHungerTick >= 1000) { // Alle Sekunde
      const hungerLoss = this.mass * this.hungerRate * 0.001; // Größere Zellen verlieren mehr
      this.mass = Math.max(5, this.mass - hungerLoss); // Minimum Masse 5
      this.updateSizeFromMass();
      this.lastHungerTick = 0;
    }

    // Boundary checking - keep entities within reasonable world bounds
    // Since canvas is responsive, we use a large world that contains all possible canvas sizes
    const worldWidth = 4000;
    const worldHeight = 4000;
    this.position.x = Math.max(this.size, Math.min(worldWidth - this.size, this.position.x));
    this.position.y = Math.max(this.size, Math.min(worldHeight - this.size, this.position.y));
  }

  setTarget(target: Position): void {
    this.targetPosition = target;
  }

  addMass(amount: number): void {
    this.mass += amount;
    this.updateSizeFromMass();
  }

  canEat(otherCell: Cell): boolean {
    return this.mass > otherCell.mass * 1.1; // Muss 10% größer sein
  }

  getMass(): number {
    return this.mass;
  }

  getScore(): number {
    return Math.floor(this.mass);
  }
}

export class PlayerCell extends Cell {
  private playerName: string;
  private splitCells: PlayerCell[] = [];
  private splitCooldown: number = 0;
  private splitDuration: number = 15000; // 15 Sekunden bis Fusion

  constructor(id: string, x: number, y: number, playerName: string, mass: number = 20) {
    super(id, x, y, mass, EntityType.PLAYER);
    this.playerName = playerName;
  }

  update(deltaTime: number): void {
    super.update(deltaTime);

    // Update split cells
    this.splitCells.forEach(cell => cell.update(deltaTime));

    // Handle split cooldown
    if (this.splitCooldown > 0) {
      this.splitCooldown -= deltaTime;
    }

    // Check for fusion (15 seconds after split)
    if (this.splitCells.length > 0 && this.splitCooldown <= 0) {
      console.log(`🔄 Auto-fusion after 15 seconds! Fusing ${this.splitCells.length + 1} cells together...`);
      this.fuseSplitCells();
    } else if (this.splitCells.length > 0 && Math.random() < 0.02) { // Log more frequently
      console.log(`⏱️ Split cooldown: ${(this.splitCooldown / 1000).toFixed(1)}s | ${this.splitCells.length} split cells`);
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Draw split cells first
    this.splitCells.forEach(cell => cell.draw(ctx, camera));

    // Draw main cell
    const screenX = (this.position.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
    const screenY = (this.position.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
    const screenSize = this.size * camera.zoom;

    ctx.save();

    // Gradient background für Player
    const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, screenSize);
    gradient.addColorStop(0, '#00ffff');
    gradient.addColorStop(0.7, '#0080ff');
    gradient.addColorStop(1, '#004080');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Player Name
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(12, screenSize / 3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.playerName, screenX, screenY);

    ctx.restore();
  }

  split(): boolean {
    if (this.splitCooldown > 0 || this.mass < 40 || this.splitCells.length >= 16) return false; // Max 16 Split-Zellen

    // Teile in zwei Zellen
    const splitMass = this.mass / 2;
    this.mass = splitMass;
    this.updateSizeFromMass();

    // Erstelle zweite Zelle mit Katapult-Effekt
    const direction = this.targetPosition ?
      Math.atan2(this.targetPosition.y - this.position.y, this.targetPosition.x - this.position.x) :
      Math.random() * Math.PI * 2; // Random direction if no target

    // Katapult-Distanz und -Geschwindigkeit
    const launchDistance = this.size * 3; // Weiter weg starten
    const launchSpeed = 200; // Starke Initialgeschwindigkeit

    const splitX = this.position.x + Math.cos(direction) * launchDistance;
    const splitY = this.position.y + Math.sin(direction) * launchDistance;

    const splitCell = new PlayerCell(
      `${this.id}_split_${Date.now()}`,
      splitX,
      splitY,
      this.playerName,
      splitMass
    );

    // Katapult-Impuls: Stark nach vorne schleudern
    const launchTargetX = splitX + Math.cos(direction) * launchSpeed;
    const launchTargetY = splitY + Math.sin(direction) * launchSpeed;

    splitCell.setTarget({
      x: launchTargetX,
      y: launchTargetY
    });

    // Setze die Haupzelle auch in Bewegung (aber weniger stark)
    this.setTarget({
      x: this.position.x - Math.cos(direction) * 50, // Zurückstoß
      y: this.position.y - Math.sin(direction) * 50
    });

    this.splitCells.push(splitCell);
    this.splitCooldown = this.splitDuration;

    console.log(`💥 SPLIT! Cell launched to (${launchTargetX.toFixed(1)}, ${launchTargetY.toFixed(1)})`);
    return true;
  }

  private fuseSplitCells(): void {
    if (this.splitCells.length === 0) return;

    // Sammle Masse von allen Split-Zellen
    let totalMass = this.mass;
    this.splitCells.forEach(cell => {
      totalMass += cell.getMass();
    });

    // Setze neue Position als Durchschnitt
    let avgX = this.position.x;
    let avgY = this.position.y;

    this.splitCells.forEach(cell => {
      avgX += cell.position.x;
      avgY += cell.position.y;
    });

    this.position.x = avgX / (this.splitCells.length + 1);
    this.position.y = avgY / (this.splitCells.length + 1);

    // Setze neue Masse
    this.mass = totalMass;
    this.updateSizeFromMass();

    // Entferne Split-Zellen
    this.splitCells = [];
  }

  getAllCells(): Cell[] {
    return [this, ...this.splitCells];
  }

  setAllTargets(target: Position): void {
    // Set target for main cell
    this.setTarget(target);
    // Set target for all split cells
    this.splitCells.forEach(cell => cell.setTarget(target));
  }

  getTotalMass(): number {
    return this.mass + this.splitCells.reduce((sum, cell) => sum + cell.mass, 0);
  }

  getTargetPosition(): Position | null {
    return this.targetPosition;
  }

  getTotalScore(): number {
    return Math.floor(this.getTotalMass());
  }

  canSplit(): boolean {
    return this.splitCooldown <= 0 && this.mass >= 40;
  }

  getSplitCooldownProgress(): number {
    return this.splitCooldown / this.splitDuration;
  }
}

export class BotCell extends Cell {
  private aiState: AIState = AIState.FARMING;
  private stateTimer: number = 0;
  private targetEntity: Entity | null = null;
  private gradientColors: string[];

  constructor(id: string, x: number, y: number, mass: number = 20) {
    super(id, x, y, mass, EntityType.DRONE);

    // Zufällige Gradient Farben für Bots
    this.gradientColors = this.generateRandomColors();
  }

  private generateRandomColors(): string[] {
    const colorSets = [
      ['#ff6b6b', '#ff4757', '#ff3838'],
      ['#4ecdc4', '#26d0ce', '#1abc9c'],
      ['#45b7d1', '#3498db', '#2980b9'],
      ['#96ceb4', '#87d068', '#6fba2c'],
      ['#ffeaa7', '#feca57', '#ff9f43'],
      ['#dda0dd', '#9c88ff', '#8c7ae6'],
      ['#98d8c8', '#7bed9f', '#2ed573']
    ];

    return colorSets[Math.floor(Math.random() * colorSets.length)];
  }

  update(deltaTime: number): void {
    this.updateAI(deltaTime);
    super.update(deltaTime);
  }

  private updateAI(deltaTime: number): void {
    this.stateTimer += deltaTime;

    // Wechsle AI State alle 3-8 Sekunden
    if (this.stateTimer > 3000 + Math.random() * 5000) {
      this.chooseNewState();
      this.stateTimer = 0;
    }

    // Führe AI Logik aus
    switch (this.aiState) {
      case AIState.FARMING:
        this.farmAI();
        break;
      case AIState.HUNTING:
        this.huntAI();
        break;
      case AIState.FLEEING:
        this.fleeAI();
        break;
    }
  }

  private chooseNewState(): void {
    const rand = Math.random();

    if (rand < 0.5) {
      this.aiState = AIState.FARMING;
    } else if (rand < 0.8) {
      this.aiState = AIState.HUNTING;
    } else {
      this.aiState = AIState.FLEEING;
    }
  }

  private farmAI(): void {
    // Suche nach nächstem Food Pellet (vereinfacht - würde normalerweise nach Entities suchen)
    if (!this.targetPosition) {
      // Zufällige Bewegung
      this.setTarget({
        x: this.position.x + (Math.random() - 0.5) * 200,
        y: this.position.y + (Math.random() - 0.5) * 200
      });
    }
  }

  private huntAI(): void {
    // Suche nach kleineren Zellen (vereinfacht)
    if (!this.targetPosition) {
      this.setTarget({
        x: this.position.x + (Math.random() - 0.5) * 300,
        y: this.position.y + (Math.random() - 0.5) * 300
      });
    }
  }

  private fleeAI(): void {
    // Flüchte von größeren Zellen (vereinfacht)
    if (!this.targetPosition) {
      this.setTarget({
        x: this.position.x + (Math.random() - 0.5) * 400,
        y: this.position.y + (Math.random() - 0.5) * 400
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const screenX = (this.position.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
    const screenY = (this.position.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
    const screenSize = this.size * camera.zoom;

    ctx.save();

    // Gradient für Bots
    const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, screenSize);
    gradient.addColorStop(0, this.gradientColors[0]);
    gradient.addColorStop(0.7, this.gradientColors[1]);
    gradient.addColorStop(1, this.gradientColors[2]);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
    ctx.fill();

    // AI State Indicator
    ctx.strokeStyle = this.getStateColor();
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  private getStateColor(): string {
    switch (this.aiState) {
      case AIState.FARMING: return '#00ff00';
      case AIState.HUNTING: return '#ff0000';
      case AIState.FLEEING: return '#ffff00';
      default: return '#ffffff';
    }
  }

  getAIState(): AIState {
    return this.aiState;
  }
}
