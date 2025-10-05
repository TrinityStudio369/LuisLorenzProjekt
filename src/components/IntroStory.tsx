import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IntroStoryProps {
  onComplete: () => void;
  onSkip: () => void;
}

const storyLines = [
  {
    text: "Willkommen in der digitalen Metropole...",
    duration: 2500,
    sound: null
  },
  {
    text: "Du bist eine Wächterzelle - der letzte Code, um Menschlichkeit zu bewahren.",
    duration: 3500,
    sound: null
  },
  {
    text: "Datenpellets stärken dich, aber sie verschieben das Gleichgewicht zwischen Menschlichkeit und KI-Kontrolle.",
    duration: 4000,
    sound: null
  },
  {
    text: "Grüne Zivilisten können zu Verbündeten werden. Rote Drohnen jagen dich. Lila Knotenpunkte sind KI-Zentren.",
    duration: 4500,
    sound: null
  },
  {
    text: "Erreiche Harmonie (Menschlichkeit ≥85%, KI-Kontrolle ≤20%) oder totale Abschaltung (KI-Kontrolle = 0%).",
    duration: 4500,
    sound: null
  },
  {
    text: "Deine Entscheidungen bestimmen das Schicksal beider Welten...",
    duration: 3500,
    sound: null
  }
];

// Audio placeholder - will be replaced with actual audio files later
const typewriterSound = {
  play: () => console.log('Typewriter sound')
};

export const IntroStory: React.FC<IntroStoryProps> = ({ onComplete, onSkip }) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [canSkip, setCanSkip] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    // If already completed, don't do anything
    if (isCompleted) return;

    const currentLine = storyLines[currentLineIndex];
    if (!currentLine) {
      if (!isCompleted) {
        setIsCompleted(true);
        onComplete();
      }
      return;
    }

    let charIndex = 0;
    setDisplayedText('');
    setIsTyping(true);
    setCanSkip(false);

    const typeInterval = setInterval(() => {
      if (charIndex < currentLine.text.length) {
        setDisplayedText(currentLine.text.slice(0, charIndex + 1));
        typewriterSound.play();
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setIsTyping(false);
        setCanSkip(true);

        // Auto-advance after the line duration
        setTimeout(() => {
          setCurrentLineIndex(prev => prev + 1);
        }, currentLine.duration);
      }
    }, 50);

    return () => clearInterval(typeInterval);
  }, [currentLineIndex, isCompleted]); // Removed onComplete from dependencies

  const handleSkip = () => {
    if (isCompleted) return; // Don't do anything if already completed

    if (canSkip) {
      setCurrentLineIndex(prev => prev + 1);
    } else {
      onSkip();
    }
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      handleSkip();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // If completed, don't render anything
  if (isCompleted) {
    return null;
  }

  return (
    <motion.div
      className="intro-story"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #000011 0%, #001122 50%, #000011 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        cursor: 'pointer'
      }}
      onClick={handleSkip}
    >
      {/* Animated background particles */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: '2px',
              height: '2px',
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
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Main story text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentLineIndex}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          style={{
            maxWidth: '800px',
            textAlign: 'center',
            padding: '40px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '2px solid #00ffff',
            borderRadius: '16px',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)',
            fontFamily: 'monospace'
          }}
        >
          <motion.p
            style={{
              fontSize: '24px',
              lineHeight: '1.6',
              color: '#00ffff',
              margin: 0,
              textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
            }}
            animate={{
              textShadow: [
                '0 0 10px rgba(0, 255, 255, 0.5)',
                '0 0 20px rgba(0, 255, 255, 0.8)',
                '0 0 10px rgba(0, 255, 255, 0.5)'
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity
            }}
          >
            {displayedText}
            {isTyping && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                style={{ color: '#ffffff' }}
              >
                _
              </motion.span>
            )}
          </motion.p>
        </motion.div>
      </AnimatePresence>

      {/* Progress indicator */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '8px'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {storyLines.map((_, index) => (
          <motion.div
            key={index}
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: index === currentLineIndex ? '#00ffff' : 'rgba(0, 255, 255, 0.3)',
              border: '1px solid #00ffff'
            }}
            animate={{
              scale: index === currentLineIndex ? [1, 1.2, 1] : 1,
              boxShadow: index === currentLineIndex
                ? ['0 0 5px #00ffff', '0 0 15px #00ffff', '0 0 5px #00ffff']
                : 'none'
            }}
            transition={{
              duration: 1.5,
              repeat: index === currentLineIndex ? Infinity : 0
            }}
          />
        ))}
      </motion.div>

      {/* Skip instruction */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          color: '#00ffff',
          fontFamily: 'monospace',
          fontSize: '14px',
          opacity: canSkip ? 1 : 0.5
        }}
        animate={{
          opacity: canSkip ? [0.5, 1, 0.5] : 0.5
        }}
        transition={{
          duration: 1,
          repeat: canSkip ? Infinity : 0
        }}
      >
        {canSkip ? 'Click or press SPACE to continue' : 'Please wait...'}
      </motion.div>

      {/* Title */}
      <motion.h1
        style={{
          position: 'absolute',
          top: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#00ffff',
          fontFamily: 'monospace',
          textShadow: '0 0 20px rgba(0, 255, 255, 0.8)',
          margin: 0
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        HUMANITY PROTOCOL
        <motion.span
          style={{
            display: 'block',
            fontSize: '20px',
            fontWeight: 'normal',
            color: '#ff4444',
            textShadow: '0 0 10px rgba(255, 68, 68, 0.5)',
            lineHeight: '1.4'
          }}
          animate={{
            color: ['#ff4444', '#ffff00', '#ff4444']
          }}
          transition={{
            duration: 2,
            repeat: Infinity
          }}
        >
          Der letzte Code,<br />um Menschlichkeit zu bewahren
        </motion.span>
      </motion.h1>
    </motion.div>
  );
};
