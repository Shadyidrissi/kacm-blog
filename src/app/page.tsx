import { createClient } from "@/lib/supabase/server";
import {
    getAvatarUrl,
    getPostMediaUrl,
} from "@/lib/supabase/storage";

import CreatePost from "@/components/posts/create-post";
import PostCard from "@/components/posts/post-card";
import FeedHeader from "@/components/posts/feed-header";

export default async function HomePage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const {
        data: posts,
        error: postsError,
    } = await supabase
        .from("posts")
        .select(
            `
                id,
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
        .order("created_at", {
            ascending: false,
        });

    if (postsError) {
        console.error(
            "❌ Posts error:",
            postsError,
        );
    }

    const postIds =
        (posts ?? []).map(
            (post) => post.id,
        );

    let mediaRows: {
        id: string;
        post_id: string;
        media_url: string;
        media_type: string;
    }[] = [];

    if (postIds.length > 0) {
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
            .in(
                "post_id",
                postIds,
            );

        if (mediaError) {
            console.error(
                "❌ Post media query error:",
                mediaError,
            );
        }

        mediaRows = media ?? [];
    }

    let likeRows: {
        post_id: string;
        user_id: string;
    }[] = [];

    if (postIds.length > 0) {
        const {
            data: likes,
            error: likesError,
        } = await supabase
            .from("post_likes")
            .select(
                `
                    post_id,
                    user_id
                `,
            )
            .in(
                "post_id",
                postIds,
            );

        if (likesError) {
            console.error(
                "❌ Post likes query error:",
                likesError,
            );
        }

        likeRows = likes ?? [];
    }

    const postsWithMedia =
        await Promise.all(
            (posts ?? []).map(
                async (post) => {
                    const profile =
                        Array.isArray(
                            post.profiles,
                        )
                            ? post.profiles[0]
                            : post.profiles;

                    const avatarUrl =
                        await getAvatarUrl(
                            profile?.avatar_url ??
                                null,
                        );

                    const media =
                        mediaRows.find(
                            (item) =>
                                item.post_id ===
                                post.id,
                        ) ?? null;

                    const mediaUrl =
                        await getPostMediaUrl(
                            media?.media_url ??
                                null,
                        );

                    const postLikes =
                        likeRows.filter(
                            (like) =>
                                like.post_id ===
                                post.id,
                        );

                    const likesCount =
                        postLikes.length;

                    const userLiked = user
                        ? postLikes.some(
                              (like) =>
                                  like.user_id ===
                                  user.id,
                          )
                        : false;

                    return {
                        ...post,

                        profiles:
                            profile
                                ? {
                                      ...profile,
                                      avatar_url:
                                          avatarUrl,
                                  }
                                : null,

                        mediaUrl,

                        mediaType:
                            media?.media_type ??
                            null,

                        likesCount,

                        userLiked,
                    };
                },
            ),
        );

    return (
        <main className="min-h-screen bg-white text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100">
            <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
                <div className="space-y-6">
                    {user && <CreatePost />}

                    <section>
                        <FeedHeader />

                        {!postsWithMedia.length ? (
                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-center text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                                <FeedEmptyState />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {postsWithMedia.map(
                                    (post) => (
                                        <PostCard
                                            key={
                                                post.id
                                            }
                                            post={
                                                post
                                            }
                                            isLoggedIn={
                                                !!user
                                            }
                                        />
                                    ),
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}