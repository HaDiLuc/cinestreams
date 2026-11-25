import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  iconOnly = false,
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-8 h-8 sm:w-9 sm:h-9',
    lg: 'w-10 h-10 sm:w-11 sm:h-11',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl sm:text-2xl',
    lg: 'text-2xl sm:text-3xl',
  };

  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2.5 group transition-transform duration-200 active:scale-95 ${className}`}
      aria-label="CineStreams Trang chủ"
    >
      {/* CineStreams Modern Cinema SVG Icon */}
      <div className={`relative flex-shrink-0 ${iconSizes[size]} transition-transform duration-300 group-hover:scale-105 group-hover:rotate-1`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-[0_4px_12px_rgba(245,158,11,0.35)]"
        >
          <defs>
            <linearGradient id="csIconBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="csPlayBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#fef3c7" />
            </linearGradient>
            <filter id="csGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Squircle Background */}
          <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#csIconBg)" filter="url(#csGlow)" />

          {/* Inner Glossy Border */}
          <rect x="3" y="3" width="34" height="34" rx="9" stroke="white" strokeOpacity="0.25" strokeWidth="1.2" />

          {/* Clapperboard Slanted Stripes */}
          <path d="M7 11L11 7M15 11L19 7M23 11L27 7M31 11L33 9" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeOpacity="0.45" />
          <line x1="6" y1="12" x2="34" y2="12" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />

          {/* Play Triangle with Smooth Corners */}
          <path
            d="M16.5 16.2C16.5 15.22 17.57 14.61 18.41 15.11L26.41 19.91C27.23 20.4 27.23 21.6 26.41 22.09L18.41 26.89C17.57 27.39 16.5 26.78 16.5 25.8V16.2Z"
            fill="url(#csPlayBg)"
          />
        </svg>
      </div>

      {/* Typography: Cine in clean white, Streams in glowing amber/orange gradient */}
      {!iconOnly && (
        <span className={`font-black tracking-tight font-sans leading-none select-none ${textSizes[size]}`}>
          <span className="text-white transition-colors duration-200 group-hover:text-amber-100">
            Cine
          </span>
          <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 bg-clip-text text-transparent font-extrabold ml-0.5">
            Streams
          </span>
        </span>
      )}
    </Link>
  );
};

