import { Position, Particle } from '../types/game';

export class ParticleSystem {
  private particles: Particle[] = [];
  private ctx: CanvasRenderingContext2D;
  private camera: { x: number; y: number; zoom: number; canvasWidth: number; canvasHeight: number };

  constructor(ctx: CanvasRenderingContext2D, camera: { x: number; y: number; zoom: number; canvasWidth: number; canvasHeight: number }) {
    this.ctx = ctx;
    this.camera = camera;
  }

  updateCamera(camera: { x: number; y: number; zoom: number; canvasWidth: number; canvasHeight: number }) {
    this.camera = camera;
  }

  createParticleBurst(
    position: Position,
    count: number,
    options: {
      color?: string;
      speed?: number;
      size?: number;
      life?: number;
      spread?: number;
    } = {}
  ) {
    const {
      color = '#00ffff',
      speed = 100,
      size = 3,
      life = 1000,
      spread = Math.PI * 2
    } = options;

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * spread;
      const velocity = {
        x: Math.cos(angle) * speed * (0.5 + Math.random() * 0.5),
        y: Math.sin(angle) * speed * (0.5 + Math.random() * 0.5)
      };

      const particle: Particle = {
        position: { ...position },
        velocity,
        life: life * (0.5 + Math.random() * 0.5),
        maxLife: life,
        color,
        size: size * (0.5 + Math.random() * 0.5)
      };

      this.particles.push(particle);
    }
  }

  createTrail(
    startPos: Position,
    endPos: Position,
    options: {
      color?: string;
      density?: number;
      size?: number;
      life?: number;
    } = {}
  ) {
    const {
      color = '#00ff00',
      density = 5,
      size = 2,
      life = 500
    } = options;

    const distance = Math.sqrt(
      Math.pow(endPos.x - startPos.x, 2) + Math.pow(endPos.y - startPos.y, 2)
    );

    const steps = Math.floor(distance / density);

    for (let i = 0; i <= steps; i++) {
      const ratio = i / steps;
      const particle: Particle = {
        position: {
          x: startPos.x + (endPos.x - startPos.x) * ratio,
          y: startPos.y + (endPos.y - startPos.y) * ratio
        },
        velocity: { x: 0, y: 0 },
        life: life * (0.5 + Math.random() * 0.5),
        maxLife: life,
        color,
        size: size * (0.5 + Math.random() * 0.5)
      };

      this.particles.push(particle);
    }
  }

  createExplosion(
    position: Position,
    options: {
      color?: string;
      intensity?: number;
      size?: number;
    } = {}
  ) {
    const {
      color = '#ff4444',
      intensity = 20,
      size = 4
    } = options;

    // Create multiple bursts for explosion effect
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.createParticleBurst(position, intensity, {
          color,
          speed: 150 + Math.random() * 100,
          size,
          life: 800,
          spread: Math.PI * 2
        });
      }, i * 100);
    }
  }

  createSkillEffect(
    position: Position,
    skillType: 'parley' | 'stealth' | 'decoy' | 'breach'
  ) {
    switch (skillType) {
      case 'parley':
        this.createParticleBurst(position, 15, {
          color: '#00ff00',
          speed: 80,
          size: 2,
          life: 1200
        });
        break;

      case 'stealth':
        this.createParticleBurst(position, 20, {
          color: '#0080ff',
          speed: 60,
          size: 1,
          life: 1500
        });
        break;

      case 'decoy':
        this.createParticleBurst(position, 25, {
          color: '#ffff00',
          speed: 100,
          size: 3,
          life: 1000
        });
        break;

      case 'breach':
        this.createExplosion(position, {
          color: '#ff4444',
          intensity: 30,
          size: 5
        });
        break;
    }
  }

  update(deltaTime: number) {
    // Update particles
    this.particles = this.particles.filter(particle => {
      particle.life -= deltaTime;

      // Update position
      particle.position.x += particle.velocity.x * (deltaTime / 1000);
      particle.position.y += particle.velocity.y * (deltaTime / 1000);

      // Apply gravity (subtle)
      particle.velocity.y += 20 * (deltaTime / 1000);

      // Fade out
      particle.velocity.x *= 0.98;
      particle.velocity.y *= 0.98;

      return particle.life > 0;
    });
  }

  render() {
    this.ctx.save();

    this.particles.forEach(particle => {
      const screenX = (particle.position.x - this.camera.x) * this.camera.zoom + this.camera.canvasWidth / 2;
      const screenY = (particle.position.y - this.camera.y) * this.camera.zoom + this.camera.canvasHeight / 2;
      const screenSize = particle.size * this.camera.zoom;

      // Calculate alpha based on remaining life
      const alpha = particle.life / particle.maxLife;

      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(screenX, screenY, screenSize, 0, Math.PI * 2);
      this.ctx.fill();

      // Add glow effect
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = screenSize * 2;
      this.ctx.fill();
    });

    this.ctx.restore();
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clear() {
    this.particles = [];
  }
}

// Preset particle effects
export const ParticlePresets = {
  eatPellet: (position: Position) => ({
    count: 8,
    options: {
      color: '#0080ff',
      speed: 60,
      size: 2,
      life: 800
    }
  }),

  eatDrone: (position: Position) => ({
    count: 15,
    options: {
      color: '#ff4444',
      speed: 100,
      size: 3,
      life: 1000
    }
  }),

  recruitAlly: (position: Position) => ({
    count: 12,
    options: {
      color: '#00ff00',
      speed: 70,
      size: 2,
      life: 1200
    }
  }),

  hackNode: (position: Position) => ({
    count: 20,
    options: {
      color: '#aa00ff',
      speed: 90,
      size: 4,
      life: 1500
    }
  }),

  winGame: (position: Position) => ({
    count: 50,
    options: {
      color: '#00ff00',
      speed: 120,
      size: 5,
      life: 2000
    }
  }),

  loseGame: (position: Position) => ({
    count: 30,
    options: {
      color: '#ff0000',
      speed: 80,
      size: 4,
      life: 1500
    }
  })
};
