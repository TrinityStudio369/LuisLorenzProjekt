import { Entity, Position, Velocity, Camera, EntityType, SplitAnimation, MergeAnimation, EatingAnimation, SplitScaleAnimation, SpeedBoost, SpawnAnimation } from '../types/game';

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
  protected maxSpeed: number = 250; // Faster base speed for better responsiveness
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

      if (distance > 1) { // Minimum distance threshold
        // Geschwindigkeit nimmt mit Größe ab, aber weniger extrem
        // Verwende eine sanftere Formel: speed = maxSpeed * (1 / (1 + mass/100))
        let speed = this.maxSpeed * (1 / (1 + this.mass / 100));

        // Player gets 2x speed boost for cursor following
        if (this.type === EntityType.PLAYER) {
          speed *= 2; // Faster cursor following
          
          // Apply speed boost if active
          if (this instanceof PlayerCell) {
            speed *= this.getSpeedMultiplier();
          }
        }

        // Calculate movement with proper delta time (deltaTime is in milliseconds)
        const moveX = (dx / distance) * speed * (deltaTime / 1000); // Convert to seconds
        const moveY = (dy / distance) * speed * (deltaTime / 1000); // Convert to seconds

        // Debug: Log movement for player (reduced frequency)
        if (this.type === EntityType.PLAYER && Math.random() < 0.005) {
          console.log(`🏃 Player moving: pos(${this.position.x.toFixed(1)},${this.position.y.toFixed(1)}) -> target(${this.targetPosition.x.toFixed(1)},${this.targetPosition.y.toFixed(1)}) speed:${speed.toFixed(1)} dist:${distance.toFixed(1)}`);
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

  addMass(amount: number, fromEnemy: boolean = false): void {
    this.mass += amount;
    this.updateSizeFromMass();
    
    // Start eating animation when gaining mass from eating (not from hunger loss)
    // Only start eating animation for bots, not for food pellets or other entities
    if (amount > 0 && this.type === EntityType.DRONE) {
      this.startEatingAnimation();
    }
  }

  // Default implementation - can be overridden by subclasses
  protected startEatingAnimation(): void {
    // Default implementation does nothing
    // Subclasses can override this method
  }

  // Default implementation for speed boost from triangles
  public startSpeedBoostFromTriangle(multiplier: number, duration: number): void {
    // Default implementation does nothing
    // Subclasses can override this method
  }

  // Default implementation for point multiplier
  public startPointMultiplier(multiplier: number, duration: number): void {
    // Default implementation does nothing
    // Subclasses can override this method
  }

  // Default implementation for fusion power
  public startFusionPower(): void {
    // Default implementation does nothing
    // Subclasses can override this method
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
  public splitCells: PlayerCell[] = [];
  private splitCooldown: number = 0; // Cooldown bis zum nächsten Split
  private fusionCooldown: number = 0; // Cooldown bis zur Fusion
  private splitDuration: number = 15000; // 15 Sekunden bis Fusion
  private splitLevel: number = 0; // Wie oft gesplittet wurde
  private maxSplitLevel: number = 4; // Maximum 4 Splits (16 Zellen)
  private splitAnimations: SplitAnimation[] = [];
  private mergeAnimations: MergeAnimation[] = [];
  private eatingAnimations: EatingAnimation[] = [];
  private splitScaleAnimations: SplitScaleAnimation[] = [];
  private speedBoosts: SpeedBoost[] = [];
  private pointMultipliers: SpeedBoost[] = [];
  private isMerging: boolean = false;
  private fusionCooldownReduced: boolean = false;

  constructor(id: string, x: number, y: number, playerName: string, mass: number = 20) {
    super(id, x, y, mass, EntityType.PLAYER);
    this.playerName = playerName;
  }

  // Copy constructor for split cells to inherit animations and boosts
  static createSplitCell(id: string, x: number, y: number, playerName: string, mass: number, parentCell: PlayerCell): PlayerCell {
    const splitCell = new PlayerCell(id, x, y, playerName, mass);
    
    // Copy speed boosts from parent
    splitCell.speedBoosts = [...parentCell.speedBoosts];
    
    // Copy point multipliers from parent
    splitCell.pointMultipliers = [...parentCell.pointMultipliers];
    
    // Copy split scale animations from parent
    splitCell.splitScaleAnimations = [...parentCell.splitScaleAnimations];
    
    return splitCell;
  }

  update(deltaTime: number): void {
    super.update(deltaTime);

    // Update split cells
    this.splitCells.forEach(cell => {
      // Apply speed boost to split cells
      const speedMultiplier = cell.getSpeedMultiplier();
      const originalMaxSpeed = cell.maxSpeed;
      cell.maxSpeed = originalMaxSpeed * speedMultiplier;
      
      cell.update(deltaTime);
      // Update animations for split cells
      cell.updateAnimations(deltaTime);
      
      // Restore original speed
      cell.maxSpeed = originalMaxSpeed;
    });

    // Update animations
    this.updateAnimations(deltaTime);

    // Handle split cooldown (time until next split)
    if (this.splitCooldown > 0) {
      this.splitCooldown -= deltaTime;
    }

    // Handle fusion cooldown (time until fusion)
    if (this.fusionCooldown > 0) {
      this.fusionCooldown -= deltaTime;
    }

    // Check for fusion - only when fusion cooldown is ready AND we have split cells
    if (this.splitCells.length > 0 && this.fusionCooldown <= 0 && !this.isMerging) {
      const fusionTime = this.getFusionTime();
      console.log(`🔄 Auto-fusion after ${fusionTime/1000}s! Fusing ${this.splitCells.length + 1} cells together...`);
      this.startMergeAnimation();
    } else if (this.splitCells.length > 0 && Math.random() < 0.02) { // Log more frequently
      console.log(`⏱️ Split cooldown: ${(this.splitCooldown / 1000).toFixed(1)}s | Fusion cooldown: ${(this.fusionCooldown / 1000).toFixed(1)}s | Split level: ${this.splitLevel} | ${this.splitCells.length} split cells`);
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Draw merge animations first
    this.drawMergeAnimations(ctx, camera);

    // Draw split cells with animations
    this.splitCells.forEach(cell => {
      // Apply split scale animation to split cells
      const originalSize = cell.size;
      const splitScale = cell.getSplitScale();
      cell.size = originalSize * splitScale;
      
      cell.draw(ctx, camera);
      
      // Restore original size
      cell.size = originalSize;
    });

    // Draw split animations
    this.drawSplitAnimations(ctx, camera);

    // Draw main cell
    const screenX = (this.position.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
    const screenY = (this.position.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
    const eatingScale = this.getEatingScale();
    const splitScale = this.getSplitScale();
    const screenSize = this.size * camera.zoom * eatingScale * splitScale;

    ctx.save();

    // Enhanced gradient based on split level
    const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, screenSize);
    if (this.splitLevel === 0) {
      gradient.addColorStop(0, '#00ffff');
      gradient.addColorStop(0.7, '#0080ff');
      gradient.addColorStop(1, '#004080');
    } else if (this.splitLevel === 1) {
      gradient.addColorStop(0, '#ff00ff');
      gradient.addColorStop(0.7, '#8000ff');
      gradient.addColorStop(1, '#400080');
    } else if (this.splitLevel === 2) {
      gradient.addColorStop(0, '#ffff00');
      gradient.addColorStop(0.7, '#ff8000');
      gradient.addColorStop(1, '#804000');
    } else {
      gradient.addColorStop(0, '#ff0000');
      gradient.addColorStop(0.7, '#800000');
      gradient.addColorStop(1, '#400000');
    }

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
    ctx.fill();

    // Enhanced border with split level indicator
    ctx.strokeStyle = this.splitLevel > 0 ? '#ffff00' : '#ffffff';
    ctx.lineWidth = 2 + this.splitLevel;
    ctx.stroke();

    // Split level indicator - only show if we have split cells
    if (this.splitLevel > 0 && this.splitCells.length > 0) {
      ctx.fillStyle = '#ffff00';
      ctx.font = `${Math.max(10, screenSize / 4)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`L${this.splitLevel}`, screenX, screenY - screenSize - 5);
    }

    // Player Name
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(12, screenSize / 3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.playerName, screenX, screenY);

    ctx.restore();
  }

  private drawSplitAnimations(ctx: CanvasRenderingContext2D, camera: Camera): void {
    this.splitAnimations.forEach(anim => {
      const progress = anim.progress;
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      // Draw expanding ring effect
      const screenX = (anim.startPosition.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
      const screenY = (anim.startPosition.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
      const ringSize = (20 + easeProgress * 100) * camera.zoom;
      
      ctx.save();
      ctx.strokeStyle = `rgba(0, 255, 255, ${1 - progress})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, ringSize, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw particles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const particleX = screenX + Math.cos(angle) * ringSize;
        const particleY = screenY + Math.sin(angle) * ringSize;
        
        ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress})`;
        ctx.beginPath();
        ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });
  }

  private drawMergeAnimations(ctx: CanvasRenderingContext2D, camera: Camera): void {
    this.mergeAnimations.forEach(anim => {
      const progress = anim.progress;
      const easeProgress = 1 - Math.pow(1 - progress, 2); // Ease out quad
      
      // Draw converging effect
      const centerScreenX = (anim.centerPosition.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
      const centerScreenY = (anim.centerPosition.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
      
      ctx.save();
      
      // Draw energy lines connecting cells to center
      anim.cells.forEach((cellPos, index) => {
        const cellScreenX = (cellPos.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
        const cellScreenY = (cellPos.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
        
        const currentX = cellScreenX + (centerScreenX - cellScreenX) * easeProgress;
        const currentY = cellScreenY + (centerScreenY - cellScreenY) * easeProgress;
        
        ctx.strokeStyle = `rgba(255, 255, 0, ${1 - progress * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cellScreenX, cellScreenY);
        ctx.lineTo(currentX, currentY);
        ctx.stroke();
      });
      
      // Draw center explosion effect
      const explosionSize = progress * 50 * camera.zoom;
      const gradient = ctx.createRadialGradient(centerScreenX, centerScreenY, 0, centerScreenX, centerScreenY, explosionSize);
      gradient.addColorStop(0, `rgba(255, 255, 0, ${1 - progress})`);
      gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerScreenX, centerScreenY, explosionSize, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    });
  }

  split(): boolean {
    // Check if we can split (progressive requirements)
    const requiredMass = 40 + (this.splitLevel * 20); // More mass needed for higher levels
    const maxCells = Math.pow(2, this.splitLevel + 1); // 2, 4, 8, 16 cells max
    
    if (this.splitCooldown > 0 || this.mass < requiredMass || this.splitCells.length >= maxCells || this.splitLevel >= this.maxSplitLevel) {
      console.log(`❌ Cannot split: cooldown=${this.splitCooldown.toFixed(1)}ms, mass=${this.mass.toFixed(1)}/${requiredMass}, cells=${this.splitCells.length}/${maxCells}, level=${this.splitLevel}/${this.maxSplitLevel}`);
      return false;
    }

    // Calculate split mass (progressive splitting)
    const splitMass = this.mass / 2;
    this.mass = splitMass;
    this.updateSizeFromMass();

    // Start split scale animation
    this.startSplitScaleAnimation();

    // Start speed boost
    this.startSpeedBoost();

    // Create split animation
    this.startSplitAnimation();

    // Erstelle neue Split-Zellen (alle bestehenden + neue)
    const newSplitCells: PlayerCell[] = [];
    
    // Split all existing cells - spawn from inside and shoot forward
    this.splitCells.forEach(cell => {
      const cellMass = cell.getMass() / 2;
      cell.mass = cellMass;
      cell.updateSizeFromMass();
      
      // Create new cell for each existing cell - spawn from inside the cell
      const direction = this.targetPosition ?
        Math.atan2(this.targetPosition.y - cell.position.y, this.targetPosition.x - cell.position.x) :
        Math.random() * Math.PI * 2;
      
      // Spawn from inside the cell (at the center)
      const newX = cell.position.x;
      const newY = cell.position.y;
      
      const newCell = PlayerCell.createSplitCell(
        `${cell.id}_split_${Date.now()}`,
        newX,
        newY,
        this.playerName,
        cellMass,
        this
      );
      
      // Shoot forward with high speed
      const launchSpeed = 400; // High launch speed
      newCell.setTarget({
        x: newX + Math.cos(direction) * launchSpeed,
        y: newY + Math.sin(direction) * launchSpeed
      });
      
      newSplitCells.push(newCell);
    });

    // Split main cell - spawn from inside and shoot forward
    const direction = this.targetPosition ?
      Math.atan2(this.targetPosition.y - this.position.y, this.targetPosition.x - this.position.x) :
      Math.random() * Math.PI * 2;

    // Spawn from inside the main cell (at the center)
    const splitX = this.position.x;
    const splitY = this.position.y;

    const splitCell = PlayerCell.createSplitCell(
      `${this.id}_split_${Date.now()}`,
      splitX,
      splitY,
      this.playerName,
      splitMass,
      this
    );

    // Shoot forward with high speed
    const launchSpeed = 400; // High launch speed
    splitCell.setTarget({
      x: splitX + Math.cos(direction) * launchSpeed,
      y: splitY + Math.sin(direction) * launchSpeed
    });

    // Add all new cells
    this.splitCells.push(...newSplitCells, splitCell);
    
    // Update split level and cooldowns
    this.splitLevel++;
    this.splitCooldown = this.getSplitCooldown();
    this.fusionCooldown = this.getFusionTime(); // Set fusion cooldown
    this.splitDuration = this.getFusionTime();

    console.log(`💥 SPLIT LEVEL ${this.splitLevel}! Created ${newSplitCells.length + 1} new cells. Total: ${this.splitCells.length + 1} cells. Split cooldown: ${(this.splitCooldown/1000).toFixed(1)}s, Fusion in: ${(this.fusionCooldown/1000).toFixed(1)}s, Speed boost active!`);
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

    // Reset split level and cooldowns
    this.splitLevel = 0;
    this.splitCooldown = 0;
    this.fusionCooldown = 0;
    this.splitDuration = 15000; // Reset to base fusion time

    // Entferne Split-Zellen
    this.splitCells = [];
    this.isMerging = false;
    
    console.log(`🔄 FUSION COMPLETE! Total mass: ${totalMass.toFixed(1)}, Split level reset to 0`);
  }

  private getSplitCooldown(): number {
    // Progressive cooldown: 7.5s for subsequent splits
    return this.splitLevel > 0 ? 7500 : 0;
  }

  private getFusionTime(): number {
    // Progressive fusion time: 15s, 30s, 60s, 120s
    const baseTime = 15000;
    return baseTime * Math.pow(2, this.splitLevel);
  }

  private startSplitAnimation(): void {
    // Create split animation effect
    const animation: SplitAnimation = {
      id: `split_${Date.now()}`,
      startPosition: { ...this.position },
      endPosition: { ...this.position },
      progress: 0,
      duration: 500, // 0.5 seconds
      type: 'split'
    };
    this.splitAnimations.push(animation);
  }

  private startMergeAnimation(): void {
    if (this.isMerging) return;
    
    this.isMerging = true;
    const allPositions = [this.position, ...this.splitCells.map(cell => cell.position)];
    const centerX = allPositions.reduce((sum, pos) => sum + pos.x, 0) / allPositions.length;
    const centerY = allPositions.reduce((sum, pos) => sum + pos.y, 0) / allPositions.length;
    
    const animation: MergeAnimation = {
      id: `merge_${Date.now()}`,
      cells: allPositions,
      centerPosition: { x: centerX, y: centerY },
      progress: 0,
      duration: 1000 // 1 second merge animation
    };
    this.mergeAnimations.push(animation);
  }

  public updateAnimations(deltaTime: number): void {
    // Update split animations
    this.splitAnimations = this.splitAnimations.filter(anim => {
      anim.progress += deltaTime / anim.duration;
      return anim.progress < 1;
    });

    // Update merge animations
    this.mergeAnimations = this.mergeAnimations.filter(anim => {
      anim.progress += deltaTime / anim.duration;
      if (anim.progress >= 1) {
        this.fuseSplitCells();
        return false;
      }
      return true;
    });

    // Update eating animations
    this.eatingAnimations = this.eatingAnimations.filter(anim => {
      anim.progress += deltaTime / anim.duration;
      return anim.progress < 1;
    });

    // Update split scale animations
    this.splitScaleAnimations = this.splitScaleAnimations.filter(anim => {
      anim.progress += deltaTime / anim.duration;
      return anim.progress < 1;
    });

    // Update speed boosts
    this.speedBoosts = this.speedBoosts.filter(boost => {
      return (Date.now() - boost.startTime) < boost.duration;
    });

    // Update point multipliers
    this.pointMultipliers = this.pointMultipliers.filter(boost => {
      return (Date.now() - boost.startTime) < boost.duration;
    });
  }

  protected startEatingAnimation(): void {
    // Create eating animation effect
    const animation: EatingAnimation = {
      id: `eating_${Date.now()}`,
      entityId: this.id,
      startScale: 1.0,
      targetScale: 1.1,
      progress: 0,
      duration: 200 // 0.2 seconds
    };
    this.eatingAnimations.push(animation);
  }

  private getEatingScale(): number {
    if (this.eatingAnimations.length === 0) return 1.0;
    
    // Get the most recent eating animation
    const latestAnimation = this.eatingAnimations[this.eatingAnimations.length - 1];
    const progress = latestAnimation.progress;
    
    // Ease out animation
    const easeProgress = 1 - Math.pow(1 - progress, 2);
    return latestAnimation.startScale + (latestAnimation.targetScale - latestAnimation.startScale) * easeProgress;
  }

  public getSplitScale(): number {
    if (this.splitScaleAnimations.length === 0) return 1.0;
    
    // Get the most recent split scale animation
    const latestAnimation = this.splitScaleAnimations[this.splitScaleAnimations.length - 1];
    const progress = latestAnimation.progress;
    
    // Ease out animation
    const easeProgress = 1 - Math.pow(1 - progress, 2);
    return latestAnimation.startScale + (latestAnimation.targetScale - latestAnimation.startScale) * easeProgress;
  }

  public getSpeedMultiplier(): number {
    if (this.speedBoosts.length === 0) return 1.0;
    
    // Get the most recent speed boost
    const latestBoost = this.speedBoosts[this.speedBoosts.length - 1];
    return latestBoost.multiplier;
  }

  public getPointMultiplier(): number {
    if (this.pointMultipliers.length === 0) return 1.0;
    
    // Get the most recent point multiplier
    const latestBoost = this.pointMultipliers[this.pointMultipliers.length - 1];
    return latestBoost.multiplier;
  }

  private startSplitScaleAnimation(): void {
    // Create split scale animation effect
    const animation: SplitScaleAnimation = {
      id: `split_scale_${Date.now()}`,
      entityId: this.id,
      startScale: 1.0,
      targetScale: 0.5,
      progress: 0,
      duration: 300 // 0.3 seconds
    };
    this.splitScaleAnimations.push(animation);
  }

  private startSpeedBoost(): void {
    // Create speed boost effect
    const boost: SpeedBoost = {
      id: `speed_boost_${Date.now()}`,
      startTime: Date.now(),
      duration: 10000, // 10 seconds
      multiplier: 1.5 // 50% speed increase
    };
    this.speedBoosts.push(boost);
  }

  public startSpeedBoostFromTriangle(multiplier: number, duration: number): void {
    // Check if there's already an active speed boost to stack with
    const now = Date.now();
    const activeBoosts = this.speedBoosts.filter(boost => (now - boost.startTime) < boost.duration);
    
    if (activeBoosts.length > 0) {
      // Stack with existing boost - multiply the multipliers
      const currentMultiplier = activeBoosts[activeBoosts.length - 1].multiplier;
      const newMultiplier = currentMultiplier * multiplier;
      
      // Extend the duration of the existing boost
      activeBoosts[activeBoosts.length - 1].duration = Math.max(activeBoosts[activeBoosts.length - 1].duration, duration);
      activeBoosts[activeBoosts.length - 1].multiplier = newMultiplier;
      
      console.log(`🔵 SPEED BOOST STACKED! ${currentMultiplier.toFixed(1)}x * ${multiplier.toFixed(1)}x = ${newMultiplier.toFixed(1)}x`);
    } else {
      // Create new speed boost effect
      const boost: SpeedBoost = {
        id: `triangle_boost_${Date.now()}`,
        startTime: now,
        duration: duration,
        multiplier: multiplier
      };
      this.speedBoosts.push(boost);
      console.log(`🔵 SPEED BOOST ACTIVATED! ${multiplier.toFixed(1)}x for ${(duration/1000).toFixed(1)}s`);
    }
  }

  public startPointMultiplier(multiplier: number, duration: number): void {
    // Create point multiplier effect - store separately from speed boosts
    const boost: SpeedBoost = {
      id: `point_mult_${Date.now()}`,
      startTime: Date.now(),
      duration: duration,
      multiplier: multiplier
    };
    this.pointMultipliers.push(boost);
    console.log(`🔴 Point multiplier activated: ${multiplier}x for ${duration/1000}s`);
  }

  public startFusionCooldownReduction(): void {
    console.log(`🟢 startFusionCooldownReduction called on ${this.id}`);
    console.log(`🔍 Before: fusionCooldown=${(this.fusionCooldown / 1000).toFixed(1)}s, splitDuration=${(this.splitDuration / 1000).toFixed(1)}s`);
    
    // Halve the fusion time for future splits
    const oldFusionTime = this.splitDuration;
    this.splitDuration = this.splitDuration * 0.5;
    
    // Also halve current fusion cooldown if active
    if (this.fusionCooldown > 0) {
      const oldCooldown = this.fusionCooldown;
      this.fusionCooldown = this.fusionCooldown * 0.5;
      console.log(`⚡ CURRENT FUSION COOLDOWN HALVED! Old: ${(oldCooldown / 1000).toFixed(1)}s -> New: ${(this.fusionCooldown / 1000).toFixed(1)}s`);
    } else {
      console.log(`⚠️ No active fusion cooldown to halve (fusionCooldown = ${this.fusionCooldown})`);
      console.log(`💡 Powerup will affect future fusion times (splitDuration reduced from ${(oldFusionTime / 1000).toFixed(1)}s to ${(this.splitDuration / 1000).toFixed(1)}s)`);
    }
    
    console.log(`⚡ FUSION TIME HALVED! Old: ${(oldFusionTime / 1000).toFixed(1)}s -> New: ${(this.splitDuration / 1000).toFixed(1)}s`);
    console.log(`🔍 After: fusionCooldown=${(this.fusionCooldown / 1000).toFixed(1)}s, splitDuration=${(this.splitDuration / 1000).toFixed(1)}s`);
    
    // Set a temporary flag to show the effect in UI
    this.fusionCooldownReduced = true;
    setTimeout(() => {
      this.fusionCooldownReduced = false;
    }, 5000); // Show for 5 seconds
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
    const baseScore = Math.floor(this.getTotalMass());
    const pointMultiplier = this.getPointMultiplier();
    return Math.floor(baseScore * pointMultiplier);
  }

  canSplit(): boolean {
    const requiredMass = 40 + (this.splitLevel * 20);
    const maxCells = Math.pow(2, this.splitLevel + 1);
    return this.splitCooldown <= 0 && 
           this.mass >= requiredMass && 
           this.splitCells.length < maxCells && 
           this.splitLevel < this.maxSplitLevel;
  }

  getSplitCooldownProgress(): number {
    return this.splitCooldown / this.splitDuration;
  }

  getSplitLevel(): number {
    return this.splitLevel;
  }

  getMaxSplitLevel(): number {
    return this.maxSplitLevel;
  }

  getSplitInfo(): { level: number; maxLevel: number; cells: number; maxCells: number; splitCooldown: number; fusionCooldown: number; fusionTime: number } {
    return {
      level: this.splitLevel,
      maxLevel: this.maxSplitLevel,
      cells: this.splitCells.length + 1,
      maxCells: Math.pow(2, this.splitLevel + 1),
      splitCooldown: this.splitCooldown,
      fusionCooldown: this.fusionCooldown,
      fusionTime: this.splitDuration
    };
  }

  getFusionCooldownProgress(): number {
    return this.fusionCooldown / this.splitDuration;
  }

  getFusionCooldownRemaining(): number {
    return this.fusionCooldown;
  }

  getFusionTimeRemaining(): number {
    return this.splitDuration;
  }

  // Public methods for split cell management
  removeSplitCell(cellId: string): void {
    this.splitCells = this.splitCells.filter(cell => cell.id !== cellId);
    
    // If no split cells remain, reset split level
    if (this.splitCells.length === 0) {
      this.splitLevel = 0;
      this.fusionCooldown = 0;
      this.splitCooldown = 0;
    }
  }

  removeMultipleSplitCells(cellIds: string[]): void {
    this.splitCells = this.splitCells.filter(cell => !cellIds.includes(cell.id));
    
    // If no split cells remain, reset split level
    if (this.splitCells.length === 0) {
      this.splitLevel = 0;
      this.fusionCooldown = 0;
      this.splitCooldown = 0;
    }
  }

  // Method to promote a split cell to main cell
  promoteSplitCellToMain(splitCell: PlayerCell): void {
    this.id = splitCell.id;
    this.position = splitCell.position;
    this.mass = splitCell.mass;
    this.size = splitCell.size;
    this.targetPosition = splitCell.targetPosition;
    
    // Copy animations and boosts from split cell
    this.eatingAnimations = [...splitCell.eatingAnimations];
    this.splitScaleAnimations = [...splitCell.splitScaleAnimations];
    this.speedBoosts = [...splitCell.speedBoosts];
    this.pointMultipliers = [...splitCell.pointMultipliers];
  }

  // Method to remove split cells
  removeSplitCells(cellIds: string[]): void {
    this.splitCells = this.splitCells.filter(cell => !cellIds.includes(cell.id));
  }

  // Method to reset split level
  resetSplitLevel(): void {
    this.splitLevel = 0;
    this.fusionCooldown = 0;
    this.splitCooldown = 0;
  }

  // Override addMass to handle player-specific logic
  addMass(amount: number, fromEnemy: boolean = false): void {
    this.mass += amount;
    this.updateSizeFromMass();
    
    // Start eating animation only when eating enemies, not pellets
    if (amount > 0 && fromEnemy) {
      this.startEatingAnimation();
    }
  }

  // Method to get current power-up status
  getPowerUpStatus(): {
    speedBoost: { isActive: boolean; multiplier: number; timeRemaining: number };
    pointMultiplier: { isActive: boolean; multiplier: number; timeRemaining: number };
    fusionCooldownReduction: { isActive: boolean; timeRemaining: number };
  } {
    const now = Date.now();
    
    // Check speed boost status
    const activeSpeedBoost = this.speedBoosts.find(boost => 
      (now - boost.startTime) < boost.duration
    );
    
    // Check point multiplier status
    const activePointMultiplier = this.pointMultipliers.find(boost => 
      (now - boost.startTime) < boost.duration
    );
    
    return {
      speedBoost: {
        isActive: !!activeSpeedBoost,
        multiplier: activeSpeedBoost ? activeSpeedBoost.multiplier : 1.0,
        timeRemaining: activeSpeedBoost ? 
          Math.max(0, activeSpeedBoost.duration - (now - activeSpeedBoost.startTime)) : 0
      },
      pointMultiplier: {
        isActive: !!activePointMultiplier,
        multiplier: activePointMultiplier ? activePointMultiplier.multiplier : 1.0,
        timeRemaining: activePointMultiplier ? 
          Math.max(0, activePointMultiplier.duration - (now - activePointMultiplier.startTime)) : 0
      },
      fusionCooldownReduction: {
        isActive: this.fusionCooldownReduced, // Show when fusion cooldown was recently reduced
        timeRemaining: 0
      }
    };
  }
}

export class BotCell extends Cell {
  private aiState: AIState = AIState.FARMING;
  private stateTimer: number = 0;
  private targetEntity: Entity | null = null;
  private gradientColors: string[];
  private eatingAnimations: EatingAnimation[] = [];

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
    
    // Update eating animations
    this.eatingAnimations = this.eatingAnimations.filter(anim => {
      anim.progress += deltaTime / anim.duration;
      return anim.progress < 1;
    });
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

  addMass(amount: number, fromEnemy: boolean = false): void {
    this.mass += amount;
    this.updateSizeFromMass();
    
    // Start eating animation when gaining mass from eating
    if (amount > 0) {
      this.startEatingAnimation();
    }
  }

  protected startEatingAnimation(): void {
    // Create eating animation effect
    const animation: EatingAnimation = {
      id: `eating_${Date.now()}`,
      entityId: this.id,
      startScale: 1.0,
      targetScale: 1.1,
      progress: 0,
      duration: 200 // 0.2 seconds
    };
    this.eatingAnimations.push(animation);
  }

  private getEatingScale(): number {
    if (this.eatingAnimations.length === 0) return 1.0;
    
    // Get the most recent eating animation
    const latestAnimation = this.eatingAnimations[this.eatingAnimations.length - 1];
    const progress = latestAnimation.progress;
    
    // Ease out animation
    const easeProgress = 1 - Math.pow(1 - progress, 2);
    return latestAnimation.startScale + (latestAnimation.targetScale - latestAnimation.startScale) * easeProgress;
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const screenX = (this.position.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
    const screenY = (this.position.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
    const eatingScale = this.getEatingScale();
    const screenSize = this.size * camera.zoom * eatingScale;

    ctx.save();

    // Enhanced visibility for bots
    ctx.shadowColor = this.gradientColors[0];
    ctx.shadowBlur = screenSize * 2;

    // Gradient für Bots
    const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, screenSize);
    gradient.addColorStop(0, this.gradientColors[0]);
    gradient.addColorStop(0.7, this.gradientColors[1]);
    gradient.addColorStop(1, this.gradientColors[2]);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
    ctx.fill();

    // AI State Indicator with enhanced visibility
    ctx.strokeStyle = this.getStateColor();
    ctx.lineWidth = 3; // Thicker border
    ctx.stroke();

    // Add bot ID for debugging
    if (screenSize > 10) { // Only show ID if bot is large enough
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(8, screenSize / 4)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`BOT`, screenX, screenY - screenSize - 5);
    }

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

export class SpeedBoostTriangle extends BaseEntity {
  private respawnTime: number = 0;
  private pulseTime: number = 0;
  private glowIntensity: number = 1.0;
  private spawnAnimation: SpawnAnimation | null = null;
  private isSpawning: boolean = true;

  constructor(id: string, x: number, y: number) {
    super(id, x, y, 15, '#0088ff', EntityType.SPEED_BOOST);
    
    // Create spawn animation
    this.spawnAnimation = {
      id: `spawn_${id}`,
      position: { x, y },
      startTime: Date.now(),
      duration: 1000, // 1 second - shorter animation
      maxRadius: 50,
      color: '#0088ff'
    };
  }

  update(deltaTime: number): void {
    // Update spawn animation
    if (this.spawnAnimation && this.isSpawning) {
      const elapsed = Date.now() - this.spawnAnimation.startTime;
      if (elapsed >= this.spawnAnimation.duration) {
        this.isSpawning = false;
        this.spawnAnimation = null;
      }
    }

    // Speed boost triangles don't move
    if (this.respawnTime > 0) {
      this.respawnTime -= deltaTime;
      if (this.respawnTime <= 0) {
        // Respawn at random position
        this.position.x = Math.random() * 3000;
        this.position.y = Math.random() * 3000;
        this.respawnTime = 0;
        
        // Create new spawn animation for respawn
        this.spawnAnimation = {
          id: `spawn_${this.id}_${Date.now()}`,
          position: { x: this.position.x, y: this.position.y },
          startTime: Date.now(),
          duration: 1000,
          maxRadius: 50,
          color: '#0088ff'
        };
        this.isSpawning = true;
      }
    }

    // Update pulse animation
    this.pulseTime += deltaTime;
    this.glowIntensity = 0.5 + 0.5 * Math.sin(this.pulseTime / 200); // Pulse every 200ms
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (this.respawnTime > 0) return; // Hidden during respawn

    const screenX = (this.position.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
    const screenY = (this.position.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
    const screenSize = this.size * camera.zoom;

    ctx.save();

    // Draw spawn animation first
    if (this.spawnAnimation && this.isSpawning) {
      const elapsed = Date.now() - this.spawnAnimation.startTime;
      const progress = Math.min(elapsed / this.spawnAnimation.duration, 1);
      
      // Create expanding pulse effect
      const pulseRadius = this.spawnAnimation.maxRadius * progress * camera.zoom;
      const pulseAlpha = 1 - progress;
      
      ctx.strokeStyle = `rgba(0, 136, 255, ${pulseAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Show triangle during spawn animation too, but with reduced opacity
      const triangleAlpha = Math.min(progress * 3, 1); // Faster fade in during animation
      
      // Create glowing blue triangle with reduced opacity
      ctx.fillStyle = `rgba(0, 136, 255, ${this.glowIntensity * triangleAlpha})`;
      ctx.shadowColor = '#0088ff';
      ctx.shadowBlur = screenSize * 2;
      
      // Draw triangle pointing up
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - screenSize); // Top point
      ctx.lineTo(screenX - screenSize, screenY + screenSize * 0.5); // Bottom left
      ctx.lineTo(screenX + screenSize, screenY + screenSize * 0.5); // Bottom right
      ctx.closePath();
      ctx.fill();
      
      // Only complete spawn animation after duration
      if (progress >= 1) {
        this.isSpawning = false;
        this.spawnAnimation = null;
      }
      
      ctx.restore();
      return; // Don't draw normal triangle during spawn animation
    }

    // Create glowing triangle
    ctx.fillStyle = `rgba(0, 136, 255, ${this.glowIntensity})`;
    ctx.shadowColor = '#0088ff';
    ctx.shadowBlur = screenSize * 2;
    
    // Draw triangle pointing up
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - screenSize); // Top point
    ctx.lineTo(screenX - screenSize, screenY + screenSize * 0.5); // Bottom left
    ctx.lineTo(screenX + screenSize, screenY + screenSize * 0.5); // Bottom right
    ctx.closePath();
    ctx.fill();

    // Add inner glow
    ctx.shadowBlur = screenSize;
    ctx.fillStyle = `rgba(255, 255, 255, ${this.glowIntensity * 0.3})`;
    ctx.fill();

    ctx.restore();
  }

  getEaten(): void {
    this.respawnTime = 15000; // 15 seconds respawn
  }

  getMass(): number {
    return 0; // No mass, just speed boost
  }

  getSpeedBoost(): number {
    return 2.0; // 2x speed boost for 10 seconds
  }

  getSpeedBoostDuration(): number {
    return 10000; // 10 seconds
  }
}

export class PointMultiplierTriangle extends BaseEntity {
  private respawnTime: number = 0;
  private pulseTime: number = 0;
  private glowIntensity: number = 1.0;
  private spawnAnimation: SpawnAnimation | null = null;
  private isSpawning: boolean = true;

  constructor(id: string, x: number, y: number) {
    super(id, x, y, 18, '#ff4444', EntityType.POINT_MULTIPLIER);
    
    // Create spawn animation
    this.spawnAnimation = {
      id: `spawn_${id}`,
      position: { x, y },
      startTime: Date.now(),
      duration: 1000, // 1 second - shorter animation
      maxRadius: 60,
      color: '#ff4444'
    };
  }

  update(deltaTime: number): void {
    // Update spawn animation
    if (this.spawnAnimation && this.isSpawning) {
      const elapsed = Date.now() - this.spawnAnimation.startTime;
      if (elapsed >= this.spawnAnimation.duration) {
        this.isSpawning = false;
        this.spawnAnimation = null;
      }
    }

    // Point multiplier triangles don't move
    if (this.respawnTime > 0) {
      this.respawnTime -= deltaTime;
      if (this.respawnTime <= 0) {
        // Respawn at random position
        this.position.x = Math.random() * 3000;
        this.position.y = Math.random() * 3000;
        this.respawnTime = 0;
        
        // Create new spawn animation for respawn
        this.spawnAnimation = {
          id: `spawn_${this.id}_${Date.now()}`,
          position: { x: this.position.x, y: this.position.y },
          startTime: Date.now(),
          duration: 1000,
          maxRadius: 60,
          color: '#ff4444'
        };
        this.isSpawning = true;
      }
    }

    // Update pulse animation
    this.pulseTime += deltaTime;
    this.glowIntensity = 0.6 + 0.4 * Math.sin(this.pulseTime / 150); // Faster pulse
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (this.respawnTime > 0) return; // Hidden during respawn

    const screenX = (this.position.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
    const screenY = (this.position.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
    const screenSize = this.size * camera.zoom;

    ctx.save();

    // Draw spawn animation first
    if (this.spawnAnimation && this.isSpawning) {
      const elapsed = Date.now() - this.spawnAnimation.startTime;
      const progress = Math.min(elapsed / this.spawnAnimation.duration, 1);
      
      // Create expanding pulse effect
      const pulseRadius = this.spawnAnimation.maxRadius * progress * camera.zoom;
      const pulseAlpha = 1 - progress;
      
      ctx.strokeStyle = `rgba(255, 68, 68, ${pulseAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Show triangle during spawn animation too, but with reduced opacity
      const triangleAlpha = Math.min(progress * 3, 1); // Faster fade in during animation
      
      // Create glowing red triangle with reduced opacity
      ctx.fillStyle = `rgba(255, 68, 68, ${this.glowIntensity * triangleAlpha})`;
      ctx.shadowColor = '#ff4444';
      ctx.shadowBlur = screenSize * 3;
      
      // Draw triangle pointing up
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - screenSize); // Top point
      ctx.lineTo(screenX - screenSize, screenY + screenSize * 0.5); // Bottom left
      ctx.lineTo(screenX + screenSize, screenY + screenSize * 0.5); // Bottom right
      ctx.closePath();
      ctx.fill();

      // Add "3x" text
      ctx.fillStyle = `rgba(255, 255, 255, ${this.glowIntensity * triangleAlpha})`;
      ctx.font = `${Math.max(8, screenSize / 2)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('3x', screenX, screenY);
      
      // Only complete spawn animation after duration
      if (progress >= 1) {
        this.isSpawning = false;
        this.spawnAnimation = null;
      }
      
      ctx.restore();
      return; // Don't draw normal triangle during spawn animation
    }

    // Create glowing red triangle
    ctx.fillStyle = `rgba(255, 68, 68, ${this.glowIntensity})`;
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = screenSize * 3;
    
    // Draw triangle pointing up
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - screenSize); // Top point
    ctx.lineTo(screenX - screenSize, screenY + screenSize * 0.5); // Bottom left
    ctx.lineTo(screenX + screenSize, screenY + screenSize * 0.5); // Bottom right
    ctx.closePath();
    ctx.fill();

    // Add "3x" text
    ctx.fillStyle = `rgba(255, 255, 255, ${this.glowIntensity})`;
    ctx.font = `${Math.max(8, screenSize / 2)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('3x', screenX, screenY);

    ctx.restore();
  }

  getEaten(): void {
    this.respawnTime = 20000; // 20 seconds respawn
  }

  getMass(): number {
    return 0; // No mass, just point multiplier
  }

  getPointMultiplier(): number {
    return 3; // 3x points for 10 seconds
  }

  getPointMultiplierDuration(): number {
    return 10000; // 10 seconds
  }
}

export class FusionCooldownReductionTriangle extends BaseEntity {
  private respawnTime: number = 0;
  private pulseTime: number = 0;
  private glowIntensity: number = 1.0;
  private spawnAnimation: SpawnAnimation | null = null;
  private isSpawning: boolean = true;

  constructor(id: string, x: number, y: number) {
    super(id, x, y, 20, '#00ff00', EntityType.FUSION_POWER);
    
    // Create spawn animation
    this.spawnAnimation = {
      id: `spawn_${id}`,
      position: { x, y },
      startTime: Date.now(),
      duration: 1000, // 1 second - shorter animation
      maxRadius: 70,
      color: '#00ff00'
    };
  }

  update(deltaTime: number): void {
    // Update spawn animation
    if (this.spawnAnimation && this.isSpawning) {
      const elapsed = Date.now() - this.spawnAnimation.startTime;
      if (elapsed >= this.spawnAnimation.duration) {
        this.isSpawning = false;
        this.spawnAnimation = null;
      }
    }

    // Fusion power triangles don't move
    if (this.respawnTime > 0) {
      this.respawnTime -= deltaTime;
      if (this.respawnTime <= 0) {
        // Respawn at random position
        this.position.x = Math.random() * 3000;
        this.position.y = Math.random() * 3000;
        this.respawnTime = 0;
        
        // Create new spawn animation for respawn
        this.spawnAnimation = {
          id: `spawn_${this.id}_${Date.now()}`,
          position: { x: this.position.x, y: this.position.y },
          startTime: Date.now(),
          duration: 1000,
          maxRadius: 70,
          color: '#00ff00'
        };
        this.isSpawning = true;
      }
    }

    // Update pulse animation
    this.pulseTime += deltaTime;
    this.glowIntensity = 0.5 + 0.5 * Math.sin(this.pulseTime / 100); // Very fast pulse
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (this.respawnTime > 0) return; // Hidden during respawn

    const screenX = (this.position.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
    const screenY = (this.position.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
    const screenSize = this.size * camera.zoom;

    ctx.save();

    // Draw spawn animation first
    if (this.spawnAnimation && this.isSpawning) {
      const elapsed = Date.now() - this.spawnAnimation.startTime;
      const progress = Math.min(elapsed / this.spawnAnimation.duration, 1);
      
      // Create expanding pulse effect
      const pulseRadius = this.spawnAnimation.maxRadius * progress * camera.zoom;
      const pulseAlpha = 1 - progress;
      
      ctx.strokeStyle = `rgba(0, 255, 0, ${pulseAlpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Show triangle during spawn animation too, but with reduced opacity
      const triangleAlpha = Math.min(progress * 3, 1); // Faster fade in during animation
      
      // Create glowing green triangle with reduced opacity
      ctx.fillStyle = `rgba(0, 255, 0, ${this.glowIntensity * triangleAlpha})`;
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = screenSize * 4;
      
      // Draw triangle pointing up
      ctx.beginPath();
      ctx.moveTo(screenX, screenY - screenSize); // Top point
      ctx.lineTo(screenX - screenSize, screenY + screenSize * 0.5); // Bottom left
      ctx.lineTo(screenX + screenSize, screenY + screenSize * 0.5); // Bottom right
      ctx.closePath();
      ctx.fill();

      // Add "⚡" text for Fusion Cooldown Reduction
      ctx.fillStyle = `rgba(255, 255, 255, ${this.glowIntensity * triangleAlpha})`;
      ctx.font = `${Math.max(10, screenSize / 1.5)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', screenX, screenY);
      
      // Only complete spawn animation after duration
      if (progress >= 1) {
        this.isSpawning = false;
        this.spawnAnimation = null;
      }
      
      ctx.restore();
      return; // Don't draw normal triangle during spawn animation
    }

    // Create glowing green triangle
    ctx.fillStyle = `rgba(0, 255, 0, ${this.glowIntensity})`;
    ctx.shadowColor = '#00ff00';
    ctx.shadowBlur = screenSize * 4;
    
    // Draw triangle pointing up
    ctx.beginPath();
    ctx.moveTo(screenX, screenY - screenSize); // Top point
    ctx.lineTo(screenX - screenSize, screenY + screenSize * 0.5); // Bottom left
    ctx.lineTo(screenX + screenSize, screenY + screenSize * 0.5); // Bottom right
    ctx.closePath();
    ctx.fill();

    // Add "⚡" text for Fusion Cooldown Reduction
    ctx.fillStyle = `rgba(255, 255, 255, ${this.glowIntensity})`;
    ctx.font = `${Math.max(10, screenSize / 1.5)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', screenX, screenY);

    ctx.restore();
  }

  getEaten(): void {
    this.respawnTime = 30000; // 30 seconds respawn
  }

  getMass(): number {
    return 0; // No mass, just fusion power
  }

  getFusionCooldownReduction(): number {
    return 0.5; // Halves fusion cooldown
  }
}

export class BossBot extends Cell {
  private aiState: AIState = AIState.HUNTING;
  private stateTimer: number = 0;
  private targetEntity: Entity | null = null;
  private gradientColors: string[];
  private pulseTime: number = 0;
  private glowIntensity: number = 1.0;
  private bossLevel: number;

  constructor(id: string, x: number, y: number, mass: number = 200) {
    super(id, x, y, mass, EntityType.BOSS_BOT);
    this.bossLevel = Math.floor(mass / 100); // Boss level based on mass
    this.gradientColors = this.generateBossColors();
  }

  private generateBossColors(): string[] {
    const bossColorSets = [
      ['#ff0000', '#cc0000', '#990000'], // Red boss
      ['#8000ff', '#6600cc', '#4d0099'], // Purple boss
      ['#ff8000', '#cc6600', '#994d00'], // Orange boss
      ['#00ff80', '#00cc66', '#00994d'], // Green boss
      ['#ff0080', '#cc0066', '#99004d'], // Pink boss
    ];
    return bossColorSets[this.bossLevel % bossColorSets.length];
  }

  update(deltaTime: number): void {
    this.updateBossAI(deltaTime);
    super.update(deltaTime);
    
    // Update pulse animation
    this.pulseTime += deltaTime;
    this.glowIntensity = 0.7 + 0.3 * Math.sin(this.pulseTime / 300); // Slower pulse for bosses
  }

  private updateBossAI(deltaTime: number): void {
    this.stateTimer += deltaTime;

    // Bosses are more aggressive and change state less frequently
    if (this.stateTimer > 5000 + Math.random() * 10000) {
      this.chooseBossState();
      this.stateTimer = 0;
    }

    // Execute boss AI logic
    switch (this.aiState) {
      case AIState.HUNTING:
        this.huntBossAI();
        break;
      case AIState.FLEEING:
        this.fleeBossAI();
        break;
      default:
        this.huntBossAI(); // Bosses are always hunting or fleeing
        break;
    }
  }

  private chooseBossState(): void {
    // Bosses are more likely to hunt
    const rand = Math.random();
    if (rand < 0.8) {
      this.aiState = AIState.HUNTING;
    } else {
      this.aiState = AIState.FLEEING;
    }
  }

  private huntBossAI(): void {
    // Bosses hunt more aggressively
    if (!this.targetPosition) {
      this.setTarget({
        x: this.position.x + (Math.random() - 0.5) * 500,
        y: this.position.y + (Math.random() - 0.5) * 500
      });
    }
  }

  private fleeBossAI(): void {
    // Bosses flee from even larger threats
    if (!this.targetPosition) {
      this.setTarget({
        x: this.position.x + (Math.random() - 0.5) * 600,
        y: this.position.y + (Math.random() - 0.5) * 600
      });
    }
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const screenX = (this.position.x - camera.x) * camera.zoom + camera.canvasWidth / 2;
    const screenY = (this.position.y - camera.y) * camera.zoom + camera.canvasHeight / 2;
    const screenSize = this.size * camera.zoom;

    ctx.save();

    // Boss gradient with pulsing effect
    const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, screenSize);
    gradient.addColorStop(0, this.gradientColors[0]);
    gradient.addColorStop(0.5, this.gradientColors[1]);
    gradient.addColorStop(1, this.gradientColors[2]);

    ctx.fillStyle = gradient;
    ctx.shadowColor = this.gradientColors[0];
    ctx.shadowBlur = screenSize * this.glowIntensity;
    ctx.beginPath();
    ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
    ctx.fill();

    // Boss crown effect
    ctx.strokeStyle = `rgba(255, 255, 0, ${this.glowIntensity})`;
    ctx.lineWidth = 3 + this.bossLevel;
    ctx.stroke();

    // Boss level indicator
    ctx.fillStyle = `rgba(255, 255, 0, ${this.glowIntensity})`;
    ctx.font = `${Math.max(16, screenSize / 3)}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`BOSS L${this.bossLevel}`, screenX, screenY);

    // AI State indicator for bosses
    ctx.strokeStyle = this.getBossStateColor();
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();
  }

  private getBossStateColor(): string {
    switch (this.aiState) {
      case AIState.HUNTING: return '#ff0000';
      case AIState.FLEEING: return '#ffff00';
      default: return '#ffffff';
    }
  }

  getAIState(): AIState {
    return this.aiState;
  }

  getBossLevel(): number {
    return this.bossLevel;
  }
}
