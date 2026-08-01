import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'restack-theme';

interface ThemeContextValue {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

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

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
}
