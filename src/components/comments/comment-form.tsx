"use client";

import {
    FormEvent,
    useState,
    useTransition,
} from "react";

import { createComment } from "@/app/actions/comments";

type CommentFormProps = {
    postId: string;
};

export default function CommentForm({
    postId,
}: CommentFormProps) {
    const [content, setContent] =
        useState("");

    const [error, setError] =
        useState<string | null>(null);

    const [success, setSuccess] =
        useState(false);

    const [isPending, startTransition] =
        useTransition();

    function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError(null);
        setSuccess(false);

        const trimmed =
            content.trim();

        if (!trimmed) {
            setError(
                "Comment cannot be empty.",
            );
            return;
        }

        startTransition(async () => {
            const result =
                await createComment(
                    postId,
                    trimmed,
                );

            if (result.error) {
                setError(result.error);
                return;
            }

            setContent("");
            setSuccess(true);
        });
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-3"
        >
            <textarea
                value={content}
                onChange={(event) =>
                    setContent(
                        event.target.value,
                    )
                }
                maxLength={2000}
                rows={3}
                placeholder="Write a comment..."
                disabled={isPending}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-gray-400"
            />

            <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-gray-500">
                    {content.length}/2000
                </p>

                <button
                    type="submit"
                    disabled={
                        isPending ||
                        !content.trim()
                    }
                    className="rounded-xl bg-black px-5 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isPending
                        ? "Posting..."
                        : "Comment"}
                </button>
            </div>

            {error && (
                <p className="text-sm text-red-600">
                    {error}
                </p>
            )}

            {success && (
                <p className="text-sm text-green-600">
                    Comment added.
                </p>
            )}
        </form>
    );
}