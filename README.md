# Humanity Protocol - Der letzte Code, um Menschlichkeit zu bewahren

Ein cyberpunk-thema Agar.io-Spiel, in dem du zwischen Menschlichkeit und KI-Kontrolle in einer digitalen Arena balancierst. Gebaut mit React, TypeScript, HTML5 Canvas und modernen Web-Technologien.

## 🎮 Spielübersicht

Du bist eine **Wächterzelle**, eine sentiente Entität in einer neon-durchtränkten digitalen Metropole. Dein Ziel ist es, **Harmonie** zwischen Menschlichkeit und KI-Kontrolle zu erreichen, indem du strategische Entscheidungen triffst, die die Waage kippen lassen.

### Core Mechanics

- **Movement**: WASD keys or mouse/touch controls
- **Growth**: Eat blue data pellets to grow and boost Humanity
- **Allies**: Recruit green civilians to orbit around you for defense
- **Combat**: Battle red drones that grow stronger with KI-Control levels
- **Skills**: Use cooldown-based abilities (Q, Shift, E, F) to influence the balance
- **Victory**: Achieve harmony (Humanity ≥85%, KI-Control ≤20%) or total shutdown (KI-Control = 0%)
- **Defeat**: Humanity reaches 0% or KI-Control hits 100%

## 🚀 Features

- **HTML5 Canvas Rendering**: Smooth 60fps gameplay with custom particle effects
- **Real-time Balance System**: Dynamic Humanity vs KI-Control mechanics
- **Skill System**: 4 unique abilities with cooldowns and visual feedback
- **Particle Effects**: Spectacular visual effects for all game actions
- **Sound Effects**: Immersive audio with Howler.js
- **Responsive Design**: Works on desktop and mobile devices
- **Save System**: Local storage for game saves and settings
- **Leaderboard**: Mock API for competitive scoring
- **Achievements**: Unlockable achievements for special accomplishments

## 🛠️ Technology Stack

- **Frontend**: React 18 with TypeScript
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Audio**: Howler.js
- **Graphics**: HTML5 Canvas with custom rendering engine
- **Build Tool**: Create React App
- **Styling**: CSS with cyberpunk theme

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── GameCanvas.tsx   # Main game canvas and rendering
│   ├── HUD.tsx         # Heads-up display with meters
│   ├── SkillsBar.tsx   # Skill cooldowns and keybinds
│   ├── IntroStory.tsx  # Animated narrative introduction
│   └── App.tsx         # Main app with routing
├── hooks/              # Custom React hooks
│   ├── useCanvas.ts    # Canvas management hook
│   ├── useGameLoop.ts  # Game loop management
│   └── usePlayerControls.ts # Input handling
├── stores/             # State management
│   └── gameStore.ts    # Global game state with Zustand
├── utils/              # Utility functions
│   ├── entities.ts     # Game entity classes
│   ├── collisionDetection.ts # Collision detection
│   ├── balanceMechanics.ts   # Balance system logic
│   ├── particles.ts    # Particle effects system
│   └── storage.ts      # Local storage utilities
├── types/              # TypeScript type definitions
│   └── game.ts         # Game-related interfaces
└── assets/             # Static assets
```

## 🎯 Controls

- **Movement**: WASD or Arrow keys
- **Mouse/Touch**: Click and drag to move
- **Parley (Q)**: 50% chance negotiation - boost Humanity or lose some
- **Stealth (Shift)**: Invisible for 5s, costs Humanity/sec
- **Decoy (E)**: Spawn distraction pellet for drones
- **Breach (F)**: AOE hack wave damaging nearby nodes
- **Pause**: P or Escape key

## 🏃‍♂️ Running the Game

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm start
   ```

3. **Build for production**:
   ```bash
   npm run build
   ```

4. **Open in browser**: Navigate to `http://localhost:3000`

## 🎨 Visual Design

- **Theme**: Neon cyberpunk with blue/red color scheme
- **Entities**:
  - Player (Louig_i): Cyan glowing cell
  - Data Pellets: Blue orbs with pulsing animation
  - Civilians: Green neutral cells
  - Allies: Orbiting green cells
  - Drones: Red enemy cells with aggression indicators
  - Nodes: Purple stationary bosses with health bars
- **Effects**: Particle bursts, explosions, skill animations
- **UI**: Cyberpunk-styled HUD with glowing borders

## 🔧 Customization

### Game Configuration
Edit `src/components/GameCanvas.tsx` constants:
```typescript
const GAME_CONFIG = {
  canvasWidth: 800,
  canvasHeight: 600,
  worldWidth: 1000,
  worldHeight: 1000,
  // ... other settings
};
```

### Balance Tuning
Modify `src/utils/balanceMechanics.ts` for balance adjustments.

### Visual Effects
Customize particle effects in `src/utils/particles.ts`.

## 📱 Mobile Support

- Touch controls for movement
- Responsive canvas scaling
- Mobile-optimized UI elements
- Touch-friendly skill buttons

## 🏆 Achievements System

Unlock achievements for:
- First victory
- High scores (50k+ points)
- Perfect balance (90%+ Humanity)
- Total shutdown (0% KI-Control)
- Ally commander (10+ allies)
- Node destroyer (20+ nodes)

## 💾 Save System

- **Game Saves**: Store up to 5 recent game states
- **Settings**: Audio, particles, intro preferences
- **Leaderboard**: Top 100 scores with achievements
- **Achievements**: Progress tracking for unlocks

## 🎵 Audio

- **Sound Effects**: Eating, combat, skills, UI interactions
- **Music**: Ambient cyberpunk tracks for menu/game
- **Volume Controls**: Individual audio settings

## 🚀 Future Enhancements

- [ ] Multiplayer support
- [ ] Additional game modes
- [ ] More skills and abilities
- [ ] Procedural level generation
- [ ] Advanced AI behaviors
- [ ] Performance optimizations
- [ ] Cross-platform deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by Agar.io and cyberpunk aesthetics
- Built with modern React ecosystem
- Special thanks to the open-source community

---

**Viel Spaß beim Balancieren der digitalen Waage in Humanity Protocol!** 🎮
# Test deployment trigger
# Reconnected to Vercel - testing deployment
# Webhook test - Thu Oct  9 15:45:46 EEST 2025
