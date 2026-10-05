
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";
import { useTheme } from "@/components/providers/theme-provider";
import { createClient } from "@/lib/supabase/client";

type Profile = {
    full_name: string;
    username: string;
    avatar_url: string | null;
    role: "fan" | "admin";
};

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();

    const { locale, setLocale, t } = useLanguage();
    const { theme, toggleTheme } = useTheme();

    const [avatarUrl, setAvatarUrl] =
        useState<string | null>(null);

    const [user, setUser] =
        useState<any>(null);

    const [profile, setProfile] =
        useState<Profile | null>(null);

    const [isMenuOpen, setIsMenuOpen] =
        useState(false);

    const [isLoading, setIsLoading] =
        useState(true);

    const supabase = createClient();

    async function loadAvatar() {
        try {
            const response = await fetch(
                "/api/profile/avatar",
                {
                    cache: "no-store",
                },
            );

            if (!response.ok) {
                setAvatarUrl(null);
                return;
            }

            const data =
                await response.json();

            setAvatarUrl(
                data.avatarUrl ?? null,
            );
        } catch (error) {
            console.error(
                "Navbar avatar error:",
                error,
            );

            setAvatarUrl(null);
        }
    }

    useEffect(() => {
        let mounted = true;

        async function loadUser() {
            const {
                data: { user },
            } =
                await supabase.auth.getUser();

            if (!mounted) return;

            setUser(user);

            if (!user) {
                setProfile(null);
                setAvatarUrl(null);
                setIsLoading(false);
                return;
            }

            const { data, error } =
                await supabase
                    .from("profiles")
                    .select(
                        "full_name, username, avatar_url, role",
                    )
                    .eq("id", user.id)
                    .maybeSingle();

            if (!mounted) return;

            if (error) {
                console.error(
                    "Navbar profile error:",
                    error,
                );

                setProfile(null);
                setAvatarUrl(null);
                setIsLoading(false);
                return;
            }

            setProfile(
                data as Profile | null,
            );

            if (data?.avatar_url) {
                await loadAvatar();
            } else {
                setAvatarUrl(null);
            }

            if (mounted) {
                setIsLoading(false);
            }
        }

        loadUser();

        const {
            data: {
                subscription,
            },
        } =
            supabase.auth.onAuthStateChange(
                async (
                    _event,
                    session,
                ) => {
                    if (!mounted) return;

                    const nextUser =
                        session?.user ?? null;

                    setUser(nextUser);

                    if (!nextUser) {
                        setProfile(null);
                        setAvatarUrl(null);
                        setIsLoading(false);
                        return;
                    }

                    const {
                        data,
                        error,
                    } =
                        await supabase
                            .from("profiles")
                            .select(
                                "full_name, username, avatar_url, role",
                            )
                            .eq(
                                "id",
                                nextUser.id,
                            )
                            .maybeSingle();

                    if (!mounted) return;

                    if (error) {
                        console.error(
                            "Navbar profile error:",
                            error,
                        );

                        setProfile(null);
                        setAvatarUrl(null);
                        setIsLoading(false);
                        return;
                    }

                    setProfile(
                        data as Profile | null,
                    );

                    if (data?.avatar_url) {
                        await loadAvatar();
                    } else {
                        setAvatarUrl(null);
                    }

                    if (mounted) {
                        setIsLoading(false);
                    }
                },
            );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [supabase]);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    async function handleLogout() {
        await supabase.auth.signOut();

        setUser(null);
        setProfile(null);
        setAvatarUrl(null);
        setIsMenuOpen(false);

        router.push("/");
        router.refresh();
    }

    function handleLanguageChange() {
        setLocale(
            locale === "en"
                ? "ar"
                : "en",
        );
    }

    const navItems = [
        {
            href: "/",
            label: t.nav.home,
        },
        {
            href: "/matches",
            label: t.nav.matches,
        },
        {
            href: "/table",
            label: t.nav.table,
        },
        {
            href: "/about",
            label: t.nav.about,
        },
    ];

    function isActive(href: string) {
        if (href === "/") {
            return pathname === "/";
        }

        return pathname.startsWith(href);
    }

    const profileInitial =
        profile?.full_name
            ?.charAt(0)
            .toUpperCase() ?? "K";

    return (
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-950/95">
            <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

                {/* Logo */}
                <Link
                    href="/"
                    className="flex shrink-0 items-center gap-3"
                >
                    <img
                        src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8W8bU_sQNHq9VtpBa05Ootc4TkT7bv-4lmSVEtibFsMQ2kCHqDdB9ZKuh&s=10"
                        width="32"
                        height="32"
                        className="rounded-full object-cover"
                        alt="KACM Logo"
                    />

                    <div className="hidden sm:block">
                        <p className="text-sm font-black tracking-wide text-gray-950 dark:text-white">
                            KACM
                        </p>

                        <p className="text-[10px] font-medium uppercase tracking-widest text-gray-500">
                            Marrakech
                        </p>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden items-center gap-1 md:flex">
                    {navItems.map((item) => {
                        const active =
                            isActive(
                                item.href,
                            );

                        return (
                            <Link
                                key={
                                    item.href
                                }
                                href={
                                    item.href
                                }
                                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                                    active
                                        ? "bg-red-700 text-white"
                                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                }`}
                            >
                                {
                                    item.label
                                }
                            </Link>
                        );
                    })}
                </nav>

                {/* Desktop Right Side */}
                <div className="hidden items-center gap-2 md:flex">

                    {/* Language */}
                    <button
                        type="button"
                        onClick={
                            handleLanguageChange
                        }
                        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                        title={
                            t.nav.language
                        }
                        aria-label={
                            t.nav.language
                        }
                    >
                        {locale === "en"
                            ? "AR"
                            : "EN"}
                    </button>

                    {/* Theme */}
                    <button
                        type="button"
                        onClick={
                            toggleTheme
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-lg transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                        title={
                            t.nav.theme
                        }
                        aria-label={
                            t.nav.theme
                        }
                    >
                        {theme === "light"
                            ? "☾"
                            : "☀"}
                    </button>

                    {/* Visitor */}
                    {!isLoading &&
                        !user && (
                            <>
                                <Link
                                    href="/login"
                                    className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    {
                                        t.nav
                                            .login
                                    }
                                </Link>

                                <Link
                                    href="/register"
                                    className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
                                >
                                    {
                                        t.nav
                                            .register
                                    }
                                </Link>
                            </>
                        )}

                    {/* Logged-in User */}
                    {!isLoading &&
                        user &&
                        profile && (
                            <div className="flex items-center gap-2">

                                {/* Admin */}
                                {profile.role ===
                                    "admin" && (
                                    <Link
                                        href="/admin"
                                        className="rounded-lg bg-red-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-800"
                                    >
                                        {
                                            t.nav
                                                .admin
                                        }
                                    </Link>
                                )}

                                {/* Profile */}
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    {avatarUrl ? (
                                        <img
                                            src={
                                                avatarUrl
                                            }
                                            alt={
                                                profile.full_name
                                            }
                                            className="h-9 w-9 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-700 text-sm font-bold text-white">
                                            {
                                                profileInitial
                                            }
                                        </div>
                                    )}

                                    <div className="max-w-32">
                                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                                            {
                                                profile.full_name
                                            }
                                        </p>

                                        <p className="truncate text-xs text-gray-500">
                                            @
                                            {
                                                profile.username
                                            }
                                        </p>
                                    </div>
                                </Link>

                                {/* Logout */}
                                <button
                                    type="button"
                                    onClick={
                                        handleLogout
                                    }
                                    className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-red-700 dark:text-gray-400 dark:hover:bg-gray-800"
                                >
                                    {
                                        t.nav
                                            .logout
                                    }
                                </button>
                            </div>
                        )}
                </div>

                {/* Mobile Controls */}
                <div className="flex items-center gap-2 md:hidden">

                    {/* Language */}
                    <button
                        type="button"
                        onClick={
                            handleLanguageChange
                        }
                        className="rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                        {locale === "en"
                            ? "AR"
                            : "EN"}
                    </button>

                    {/* Theme */}
                    <button
                        type="button"
                        onClick={
                            toggleTheme
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-lg dark:border-gray-700"
                    >
                        {theme === "light"
                            ? "☾"
                            : "☀"}
                    </button>

                    {/* Menu */}
                    <button
                        type="button"
                        onClick={() =>
                            setIsMenuOpen(
                                (current) =>
                                    !current,
                            )
                        }
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-xl dark:border-gray-700"
                        aria-label="Open menu"
                        aria-expanded={
                            isMenuOpen
                        }
                    >
                        {isMenuOpen
                            ? "×"
                            : "☰"}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="border-t border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950 md:hidden">

                    <nav className="space-y-1">
                        {navItems.map(
                            (item) => {
                                const active =
                                    isActive(
                                        item.href,
                                    );

                                return (
                                    <Link
                                        key={
                                            item.href
                                        }
                                        href={
                                            item.href
                                        }
                                        className={`block rounded-lg px-4 py-3 text-sm font-semibold ${
                                            active
                                                ? "bg-red-700 text-white"
                                                : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                        }`}
                                    >
                                        {
                                            item.label
                                        }
                                    </Link>
                                );
                            },
                        )}
                    </nav>

                    <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">

                        {/* Mobile Visitor */}
                        {!isLoading &&
                            !user && (
                                <div className="grid grid-cols-2 gap-2">
                                    <Link
                                        href="/login"
                                        className="rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-semibold dark:border-gray-700"
                                    >
                                        {
                                            t.nav
                                                .login
                                        }
                                    </Link>

                                    <Link
                                        href="/register"
                                        className="rounded-lg bg-red-700 px-4 py-3 text-center text-sm font-semibold text-white"
                                    >
                                        {
                                            t.nav
                                                .register
                                        }
                                    </Link>
                                </div>
                            )}

                        {/* Mobile Logged-in User */}
                        {!isLoading &&
                            user &&
                            profile && (
                                <div className="space-y-2">

                                    <Link
                                        href="/profile"
                                        className="flex items-center gap-3 rounded-xl p-3 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        {avatarUrl ? (
                                            <img
                                                src={
                                                    avatarUrl
                                                }
                                                alt={
                                                    profile.full_name
                                                }
                                                className="h-11 w-11 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-700 font-bold text-white">
                                                {
                                                    profileInitial
                                                }
                                            </div>
                                        )}

                                        <div>
                                            <p className="text-sm font-bold">
                                                {
                                                    profile.full_name
                                                }
                                            </p>

                                            <p className="text-xs text-gray-500">
                                                @
                                                {
                                                    profile.username
                                                }
                                            </p>
                                        </div>
                                    </Link>

                                    {/* Admin */}
                                    {profile.role ===
                                        "admin" && (
                                        <Link
                                            href="/admin"
                                            className="block rounded-lg bg-red-700 px-4 py-3 text-center text-sm font-bold text-white"
                                        >
                                            {
                                                t.nav
                                                    .adminDashboard
                                            }
                                        </Link>
                                    )}

                                    {/* Logout */}
                                    <button
                                        type="button"
                                        onClick={
                                            handleLogout
                                        }
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-semibold text-red-700 dark:border-gray-700"
                                    >
                                        {
                                            t.nav
                                                .logout
                                        }
                                    </button>
                                </div>
                            )}
                    </div>
                </div>
            )}
        </header>
    );
}

