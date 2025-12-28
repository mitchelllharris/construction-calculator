import React, { useState, useRef, useEffect } from 'react';

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like', color: 'text-blue-600' },
  { type: 'love', emoji: '❤️', label: 'Love', color: 'text-red-600' },
  { type: 'care', emoji: '🤗', label: 'Care', color: 'text-yellow-600' },
  { type: 'haha', emoji: '😂', label: 'Haha', color: 'text-yellow-600' },
  { type: 'wow', emoji: '😮', label: 'Wow', color: 'text-yellow-600' },
  { type: 'sad', emoji: '😢', label: 'Sad', color: 'text-yellow-600' },
  { type: 'angry', emoji: '😠', label: 'Angry', color: 'text-red-600' },
];

export default function ReactionPicker({ onReactionSelect, currentReaction, className = '' }) {
  const [showPicker, setShowPicker] = useState(false);
  const [hoveredReaction, setHoveredReaction] = useState(null);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowPicker(false);
      }
    };

    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPicker]);

  const handleReactionClick = (reactionType) => {
    onReactionSelect(reactionType);
    setShowPicker(false);
  };

  const getReactionButton = () => {
    if (currentReaction) {
      const reaction = REACTIONS.find(r => r.type === currentReaction);
      if (reaction) {
        return (
          <button
            ref={buttonRef}
            onMouseEnter={() => setShowPicker(true)}
            onMouseLeave={() => {
              // Delay closing to allow moving to picker
              setTimeout(() => {
                if (!pickerRef.current?.matches(':hover')) {
                  setShowPicker(false);
                }
              }, 200);
            }}
            onClick={() => handleReactionClick(currentReaction)}
            className={`flex items-center gap-2 ${reaction.color} hover:opacity-80 transition-colors ${className}`}
          >
            <span className="text-lg">{reaction.emoji}</span>
            <span className="text-sm font-medium">{reaction.label}</span>
          </button>
        );
      }
    }
    
    return (
      <button
        ref={buttonRef}
        onMouseEnter={() => setShowPicker(true)}
        onMouseLeave={() => {
          setTimeout(() => {
            if (!pickerRef.current?.matches(':hover')) {
              setShowPicker(false);
            }
          }, 200);
        }}
        onClick={() => handleReactionClick('like')}
        className={`flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors ${className}`}
      >
        <span className="text-lg">👍</span>
        <span className="text-sm">Like</span>
      </button>
    );
  };

  return (
    <div className="relative">
      {getReactionButton()}
      
      {showPicker && (
        <div
          ref={pickerRef}
          onMouseEnter={() => setShowPicker(true)}
          onMouseLeave={() => setShowPicker(false)}
          className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-lg border border-gray-200 p-1 flex items-center gap-1 z-50"
        >
          {REACTIONS.map((reaction) => (
            <button
              key={reaction.type}
              onMouseEnter={() => setHoveredReaction(reaction.type)}
              onMouseLeave={() => setHoveredReaction(null)}
              onClick={() => handleReactionClick(reaction.type)}
              className={`
                w-10 h-10 rounded-full flex items-center justify-center text-2xl
                transition-all duration-200 transform
                ${hoveredReaction === reaction.type ? 'scale-150 z-10' : 'scale-100'}
                hover:scale-150
                ${currentReaction === reaction.type ? 'bg-gray-100' : ''}
              `}
              title={reaction.label}
            >
              {reaction.emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

