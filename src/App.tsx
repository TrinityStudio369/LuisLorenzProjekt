import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameCanvas } from './components/GameCanvas';
import { IntroStory } from './components/IntroStory';
import { NameInput } from './components/NameInput';
import { useGameStore } from './stores/gameStore';

type GameState = 'menu' | 'nameInput' | 'intro' | 'playing' | 'paused' | 'won' | 'lost';

// Audio system with user permission
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

const menuMusic = {
  play: () => {
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('Menu music started (with user permission)');
      });
    } else {
      console.log('Menu music started');
    }
  },
  stop: () => console.log('Menu music stopped')
};

const gameMusic = {
  play: () => {
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        console.log('Game music started (with user permission)');
      });
    } else {
      console.log('Game music started');
    }
  },
  stop: () => console.log('Game music stopped')
};

const App: React.FC = () => {
  const gameStore = useGameStore();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [showIntro, setShowIntro] = useState(false);
  const [playerName, setPlayerName] = useState<string>('');

  // Handle game state changes
  useEffect(() => {
    if (gameStore.isGameWon) {
      setGameState('won');
      menuMusic.stop();
    } else if (gameStore.isGameLost) {
      setGameState('lost');
      menuMusic.stop();
    } else if (gameStore.isGameRunning) {
      if (gameStore.isPaused) {
        setGameState('paused');
      } else {
        setGameState('playing');
      }
    }
  }, [gameStore.isGameWon, gameStore.isGameLost, gameStore.isGameRunning, gameStore.isPaused]);

  // Handle music
  useEffect(() => {
    if (gameState === 'menu') {
      gameMusic.stop();
      menuMusic.play();
    } else if (gameState === 'playing') {
      menuMusic.stop();
      gameMusic.play();
    } else {
      menuMusic.stop();
      gameMusic.stop();
    }

    return () => {
      menuMusic.stop();
      gameMusic.stop();
    };
  }, [gameState]);

  const startNewGame = () => {
    setGameState('nameInput');
  };

  const handleNameSubmit = (name: string) => {
    setPlayerName(name);
    setGameState('intro');
    setShowIntro(true);
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
    gameStore.startGame();
  };

  const handleIntroSkip = () => {
    setShowIntro(false);
    gameStore.startGame();
  };

  const returnToMenu = () => {
    gameStore.resetGame();
    setPlayerName('');
    setGameState('menu');
  };

  const resumeGame = () => {
    gameStore.togglePause();
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#000011',
        overflow: 'hidden',
        fontFamily: 'monospace'
      }}
    >
      <AnimatePresence mode="wait">
        {gameState === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #000011 0%, #001122 50%, #000011 100%)'
            }}
          >
            {/* Animated background */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'hidden'
              }}
            >
              {Array.from({ length: 100 }).map((_, i) => (
                <motion.div
                  key={i}
                  style={{
                    position: 'absolute',
                    width: '1px',
                    height: '1px',
                    background: '#00ffff',
                    borderRadius: '50%'
                  }}
                  initial={{
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    opacity: 0
                  }}
                  animate={{
                    x: Math.random() * window.innerWidth,
                    y: Math.random() * window.innerHeight,
                    opacity: [0, 0.8, 0]
                  }}
                  transition={{
                    duration: Math.random() * 4 + 3,
                    repeat: Infinity,
                    delay: Math.random() * 3
                  }}
                />
              ))}
            </div>

            {/* Title */}
            <motion.h1
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: '#00ffff',
                textShadow: '0 0 30px rgba(0, 255, 255, 0.8)',
                marginBottom: '20px',
                zIndex: 1
              }}
              animate={{
                textShadow: [
                  '0 0 30px rgba(0, 255, 255, 0.8)',
                  '0 0 40px rgba(0, 255, 255, 1)',
                  '0 0 30px rgba(0, 255, 255, 0.8)'
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity
              }}
            >
              HUMANITY PROTOCOL
            </motion.h1>

            <motion.div
              style={{
                fontSize: '18px',
                color: '#ff4444',
                textShadow: '0 0 15px rgba(255, 68, 68, 0.6)',
                marginBottom: '60px',
                textAlign: 'center',
                lineHeight: '1.4'
              }}
              animate={{
                color: ['#ff4444', '#ffff00', '#ff4444']
              }}
              transition={{
                duration: 3,
                repeat: Infinity
              }}
            >
              Der letzte Code,<br />um Menschlichkeit zu bewahren
            </motion.div>

            {/* Menu buttons */}
            <motion.div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                zIndex: 1
              }}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button
                onClick={startNewGame}
                style={{
                  padding: '15px 40px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: 'rgba(0, 255, 255, 0.1)',
                  border: '2px solid #00ffff',
                  borderRadius: '8px',
                  color: '#00ffff',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
                whileHover={{
                  background: 'rgba(0, 255, 255, 0.2)',
                  scale: 1.05,
                  boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)'
                }}
                whileTap={{ scale: 0.95 }}
              >
                START GAME
              </motion.button>

              <motion.button
                onClick={() => {/* Load game functionality */}}
                style={{
                  padding: '15px 40px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '2px solid #ffffff',
                  borderRadius: '8px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
                whileHover={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  scale: 1.05,
                  boxShadow: '0 0 20px rgba(255, 255, 255, 0.5)'
                }}
                whileTap={{ scale: 0.95 }}
              >
                LOAD GAME
              </motion.button>

              <motion.button
                onClick={() => {/* Settings functionality */}}
                style={{
                  padding: '15px 40px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: 'rgba(128, 128, 128, 0.1)',
                  border: '2px solid #888888',
                  borderRadius: '8px',
                  color: '#888888',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
                whileHover={{
                  background: 'rgba(128, 128, 128, 0.2)',
                  scale: 1.05,
                  boxShadow: '0 0 20px rgba(128, 128, 128, 0.5)'
                }}
                whileTap={{ scale: 0.95 }}
              >
                SETTINGS
              </motion.button>
            </motion.div>

            {/* Lore text */}
            <motion.p
              style={{
                position: 'absolute',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#00ffff',
                fontSize: '14px',
                textAlign: 'center',
                maxWidth: '600px',
                opacity: 0.7,
                zIndex: 1
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 1 }}
            >
              In einer Welt, wo Menschlichkeit und KI-Kontrolle um die Vorherrschaft kämpfen,<br />
              bist du die Zelle, die das Gleichgewicht kippen kann...<br />
              Wähle weise, denn das Schicksal beider Welten liegt in deinen Händen.
            </motion.p>
          </motion.div>
        )}

        {gameState === 'nameInput' && (
          <NameInput onNameSubmit={handleNameSubmit} />
        )}

        {(gameState === 'playing' || gameState === 'paused') && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ width: '100%', height: '100%' }}
          >
            <GameCanvas playerName={playerName} />

            {/* Pause overlay */}
            <AnimatePresence>
              {gameState === 'paused' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3000
                  }}
                >
                  <motion.h2
                    style={{
                      color: '#00ffff',
                      fontSize: '48px',
                      fontFamily: 'Arial',
                      marginBottom: '40px'
                    }}
                    animate={{
                      textShadow: [
                        '0 0 10px #00ffff',
                        '0 0 20px #00ffff',
                        '0 0 10px #00ffff'
                      ]
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity
                    }}
                  >
                    PAUSED
                  </motion.h2>

                  <motion.button
                    onClick={resumeGame}
                    style={{
                      padding: '15px 40px',
                      fontSize: '18px',
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: '2px solid #00ffff',
                      borderRadius: '8px',
                      color: '#00ffff',
                      cursor: 'pointer',
                      fontFamily: 'Arial'
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    RESUME
                  </motion.button>

                  <motion.button
                    onClick={returnToMenu}
                    style={{
                      padding: '15px 40px',
                      fontSize: '18px',
                      background: 'rgba(255, 68, 68, 0.1)',
                      border: '2px solid #ff4444',
                      borderRadius: '8px',
                      color: '#ff4444',
                      cursor: 'pointer',
                      fontFamily: 'Arial',
                      marginTop: '20px'
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    QUIT TO MENU
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {(gameState === 'won' || gameState === 'lost') && (
          <motion.div
            key="endgame"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #000011 0%, #001122 50%, #000011 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <motion.div
              style={{
                textAlign: 'center',
                padding: '40px',
                background: 'rgba(0, 0, 0, 0.9)',
                border: `3px solid ${gameState === 'won' ? '#00ff00' : '#ff0000'}`,
                borderRadius: '16px',
                maxWidth: '600px'
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.h1
                style={{
                  fontSize: '48px',
                  color: gameState === 'won' ? '#00ff00' : '#ff0000',
                  fontFamily: 'monospace',
                  marginBottom: '20px'
                }}
                animate={{
                  textShadow: [
                    `0 0 20px ${gameState === 'won' ? '#00ff00' : '#ff0000'}`,
                    `0 0 30px ${gameState === 'won' ? '#00ff00' : '#ff0000'}`,
                    `0 0 20px ${gameState === 'won' ? '#00ff00' : '#ff0000'}`
                  ]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity
                }}
              >
                {gameState === 'won' ? 'HARMONY ACHIEVED' : 'SYSTEM FAILURE'}
              </motion.h1>

              <motion.p
                style={{
                  fontSize: '18px',
                  color: '#ffffff',
                  lineHeight: '1.6',
                  marginBottom: '30px'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {gameState === 'won'
                  ? "Through your careful balance of Humanity and KI-Control, you have achieved true harmony. Humans and AI now coexist peacefully, each respecting the other's domain. The digital metropolis thrives under this new equilibrium."
                  : "The balance has been lost. Whether through excessive KI-Control or the complete erasure of Humanity, the system has collapsed. The cells scatter, the network fractures, and darkness falls over the digital realm."
                }
              </motion.p>

              <motion.div
                style={{
                  fontSize: '24px',
                  color: '#00ffff',
                  marginBottom: '30px'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                Final Score: {gameStore.score.toLocaleString()}
              </motion.div>

              <motion.button
                onClick={returnToMenu}
                style={{
                  padding: '15px 40px',
                  fontSize: '18px',
                  background: 'rgba(0, 255, 255, 0.1)',
                  border: '2px solid #00ffff',
                  borderRadius: '8px',
                  color: '#00ffff',
                  cursor: 'pointer',
                  fontFamily: 'monospace'
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
              >
                RETURN TO MENU
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro story overlay */}
      <AnimatePresence>
        {showIntro && (
          <IntroStory
            onComplete={handleIntroComplete}
            onSkip={handleIntroSkip}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
