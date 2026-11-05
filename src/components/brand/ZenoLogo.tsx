import React from 'react';

interface ZenoLogoProps {
  variant?: 'light' | 'dark' | 'card' | 'badge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const ZenoLogo: React.FC<ZenoLogoProps> = ({
  variant = 'dark',
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 32, text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 42, text: 'text-xl', sub: 'text-[11px]' },
    lg: { icon: 56, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 72, text: 'text-3xl', sub: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  // Colors based on variant
  const outlineColor = variant === 'light' ? '#0A1931' : '#FFFFFF';
  const tealColor = '#00D4FF';
  const goldColor = '#D4A017';
  const chipBg = variant === 'light' ? '#0A1931' : '#061021';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* SVG Icon: House Outline + Circuit Z + Bottom Chip */}
      <svg
        width={currentSize.icon}
        height={currentSize.icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform hover:scale-105 duration-200"
      >
        <defs>
          {/* Subtle Glow Filter for Circuit Traces */}
          <filter id="circuitGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
          <linearGradient id="tealGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0DB5B5" />
          </linearGradient>
        </defs>

        {/* House Outline */}
        {/* Roof Peak at (50, 8), Eaves at (12, 40) and (88, 40), Walls down to (22, 92) and (78, 92) */}
        <path
          d="M50 8 L88 40 L78 40 L78 90 L22 90 L22 40 L12 40 Z"
          stroke={outlineColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Circuit Board Traces forming the 'Z' Letter */}
        <g filter="url(#circuitGlow)">
          {/* Top Horizontal Bar of 'Z' */}
          <line x1="32" y1="34" x2="68" y2="34" stroke={tealColor} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="32" cy="34" r="3" fill={tealColor} />
          <circle cx="68" cy="34" r="3" fill={tealColor} />

          {/* Circuit branch trace */}
          <line x1="40" y1="34" x2="40" y2="24" stroke={tealColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="40" cy="24" r="2" fill={tealColor} />

          {/* Diagonal of 'Z' */}
          <line x1="68" y1="34" x2="32" y2="66" stroke={tealColor} strokeWidth="5" strokeLinecap="round" />

          {/* Circuit node on diagonal */}
          <circle cx="50" cy="50" r="3" fill="#7DD3FC" />
          <line x1="50" y1="50" x2="62" y2="50" stroke={tealColor} strokeWidth="2" strokeDasharray="2 2" />
          <circle cx="62" cy="50" r="2" fill={tealColor} />

          {/* Bottom Horizontal Bar of 'Z' */}
          <line x1="32" y1="66" x2="68" y2="66" stroke={tealColor} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="32" cy="66" r="3" fill={tealColor} />
          <circle cx="68" cy="66" r="3" fill={tealColor} />

          {/* Circuit branch trace */}
          <line x1="60" y1="66" x2="60" y2="74" stroke={tealColor} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="60" cy="74" r="2" fill={tealColor} />
        </g>

        {/* Small Microchip Icon with 'Z' inside at bottom of house */}
        <g transform="translate(38, 76)">
          {/* Chip Body */}
          <rect
            x="0"
            y="0"
            width="24"
            height="16"
            rx="2"
            fill={chipBg}
            stroke={tealColor}
            strokeWidth="1.5"
          />
          {/* Left Pins */}
          <line x1="-3" y1="4" x2="0" y2="4" stroke={goldColor} strokeWidth="1.5" />
          <line x1="-3" y1="8" x2="0" y2="8" stroke={goldColor} strokeWidth="1.5" />
          <line x1="-3" y1="12" x2="0" y2="12" stroke={goldColor} strokeWidth="1.5" />

          {/* Right Pins */}
          <line x1="24" y1="4" x2="27" y2="4" stroke={goldColor} strokeWidth="1.5" />
          <line x1="24" y1="8" x2="27" y2="8" stroke={goldColor} strokeWidth="1.5" />
          <line x1="24" y1="12" x2="27" y2="12" stroke={goldColor} strokeWidth="1.5" />

          {/* Z on chip */}
          <path
            d="M8 4 H16 L8 12 H16"
            stroke="#FFFFFF"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>

      {/* Typography */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`font-heading font-black tracking-wider ${
                variant === 'light' ? 'text-zeno-navy' : 'text-white'
              } ${currentSize.text}`}
            >
              ZENO
            </span>
            <span className={`font-heading font-extrabold text-zeno-teal ${currentSize.text}`}>
              TECH
            </span>
            <span className={`font-heading font-bold text-xs px-1.5 py-0.5 rounded tracking-wide ${
              variant === 'light' ? 'bg-zeno-navy text-white' : 'bg-zeno-teal/20 text-zeno-teal border border-zeno-teal/40'
            }`}>
              SOLUTION
            </span>
          </div>
          <span
            className={`font-medium tracking-widest uppercase mt-0.5 text-slate-400 ${currentSize.sub}`}
          >
            Smart Access Systems
          </span>
        </div>
      )}
    </div>
  );
};
