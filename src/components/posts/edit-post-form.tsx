
"use client";

import {
    useState,
    useTransition,
} from "react";

import { useRouter } from "next/navigation";

import { updatePost } from "@/app/actions/posts";

type EditPostFormProps = {
    postId: string;
    initialContent: string;
    visibility: "public" | "members";
};

export default function EditPostForm({
    postId,
    initialContent,
    visibility,
}: EditPostFormProps) {
    const router = useRouter();

    const [content, setContent] =
        useState(initialContent);

    const [error, setError] =
        useState<string | null>(null);

    const [isPending, startTransition] =
        useTransition();

    function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError(null);

        startTransition(async () => {
            const result =
                await updatePost(
                    postId,
                    content,
                );

            if (!result.success) {
                setError(
                    result.error ??
                        "Unable to update post.",
                );

                return;
            }

            router.push(
                `/post/${postId}`,
            );

            router.refresh();
        });
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-5"
        >
            <div>
                <label
                    htmlFor="post-content"
                    className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                >
                    Post
                </label>

                <textarea
                    id="post-content"
                    value={content}
                    onChange={(event) =>
                        setContent(
                            event.target.value,
                        )
                    }
                    maxLength={5000}
                    rows={8}
                    disabled={isPending}
                    className="w-full resize-y rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm leading-7 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                    placeholder="Write your post..."
                />

                <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Visibility:{" "}
                        <span className="font-semibold">
                            {visibility ===
                            "members"
                                ? "Members"
                                : "Public"}
                        </span>
                    </p>

                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {content.length}/5000
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-end gap-3">
                <button
                    type="button"
                    onClick={() =>
                        router.push(
                            `/post/${postId}`,
                        )
                    }
                    disabled={isPending}
                    className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={
                        isPending ||
                        !content.trim()
                    }
                    className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isPending
                        ? "Saving..."
                        : "Save Changes"}
                </button>
            </div>
        </form>
    );
}

