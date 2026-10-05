"use client";

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import {
    defaultLocale,
    type Locale,
} from "@/lib/i18n/config";

import en from "@/lib/i18n/en";
import ar from "@/lib/i18n/ar";

const translations = {
    en,
    ar,
};

type TranslationObject = typeof en;

type LanguageContextType = {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    toggleLocale: () => void;
    t: TranslationObject;
};

const LanguageContext =
    createContext<LanguageContextType | null>(null);

export function LanguageProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [locale, setLocaleState] =
        useState<Locale>(defaultLocale);

    useEffect(() => {
        const savedLocale =
            window.localStorage.getItem("kacm-locale");

        // English is always the default language.
        const nextLocale: Locale =
            savedLocale === "ar" ? "ar" : "en";

        setLocaleState(nextLocale);

        document.documentElement.lang = nextLocale;
        document.documentElement.dir =
            nextLocale === "ar" ? "rtl" : "ltr";
    }, []);

    function setLocale(nextLocale: Locale) {
        setLocaleState(nextLocale);

        window.localStorage.setItem(
            "kacm-locale",
            nextLocale,
        );

        document.documentElement.lang = nextLocale;
        document.documentElement.dir =
            nextLocale === "ar" ? "rtl" : "ltr";
    }

    function toggleLocale() {
        setLocale(
            locale === "en" ? "ar" : "en",
        );
    }

    return (
        <LanguageContext.Provider
            value={{
                locale,
                setLocale,
                toggleLocale,
                t: translations[locale],
            }}
        >
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context =
        useContext(LanguageContext);

    if (!context) {
        throw new Error(
            "useLanguage must be used inside LanguageProvider",
        );
    }

    return context;
}