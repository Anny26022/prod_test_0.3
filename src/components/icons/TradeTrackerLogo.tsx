import React from 'react';

interface TradeTrackerLogoProps {
  className?: string;
}

export const TradeTrackerLogo: React.FC<TradeTrackerLogoProps> = ({ className = "h-5 w-5" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>
        {`
          @keyframes drawPath {
            to {
              stroke-dashoffset: 0;
            }
          }
          
          @keyframes fadeInScale {
            0% {
              opacity: 0;
              transform: scale(0.8);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
          
          @keyframes rotatePulse {
            0%, 100% {
              transform: rotate(0deg) scale(1);
            }
            50% {
              transform: rotate(180deg) scale(0.95);
            }
          }
          
          @keyframes glowEffect {
            0%, 100% {
              filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3));
            }
            50% {
              filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.6));
            }
          }

          .logo-outer-ring {
            animation: rotatePulse 8s infinite cubic-bezier(0.4, 0, 0.2, 1);
          }

          .logo-inner-elements {
            animation: glowEffect 3s infinite ease-in-out;
          }
        `}
      </style>
      
      {/* Outer decorative ring */}
      <circle
        cx="12"
        cy="12"
        r="11"
        className="logo-outer-ring"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeDasharray="69"
        strokeDashoffset="69"
        style={{
          animation: 'drawPath 2s ease forwards'
        }}
      />

      {/* Inner geometric elements */}
      <g className="logo-inner-elements">
        {/* Diamond shape */}
        <path
          d="M12 4L16 12L12 20L8 12L12 4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 40,
            strokeDashoffset: 40,
            animation: 'drawPath 1.5s ease forwards 0.5s'
          }}
        />
        
        {/* Decorative lines */}
        <path
          d="M8 12H16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{
            strokeDasharray: 8,
            strokeDashoffset: 8,
            animation: 'drawPath 0.5s ease forwards 1s'
          }}
        />
        
        {/* Center dot */}
        <circle
          cx="12"
          cy="12"
          r="1.5"
          fill="currentColor"
          style={{
            opacity: 0,
            animation: 'fadeInScale 0.5s ease forwards 1.5s'
          }}
        />

        {/* Premium accent lines */}
        <path
          d="M12 7L14 12L12 17"
          stroke="currentColor"
          strokeWidth="0.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 20,
            strokeDashoffset: 20,
            animation: 'drawPath 1s ease forwards 1.2s'
          }}
        />
      </g>

      {/* Subtle background glow */}
      <circle
        cx="12"
        cy="12"
        r="6"
        stroke="currentColor"
        strokeWidth="0.25"
        strokeOpacity="0.3"
        style={{
          opacity: 0,
          animation: 'fadeInScale 1s ease forwards 0.8s'
        }}
      />
    </svg>
  );
}; 