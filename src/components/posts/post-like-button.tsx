"use client";

import { useState, useTransition } from "react";

import { togglePostLike } from "@/app/actions/likes";
import { useLanguage } from "@/components/providers/language-provider";

type PostLikeButtonProps = {
    postId: string;
    initialLiked: boolean;
    initialLikesCount: number;
    isLoggedIn: boolean;
};

export default function PostLikeButton({
    postId,
    initialLiked,
    initialLikesCount,
    isLoggedIn,
}: PostLikeButtonProps) {
    const { t } = useLanguage();

    const [liked, setLiked] =
        useState(initialLiked);

    const [likesCount, setLikesCount] =
        useState(initialLikesCount);

    const [isPending, startTransition] =
        useTransition();

    const [error, setError] =
        useState<string | null>(null);

    function handleLike() {
        if (!isLoggedIn) {
            setError(
                t.common.loginToLikePost,
            );
            return;
        }

        setError(null);

        startTransition(async () => {
            const result =
                await togglePostLike(postId);

            if (result.error) {
                setError(result.error);
                return;
            }

            if (
                typeof result.liked ===
                "boolean"
            ) {
                setLiked(result.liked);
            }

            if (
                typeof result.likesCount ===
                "number"
            ) {
                setLikesCount(
                    result.likesCount,
                );
            }
        });
    }

    return (
        <div>
            <button
                type="button"
                onClick={handleLike}
                disabled={isPending}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    liked
                        ? "border-red-300 bg-red-50 text-red-600 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                        : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                } ${
                    isPending
                        ? "cursor-not-allowed opacity-60"
                        : ""
                }`}
            >
                <span className="text-base">
                    {liked ? "♥" : "♡"}
                </span>

                <span>
                    {liked
                        ? t.common.liked
                        : t.common.like}
                </span>

                <span>
                    {likesCount}
                </span>
            </button>

            {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
}