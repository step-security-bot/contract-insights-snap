import React from 'react';
import klerosLogo from '../assets/kleros-symbol.svg';

export const KlerosLogo = ({ color, size }: { color: string; size: number }) => (
  <svg width={size} height={size} viewBox="0 0 125 125" fill="none" xmlns="http://www.w3.org/2000/svg">
    <image href={klerosLogo} width="100%" height="100%" />
  </svg>
);