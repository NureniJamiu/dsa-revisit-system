import React from 'react';
import type { PlatformMark } from '../data/platformMarks';

const PlatformIcon: React.FC<{ mark: PlatformMark; className?: string }> = ({ mark, className }) => {
    if (!mark.path) {
        return (
            <span
                className={`platform-monogram flex items-center justify-center rounded-[5px] bg-white/[0.06] border border-white/[0.08] text-[9px] font-mono-tabular font-semibold text-zinc-500 transition-colors duration-200 ${className ?? ''}`}
            >
                {mark.name.charAt(0)}
            </span>
        );
    }
    return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
            <path d={mark.path} />
        </svg>
    );
};

export default PlatformIcon;
