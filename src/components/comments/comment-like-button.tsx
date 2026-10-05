"use client";

import { useState, useTransition } from "react";

import { toggleCommentLike } from "@/app/actions/comment-likes";
import { useLanguage } from "@/components/providers/language-provider";

type CommentLikeButtonProps = {
    commentId: string;
    initialLiked: boolean;
    initialLikesCount: number;
    isLoggedIn: boolean;
};

export default function CommentLikeButton({
    commentId,
    initialLiked,
    initialLikesCount,
    isLoggedIn,
}: CommentLikeButtonProps) {
    const { t } = useLanguage();

    const [liked, setLiked] =
        useState(initialLiked);

    const [likesCount, setLikesCount] =
        useState(initialLikesCount);

    const [
        isPending,
        startTransition,
    ] = useTransition();

    const [error, setError] =
        useState<string | null>(null);

    function handleLike() {
        if (!isLoggedIn) {
            setError(
                t.common.loginToLikeComment,
            );

            return;
        }

        setError(null);

        startTransition(async () => {
            const result =
                await toggleCommentLike(
                    commentId,
                );

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
                className={`inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium transition ${
                    liked
                        ? "text-red-600 dark:text-red-400"
                        : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                } ${
                    isPending
                        ? "cursor-not-allowed opacity-50"
                        : ""
                }`}
            >
                <span className="text-base">
                    {liked ? "♥" : "♡"}
                </span>

                <span>
                    {liked
                        ? t.common.unlike
                        : t.common.like}
                </span>

                <span>
                    {likesCount}
                </span>
            </button>

            {error && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
}