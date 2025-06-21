import React from 'react';

interface AnimatedBrandNameProps {
  className?: string;
}

export const AnimatedBrandName: React.FC<AnimatedBrandNameProps> = ({ className = '' }) => {
  return (
    <div className={`hidden sm:flex items-center overflow-hidden ${className}`}>
      <style>
        {`
          @keyframes slideUp {
            0% {
              transform: translateY(100%);
              opacity: 0;
            }
            100% {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes glowPulse {
            0%, 100% {
              text-shadow: 0 0 0 rgba(255, 255, 255, 0);
            }
            50% {
              text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
            }
          }

          .animate-letter {
            display: inline-block;
            animation: slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
            opacity: 0;
          }

          .premium-text {
            animation: glowPulse 3s infinite;
          }
        `}
      </style>
      <div className="flex items-center gap-1">
        <div className="flex">
          {'NEXUS'.split('').map((letter, index) => (
            <span
              key={index}
              className="animate-letter text-black dark:text-white font-bold text-lg tracking-wider"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {letter}
            </span>
          ))}
        </div>
        <div className="w-px h-6 bg-gradient-to-b from-gray-400 to-gray-600 mx-2" />
        <div className="flex">
          {'TRADE'.split('').map((letter, index) => (
            <span
              key={index}
              className="animate-letter text-gray-600 dark:text-gray-400 font-medium premium-text"
              style={{ animationDelay: `${(index + 6) * 0.1}s` }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}; 