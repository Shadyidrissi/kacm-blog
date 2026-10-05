"use client";

import Link from "next/link";
import { useState } from "react";

import { useLanguage } from "@/components/providers/language-provider";

type LikeUser = {
    user_id: string;
    profile: {
        full_name: string;
        username: string;
        avatar_url: string | null;
    } | null;
};

type PostLikesDialogProps = {
    postId: string;
    likesCount: number;
};

export default function PostLikesDialog({
    postId,
    likesCount,
}: PostLikesDialogProps) {
    const { locale } = useLanguage();

    const [open, setOpen] =
        useState(false);

    const [users, setUsers] =
        useState<LikeUser[]>([]);

    const [loading, setLoading] =
        useState(false);

    async function openDialog() {
        setOpen(true);

        if (users.length > 0) {
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                `/api/posts/${postId}/likes`,
            );

            if (!response.ok) {
                throw new Error(
                    "Failed to load likes",
                );
            }

            const data =
                await response.json();

            setUsers(data.users ?? []);
        } catch (error) {
            console.error(
                "Load post likes error:",
                error,
            );
        } finally {
            setLoading(false);
        }
    }

    if (likesCount <= 0) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                onClick={openDialog}
                className="text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
            >
                {likesCount}{" "}
                {locale === "ar"
                    ? "إعجاب"
                    : likesCount === 1
                      ? "like"
                      : "likes"}
            </button>

            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
                    <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
                            <h2 className="font-bold text-zinc-900 dark:text-white">
                                {locale ===
                                "ar"
                                    ? "الأشخاص الذين أعجبوا بالمنشور"
                                    : "People who liked this post"}
                            </h2>

                            <button
                                type="button"
                                onClick={() =>
                                    setOpen(
                                        false,
                                    )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-full text-xl text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                                ×
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto p-3">
                            {loading ? (
                                <p className="p-4 text-center text-sm text-zinc-500">
                                    {locale ===
                                    "ar"
                                        ? "جاري التحميل..."
                                        : "Loading..."}
                                </p>
                            ) : users.length ===
                              0 ? (
                                <p className="p-4 text-center text-sm text-zinc-500">
                                    {locale ===
                                    "ar"
                                        ? "لا توجد إعجابات."
                                        : "No likes yet."}
                                </p>
                            ) : (
                                <div className="space-y-1">
                                    {users.map(
                                        (
                                            item,
                                        ) => {
                                            if (
                                                !item.profile
                                            ) {
                                                return null;
                                            }

                                            const profile =
                                                item.profile;

                                            return (
                                                <Link
                                                    key={
                                                        item.user_id
                                                    }
                                                    href={`/profile/${encodeURIComponent(profile.username)}`}
                                                    onClick={() =>
                                                        setOpen(
                                                            false,
                                                        )
                                                    }
                                                    className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                                >
                                                    {profile.avatar_url ? (
                                                        <img
                                                            src={
                                                                profile.avatar_url
                                                            }
                                                            alt={
                                                                profile.full_name
                                                            }
                                                            className="h-11 w-11 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-700 font-bold text-white">
                                                            {profile.full_name
                                                                .charAt(
                                                                    0,
                                                                )
                                                                .toUpperCase()}
                                                        </div>
                                                    )}

                                                    <div className="min-w-0">
                                                        <p className="truncate font-semibold text-zinc-900 dark:text-white">
                                                            {
                                                                profile.full_name
                                                            }
                                                        </p>

                                                        <p className="truncate text-sm text-zinc-500">
                                                            @
                                                            {
                                                                profile.username
                                                            }
                                                        </p>
                                                    </div>
                                                </Link>
                                            );
                                        },
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}