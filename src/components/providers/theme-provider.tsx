"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

type Theme = "light" | "dark";

type ThemeContextType = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
};

const ThemeContext =
    createContext<ThemeContextType | null>(null);

export function ThemeProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [theme, setThemeState] =
        useState<Theme>("light");

    useEffect(() => {
        const savedTheme =
            window.localStorage.getItem(
                "kacm-theme",
            );

        const nextTheme: Theme =
            savedTheme === "dark"
                ? "dark"
                : "light";

        setThemeState(nextTheme);

        document.documentElement.classList.toggle(
            "dark",
            nextTheme === "dark",
        );
    }, []);

    function setTheme(nextTheme: Theme) {
        setThemeState(nextTheme);

        window.localStorage.setItem(
            "kacm-theme",
            nextTheme,
        );

        document.documentElement.classList.toggle(
            "dark",
            nextTheme === "dark",
        );
    }

    function toggleTheme() {
        setTheme(
            theme === "light"
                ? "dark"
                : "light",
        );
    }

    return (
        <ThemeContext.Provider
            value={{
                theme,
                setTheme,
                toggleTheme,
            }}
        >
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context =
        useContext(ThemeContext);

    if (!context) {
        throw new Error(
            "useTheme must be used inside ThemeProvider",
        );
    }

    return context;
}