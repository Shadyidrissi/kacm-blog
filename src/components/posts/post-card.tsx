"use client";

import Link from "next/link";
import PostLikesDialog from "@/components/posts/post-likes-dialog";
import PostLikeButton from "@/components/posts/post-like-button";
import PostActions from "@/components/posts/post-actions";
import { useLanguage } from "@/components/providers/language-provider";

type PostCardProps = {
    post: {
        id: string;
        user_id: string;
        content: string | null;
        visibility: "public" | "members";
        created_at: string;

        profiles:
        | {
            full_name: string;
            username: string;
            avatar_url: string | null;
        }
        | null;

        mediaUrl: string | null;
        mediaType: string | null;

        likesCount: number;
        userLiked: boolean;
    };

    isLoggedIn: boolean;
    currentUserId?: string | null;
};

export default function PostCard({
    post,
    isLoggedIn,
    currentUserId,
}: PostCardProps) {
    const { locale } = useLanguage();

    const isArabic =
        locale === "ar";

    const username =
        post.profiles?.username ??
        "unknown";

    const profileUrl =
        post.profiles?.username
            ? `/profile/${encodeURIComponent(
                post.profiles.username,
            )}`
            : null;

    const fullName =
        post.profiles?.full_name ??
        "KACM Fan";

    return (
        <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 ">
            {/* Post Header */}
            <div className="flex items-center justify-between gap-3 p-5">
                <div className="flex min-w-0 items-center gap-3">
                    {profileUrl ? (
                        <Link
                            href={profileUrl}
                            className="shrink-0"
                            aria-label={
                                isArabic
                                    ? `عرض الملف الشخصي لـ ${username}`
                                    : `View ${username}'s profile`
                            }
                        >
                            {post.profiles
                                ?.avatar_url ? (
                                <img
                                    src={
                                        post
                                            .profiles
                                            .avatar_url
                                    }
                                    alt={
                                        fullName
                                    }
                                    className="h-11 w-11 rounded-full object-cover transition hover:opacity-80"
                                />
                            ) : (
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
                                    {fullName
                                        .charAt(
                                            0,
                                        )
                                        .toUpperCase()}
                                </div>
                            )}
                        </Link>
                    ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-white">
                            K
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
                                <p className="text-sm text-zinc-500 transition hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200">
                                    @{username}
                                </p>
                            </Link>
                        ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                @{username}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {post.visibility ===
                            "members"
                            ? isArabic
                                ? "للأعضاء"
                                : "Members"
                            : isArabic
                                ? "عام"
                                : "Public"}
                    </span>

                    {isLoggedIn && (
                        <PostActions
                            postId={post.id}
                            canManage={
                                post.user_id === currentUserId
                            }
                        />
                    )}
                </div>
            </div>

            {/* Post Text */}
            {post.content && (
                <div className="px-5 pb-4 min-h-20">
                    <p className="whitespace-pre-wrap leading-7 text-zinc-800 dark:text-zinc-100">
                        {
                            post.content
                        }
                    </p>
                </div>
            )}

            {/* Post Image */}
            {post.mediaUrl &&
                post.mediaType ===
                "image" && (
                    <div className="w-full overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                        <img
                            src={
                                post.mediaUrl
                            }
                            alt={
                                isArabic
                                    ? `منشور بواسطة ${fullName}`
                                    : `Post by ${fullName}`
                            }
                            className="block max-h-[700px] w-full object-contain"
                        />
                    </div>
                )}

            {/* Post Footer */}
            <div className="border-t border-zinc-200 px-5 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <PostLikeButton
                        postId={post.id}
                        initialLiked={post.userLiked}
                        initialLikesCount={post.likesCount}
                        isLoggedIn={isLoggedIn}
                    />

                    <PostLikesDialog
                        postId={post.id}
                        likesCount={post.likesCount}
                    />

                    <Link
                        href={`/post/${post.id}`}
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                        <span className="text-base">
                            ♡
                        </span>

                        <span>
                            {isArabic
                                ? "تعليق"
                                : "Comment"}
                        </span>
                    </Link>
                </div>
            </div>
        </article>
    );
}