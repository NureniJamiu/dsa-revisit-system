import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../providers/ThemeProvider';

interface ThemeToggleProps {
    /** Structural classes (size/padding/rounding). Color classes default to the
     *  general content tokens (--text-secondary/--bg-surface-hover) unless overridden here —
     *  pass explicit color classes when placing this inside the always-dark nav. */
    className?: string;
    iconSize?: number;
}

const DEFAULT_COLOR_CLASSES =
    'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]';

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '', iconSize = 16 }) => {
    const { theme, toggleTheme } = useTheme();
    const isLight = theme === 'light';
    const hasColorOverride = /text-|hover:(text|bg)-/.test(className);

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
            title={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
            className={`inline-flex items-center justify-center rounded-md transition-colors ${hasColorOverride ? '' : DEFAULT_COLOR_CLASSES} ${className}`}
        >
            {isLight ? <Moon size={iconSize} strokeWidth={1.75} /> : <Sun size={iconSize} strokeWidth={1.75} />}
        </button>
    );
};

export default ThemeToggle;
