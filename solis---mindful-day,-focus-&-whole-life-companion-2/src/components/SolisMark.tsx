import React, { useId } from 'react';

interface SolisMarkProps {
  className?: string;
}

export const SolisMark: React.FC<SolisMarkProps> = ({ className }) => {
  const id = useId().replace(/:/g, '');
  const cloudGradient = `awake-cloud-${id}`;
  const highlightGradient = `awake-highlight-${id}`;
  return (
    <svg className={className} viewBox="0 0 48 48" role="img" aria-label="Awake assistant">
      <defs>
        <linearGradient id={cloudGradient} x1="14" y1="11" x2="34" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F0EAF7" />
          <stop offset=".48" stopColor="#DED3EB" />
          <stop offset="1" stopColor="#C5B5D9" />
        </linearGradient>
        <linearGradient id={highlightGradient} x1="15" y1="15" x2="30" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF9EA" />
          <stop offset="1" stopColor="#FFF9EA" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="#AFC4F0" />
      <ellipse cx="24" cy="40" rx="12.5" ry="2.2" fill="#544866" opacity=".2" />
      <path d="M10.2 26.1c-.1-4.7 3-7.8 7.2-8.2 1.5-4.3 4-6.5 7.7-6.5 4.2 0 6.7 2.5 7.5 6.2 4.2.4 7 3.2 7 7.5v3.7c0 6.9-5.6 10.7-14.8 10.7S10 35.9 10 28.9v-2.8Z" fill={`url(#${cloudGradient})`} />
      <path d="M11.2 25.2c.2-3.4 2.8-5.8 6.5-6.1 1.4-4 3.9-6 7.4-6 3.6 0 5.9 2.1 6.7 5.5 3.6.3 5.8 2.4 6.1 5.4-3.2-2.1-6.5-3.2-11.3-3.2-5.6 0-10.8 1.6-15.4 4.4Z" fill={`url(#${highlightGradient})`} opacity=".95" />
      <path d="M11.8 33.4c-1.8.8-2.1 2.1-1.2 3 1 .9 2.7.4 4-.8m21.6-2.2c1.8.8 2.1 2.1 1.2 3-1 .9-2.7.4-4-.8" fill="none" stroke="#C7B8DA" strokeLinecap="round" strokeWidth="3.5" />
      <ellipse cx="19.5" cy="27.2" rx="1.1" ry="1.65" fill="#45364C" />
      <ellipse cx="29.1" cy="27.2" rx="1.1" ry="1.65" fill="#45364C" />
      <path d="M22.2 31.1c1.1 1.05 2.6 1.05 3.7 0" fill="none" stroke="#45364C" strokeLinecap="round" strokeWidth="1.25" />
      <ellipse cx="15.8" cy="31" rx="2" ry="1.05" fill="#E9A9B6" opacity=".68" />
      <ellipse cx="32.8" cy="31" rx="2" ry="1.05" fill="#E9A9B6" opacity=".68" />
      <path d="M18.1 35.1c1.5 1 3.4 1.6 5.8 1.8m2 0c2.4-.2 4.3-.8 5.8-1.8" fill="none" stroke="#B9A9CF" strokeLinecap="round" strokeWidth="1.4" opacity=".8" />
    </svg>
  );
};
