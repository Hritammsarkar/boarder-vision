/**
 * BorderVision AI — Severity Badge Component
 */

'use client';

import React from 'react';
import { SEVERITY_CONFIG } from '@/lib/constants';
import type { Severity } from '@/lib/types';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md' | 'lg';
}

export default function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.warning;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border ${sizeClasses[size]} ${config.pulse ? 'animate-pulse' : ''}`}
      style={{
        color: config.color,
        backgroundColor: config.bg,
        borderColor: config.border,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-1.5"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
