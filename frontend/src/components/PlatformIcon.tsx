import React from 'react';
import type { PlatformMark } from '../data/platformMarks';

const PlatformIcon: React.FC<{ mark: PlatformMark; className?: string }> = ({ mark, className }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
        <path d={mark.path} />
    </svg>
);

export default PlatformIcon;
