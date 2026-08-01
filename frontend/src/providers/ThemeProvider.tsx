import { useEffect, useState, type ReactNode } from 'react';
import { ThemeContext, type Theme } from './ThemeContext';

const STORAGE_KEY = 'restack-theme';

function readStoredTheme(): Theme {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' ? 'light' : 'dark';
}

function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('light', theme === 'light');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(readStoredTheme);

    useEffect(() => {
        applyTheme(theme);
        window.localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const setTheme = (next: Theme) => setThemeState(next);
    const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
