import Link from "next/link";
import { notFound } from "next/navigation";
import PostLikesDialog from "@/components/posts/post-likes-dialog";
import { createClient } from "@/lib/supabase/server";
import {
    getAvatarUrl,
    getPostMediaUrl,
} from "@/lib/supabase/storage";

import PostLikeButton from "@/components/posts/post-like-button";
import PostActions from "@/components/posts/post-actions";
import PostDetailsLabel from "@/components/posts/post-details-label";

import CommentForm from "@/components/comments/comment-form";
import CommentsList from "@/components/comments/comments-list";

type PostPageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function PostDetailsPage({
    params,
}: PostPageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    /*
     * Get post
     */
    const {
        data: post,
        error: postError,
    } = await supabase
        .from("posts")
        .select(
            `
                id,
                user_id,
                content,
                visibility,
                created_at,
                profiles!posts_user_id_fkey (
                    full_name,
                    username,
                    avatar_url
                )
            `,
        )
        .eq("id", id)
        .maybeSingle();

    if (postError) {
        console.error(
            "Post details error:",
            postError,
        );

        notFound();
    }

    if (!post) {
        notFound();
    }

    /*
     * Members posts require authentication.
     */
    if (
        post.visibility === "members" &&
        !user
    ) {
        notFound();
    }

    /*
     * Get post media separately.
     */
    const {
        data: media,
        error: mediaError,
    } = await supabase
        .from("post_media")
        .select(
            `
                id,
                post_id,
                media_url,
                media_type
            `,
        )
        .eq("post_id", post.id)
        .maybeSingle();

    if (mediaError) {
        console.error(
            "Post media details error:",
            mediaError,
        );
    }

    /*
     * Generate signed media URL.
     */
    const mediaUrl = await getPostMediaUrl(
        media?.media_url ?? null,
    );

    /*
     * Normalize post profile.
     */
    const profile = Array.isArray(
        post.profiles,
    )
        ? post.profiles[0]
        : post.profiles;

    /*
     * Generate signed avatar URL
     * for the post author.
     */
    const profileAvatarUrl =
        await getAvatarUrl(
            profile?.avatar_url ?? null,
        );

    /*
     * Get post likes count.
     */
    const {
        count: likesCount,
        error: likesCountError,
    } = await supabase
        .from("post_likes")
        .select("*", {
            count: "exact",
            head: true,
        })
        .eq("post_id", post.id);

    if (likesCountError) {
        console.error(
            "Post likes count error:",
            likesCountError,
        );
    }

    /*
     * Check whether current user liked the post.
     */
    let userLiked = false;

    if (user) {
        const {
            data: userLike,
            error: userLikeError,
        } = await supabase
            .from("post_likes")
            .select("post_id")
            .eq("post_id", post.id)
            .eq("user_id", user.id)
            .maybeSingle();

        if (userLikeError) {
            console.error(
                "User post like lookup error:",
                userLikeError,
            );
        }

        userLiked = !!userLike;
    }

    /*
     * Get comments.
     */
    const {
        data: commentRows,
        error: commentsError,
    } = await supabase
        .from("comments")
        .select(
            `
                id,
                post_id,
                user_id,
                content,
                created_at,
                profiles!comments_user_id_fkey (
                    full_name,
                    username,
                    avatar_url
                )
            `,
        )
        .eq("post_id", post.id)
        .order("created_at", {
            ascending: true,
        });

    if (commentsError) {
        console.error(
            "Comments error:",
            commentsError,
        );
    }

    /*
     * Get comment IDs.
     */
    const commentIds =
        (commentRows ?? []).map(
            (comment) => comment.id,
        );

    /*
     * Get comment likes separately.
     */
    let commentLikeRows: {
        comment_id: string;
        user_id: string;
    }[] = [];

    if (commentIds.length > 0) {
        const {
            data: commentLikes,
            error: commentLikesError,
        } = await supabase
            .from("comment_likes")
            .select(
                `
                    comment_id,
                    user_id
                `,
            )
            .in(
                "comment_id",
                commentIds,
            );

        if (commentLikesError) {
            console.error(
                "Comment likes error:",
                commentLikesError,
            );
        }

        commentLikeRows =
            commentLikes ?? [];
    }

    /*
     * Prepare comments with:
     * - profile
     * - signed avatar URL
     * - likes count
     * - current user's like state
     */
    const comments = await Promise.all(
        (commentRows ?? []).map(
            async (comment) => {
                const commentProfile =
                    Array.isArray(
                        comment.profiles,
                    )
                        ? comment
                            .profiles[0] ??
                        null
                        : comment.profiles;

                const commentAvatarUrl =
                    await getAvatarUrl(
                        commentProfile
                            ?.avatar_url ??
                        null,
                    );

                const likes =
                    commentLikeRows.filter(
                        (like) =>
                            like.comment_id ===
                            comment.id,
                    );

                return {
                    ...comment,

                    profile:
                        commentProfile
                            ? {
                                ...commentProfile,
                                avatar_url:
                                    commentAvatarUrl,
                            }
                            : null,

                    likesCount:
                        likes.length,

                    userLiked: user
                        ? likes.some(
                            (like) =>
                                like.user_id ===
                                user.id,
                        )
                        : false,
                };
            },
        ),
    );

    /*
     * Check whether current user is admin.
     */
    let isAdmin = false;

    if (user) {
        const {
            data: currentProfile,
            error: currentProfileError,
        } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (currentProfileError) {
            console.error(
                "Current profile error:",
                currentProfileError,
            );
        }

        isAdmin =
            currentProfile?.role ===
            "admin";
    }

    const postAuthorUsername =
        profile?.username ?? null;

    const postAuthorProfileUrl =
        postAuthorUsername
            ? `/profile/${encodeURIComponent(
                postAuthorUsername,
            )}`
            : null;

    const postAuthorName =
        profile?.full_name ?? null;

    const postAuthorAvatarLetter =
        (
            postAuthorName ??
            "KACM"
        )
            .charAt(0)
            .toUpperCase();

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-6 transition-colors sm:px-6">
            <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-900 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 p-5">
                    <div className="flex min-w-0 items-center gap-3">
                        {/* Avatar */}
                        {postAuthorProfileUrl ? (
                            <Link
                                href={
                                    postAuthorProfileUrl
                                }
                                className="shrink-0"
                                aria-label="View profile"
                            >
                                {profileAvatarUrl ? (
                                    <img
                                        src={
                                            profileAvatarUrl
                                        }
                                        alt={
                                            postAuthorName ??
                                            "KACM"
                                        }
                                        className="h-11 w-11 rounded-full object-cover transition hover:opacity-80"
                                    />
                                ) : (
                                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-700 transition hover:opacity-80 dark:bg-zinc-700 dark:text-white">
                                        {
                                            postAuthorAvatarLetter
                                        }
                                    </div>
                                )}
                            </Link>
                        ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-700 dark:bg-zinc-700 dark:text-white">
                                {
                                    postAuthorAvatarLetter
                                }
                            </div>
                        )}

                        {/* Name + Username */}
                        <div className="min-w-0">
                            {postAuthorProfileUrl ? (
                                <Link
                                    href={
                                        postAuthorProfileUrl
                                    }
                                    className="block w-fit max-w-full"
                                >
                                    <p className="truncate font-semibold text-zinc-900 transition hover:underline dark:text-white">
                                        {
                                            postAuthorName
                                        }
                                    </p>
                                </Link>
                            ) : (
                                <p className="font-semibold text-zinc-900 dark:text-white">
                                    <PostDetailsLabel
                                        type="author"
                                    />
                                </p>
                            )}

                            {postAuthorProfileUrl ? (
                                <Link
                                    href={
                                        postAuthorProfileUrl
                                    }
                                    className="block w-fit"
                                >
                                    <p className="text-sm text-zinc-500 transition hover:text-zinc-700 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200">
                                        @
                                        {
                                            postAuthorUsername
                                        }
                                    </p>
                                </Link>
                            ) : (
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                    @
                                    <PostDetailsLabel
                                        type="unknown"
                                    />
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            <PostDetailsLabel
                                type="visibility"
                                visibility={
                                    post.visibility ===
                                        "members"
                                        ? "members"
                                        : "public"
                                }
                            />
                        </span>

                        {user && (
                            <PostActions
                                postId={post.id}
                                canManage={
                                    post.user_id === user.id
                                }
                            />
                        )}
                    </div>
                </div>

                {/* Text */}
                {post.content && (
                    <div className="px-5 pb-5">
                        <p className="whitespace-pre-wrap leading-7 text-zinc-800 dark:text-zinc-100">
                            {post.content}
                        </p>
                    </div>
                )}

                {/* Image */}
                {mediaUrl &&
                    media?.media_type ===
                    "image" && (
                        <div className="w-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
                            <img
                                src={mediaUrl}
                                alt={
                                    postAuthorName
                                        ? `Post by ${postAuthorName}`
                                        : "KACM post"
                                }
                                className="block max-h-[800px] w-full object-contain"
                            />
                        </div>
                    )}

                {/* Post Like */}
                <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
                    <PostLikeButton
                        postId={post.id}
                        initialLiked={userLiked}
                        initialLikesCount={
                            likesCount ?? 0
                        }
                        isLoggedIn={!!user}
                    />

                    <PostLikesDialog
                        postId={post.id}
                        likesCount={likesCount ?? 0}
                    />
                </div>

                {/* Comments */}
                <div className="border-t border-zinc-200 px-5 py-5 dark:border-zinc-800">
                    <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-white">
                        <PostDetailsLabel
                            type="comments"
                        />
                    </h2>

                    {user ? (
                        <div className="mb-6">
                            <CommentForm
                                postId={
                                    post.id
                                }
                            />
                        </div>
                    ) : (
                        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
                            <PostDetailsLabel
                                type="loginToComment"
                            />
                        </p>
                    )}

                    <CommentsList
                        comments={comments}
                        currentUserId={
                            user?.id ?? null
                        }
                        isAdmin={isAdmin}
                    />
                </div>
            </article>
        </main>
    );
}