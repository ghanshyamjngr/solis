import React, { useId } from 'react';

interface SolisMarkProps {
  className?: string;
}

export const SolisMark: React.FC<SolisMarkProps> = ({ className }) => {
  const gradientId = `solis-mark-${useId().replace(/:/g, '')}`;
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Solis assistant">
      <defs>
        <linearGradient id={gradientId} x1="8" y1="4" x2="40" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD166" />
          <stop offset="1" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <path d="M24 4c-10.5 0-18 7.2-18 17.5v5C6 37 13.3 44 24 44s18-7 18-17.5v-5C42 11.2 34.5 4 24 4Z" fill={`url(#${gradientId})`} />
      <path d="M16.5 22.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Zm15 0a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" fill="#49362B" />
      <path d="M17.5 29c1.6 2.2 3.8 3.3 6.5 3.3s4.9-1.1 6.5-3.3" fill="none" stroke="#49362B" strokeLinecap="round" strokeWidth="2.2" />
      <path d="M10 13.5c1.2-2.2 3-4 5.2-5.1" fill="none" stroke="#FFF4D6" strokeLinecap="round" strokeOpacity=".8" strokeWidth="2" />
    </svg>
  );
};
