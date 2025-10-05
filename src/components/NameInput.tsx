import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface NameInputProps {
  onNameSubmit: (name: string) => void;
}

export const NameInput: React.FC<NameInputProps> = ({ onNameSubmit }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    if (trimmedName.length === 0) {
      setError('Please enter a name');
      return;
    }

    if (trimmedName.length > 15) {
      setError('Name must be 15 characters or less');
      return;
    }

    if (!/^[a-zA-Z0-9\s]+$/.test(trimmedName)) {
      setError('Name can only contain letters, numbers, and spaces');
      return;
    }

    setError('');
    onNameSubmit(trimmedName);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
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
        zIndex: 3000
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
              opacity: [0, 0.8, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Title */}
      <motion.h1
        style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: '#00ffff',
          textShadow: '0 0 20px rgba(0, 255, 255, 0.8)',
          marginBottom: '20px',
          zIndex: 1
        }}
        animate={{
          textShadow: [
            '0 0 20px rgba(0, 255, 255, 0.8)',
            '0 0 30px rgba(0, 255, 255, 1)',
            '0 0 20px rgba(0, 255, 255, 0.8)'
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
          textShadow: '0 0 10px rgba(255, 68, 68, 0.5)',
          marginBottom: '40px',
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

      {/* Name input form */}
      <motion.form
        onSubmit={handleSubmit}
        style={{
          background: 'rgba(0, 0, 0, 0.9)',
          border: '2px solid #00ffff',
          borderRadius: '16px',
          padding: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: '300px',
          zIndex: 1
        }}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h2 style={{
          color: '#00ffff',
          marginBottom: '20px',
          fontSize: '24px',
          textAlign: 'center'
        }}>
          Enter Your Cell Name
        </h2>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name..."
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '18px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '2px solid #00ffff',
            borderRadius: '8px',
            color: '#ffffff',
            outline: 'none',
            marginBottom: '10px',
            textAlign: 'center'
          }}
          autoFocus
          maxLength={15}
        />

        {error && (
          <div style={{
            color: '#ff4444',
            fontSize: '14px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <motion.button
          type="submit"
          style={{
            padding: '12px 30px',
            fontSize: '18px',
            fontWeight: 'bold',
            background: 'rgba(0, 255, 255, 0.1)',
            border: '2px solid #00ffff',
            borderRadius: '8px',
            color: '#00ffff',
            cursor: 'pointer',
            outline: 'none'
          }}
          whileHover={{
            background: 'rgba(0, 255, 255, 0.2)',
            scale: 1.05
          }}
          whileTap={{ scale: 0.95 }}
        >
          START GAME
        </motion.button>

        <div style={{
          color: '#888888',
          fontSize: '12px',
          marginTop: '20px',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          Eat pellets to grow • Split with SPACE when big enough<br />
          Avoid smaller cells eating you!
        </div>
      </motion.form>
    </motion.div>
  );
};
