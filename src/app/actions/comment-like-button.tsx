"use client";

import { useState, useTransition } from "react";

import { toggleCommentLike } from "@/app/actions/comment-likes";

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
                "You must log in to like comments.",
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
                className={`inline-flex items-center gap-1.5 text-xs font-medium transition ${
                    liked
                        ? "text-red-600"
                        : "text-gray-500 hover:text-gray-700"
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
                    {likesCount}
                </span>
            </button>

            {error && (
                <p className="mt-1 text-xs text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}