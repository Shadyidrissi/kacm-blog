"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteComment } from "@/app/actions/comments";
import CommentLikeButton from "@/components/comments/comment-like-button";
import { useLanguage } from "@/components/providers/language-provider";

type Comment = {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;

    profile:
        | {
              full_name: string;
              username: string;
              avatar_url: string | null;
          }
        | null;

    likesCount: number;
    userLiked: boolean;
};

type CommentsListProps = {
    comments: Comment[];
    currentUserId: string | null;
    isAdmin: boolean;
};

function formatCommentDate(
    dateString: string,
    locale: "en" | "ar",
) {
    const date =
        new Date(dateString);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return "";
    }

    return new Intl.DateTimeFormat(
        locale === "ar"
            ? "ar-MA"
            : "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "UTC",
        },
    ).format(date);
}

export default function CommentsList({
    comments,
    currentUserId,
    isAdmin,
}: CommentsListProps) {
    const router =
        useRouter();

    const { locale } =
        useLanguage();

    const isArabic =
        locale === "ar";

    const [
        isPending,
        startTransition,
    ] = useTransition();

    function handleDelete(
        commentId: string,
    ) {
        const confirmed =
            window.confirm(
                isArabic
                    ? "هل تريد حذف هذا التعليق؟"
                    : "Delete this comment?",
            );

        if (!confirmed) {
            return;
        }

        startTransition(
            async () => {
                const result =
                    await deleteComment(
                        commentId,
                    );

                if (result.error) {
                    window.alert(
                        result.error,
                    );

                    return;
                }

                router.refresh();
            },
        );
    }

    if (!comments.length) {
        return (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {isArabic
                    ? "لا توجد تعليقات بعد."
                    : "No comments yet."}
            </p>
        );
    }

    return (
        <div className="space-y-4">
            {comments.map(
                (comment) => {
                    const canDelete =
                        comment.user_id ===
                            currentUserId ||
                        isAdmin;

                    const username =
                        comment.profile
                            ?.username;

                    const profileUrl =
                        username
                            ? `/profile/${encodeURIComponent(
                                  username,
                              )}`
                            : null;

                    const avatarUrl =
                        comment.profile
                            ?.avatar_url;

                    const fullName =
                        comment.profile
                            ?.full_name ??
                        "KACM Fan";

                    const avatarLetter =
                        fullName
                            .charAt(
                                0,
                            )
                            .toUpperCase();

                    return (
                        <article
                            key={
                                comment.id
                            }
                            className="rounded-xl border border-zinc-200 bg-white p-4 transition-colors dark:border-zinc-800 dark:bg-zinc-900"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    {profileUrl ? (
                                        <Link
                                            href={
                                                profileUrl
                                            }
                                            className="shrink-0"
                                            aria-label={
                                                isArabic
                                                    ? `عرض الملف الشخصي لـ ${fullName}`
                                                    : `View ${fullName}'s profile`
                                            }
                                        >
                                            {avatarUrl ? (
                                                <img
                                                    src={
                                                        avatarUrl
                                                    }
                                                    alt={
                                                        fullName
                                                    }
                                                    className="h-10 w-10 rounded-full object-cover transition hover:opacity-80"
                                                />
                                            ) : (
                                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
                                                    {
                                                        avatarLetter
                                                    }
                                                </div>
                                            )}
                                        </Link>
                                    ) : (
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
                                            {
                                                avatarLetter
                                            }
                                        </div>
                                    )}

                                    <div className="min-w-0">
                                        {profileUrl ? (
                                            <Link
                                                href={
                                                    profileUrl
                                                }
                                                className="block w-fit max-w-full"
                                            >
                                                <p className="truncate font-semibold text-zinc-900 transition hover:underline dark:text-white">
                                                    {
                                                        fullName
                                                    }
                                                </p>
                                            </Link>
                                        ) : (
                                            <p className="font-semibold text-zinc-900 dark:text-white">
                                                {
                                                    fullName
                                                }
                                            </p>
                                        )}

                                        {profileUrl ? (
                                            <Link
                                                href={
                                                    profileUrl
                                                }
                                                className="block w-fit"
                                            >
                                                <p className="text-xs text-zinc-500 transition hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200">
                                                    @
                                                    {
                                                        username
                                                    }
                                                </p>
                                            </Link>
                                        ) : (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                                @unknown
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {canDelete && (
                                    <button
                                        type="button"
                                        disabled={
                                            isPending
                                        }
                                        onClick={() =>
                                            handleDelete(
                                                comment.id,
                                            )
                                        }
                                        className="shrink-0 text-xs font-medium text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                                    >
                                        {isPending
                                            ? isArabic
                                                ? "جاري الحذف..."
                                                : "Deleting..."
                                            : isArabic
                                              ? "حذف"
                                              : "Delete"}
                                    </button>
                                )}
                            </div>

                            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-800 dark:text-zinc-100">
                                {
                                    comment.content
                                }
                            </p>

                            <div className="mt-3 flex items-center justify-between gap-3">
                                <CommentLikeButton
                                    commentId={
                                        comment.id
                                    }
                                    initialLiked={
                                        comment.userLiked
                                    }
                                    initialLikesCount={
                                        comment.likesCount
                                    }
                                    isLoggedIn={
                                        !!currentUserId
                                    }
                                />

                                <p className="text-xs text-zinc-400 dark:text-zinc-500">
                                    {formatCommentDate(
                                        comment.created_at,
                                        locale,
                                    )}
                                </p>
                            </div>
                        </article>
                    );
                },
            )}
        </div>
    );
}