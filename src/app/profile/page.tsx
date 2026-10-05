import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
    getAvatarUrl,
    getPostMediaUrl,
} from "@/lib/supabase/storage";

import LogoutButton from "@/components/auth/logout-button";
import ProfilePageContent from "@/components/profile/profile-page-content";
import PostCard from "@/components/posts/post-card";

export default async function ProfilePage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    /*
     * Get current user's profile
     */
    const {
        data: profile,
        error,
    } = await supabase
        .from("profiles")
        .select(
            "full_name, username, bio, avatar_url, role",
        )
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        return (
            <main className="mx-auto max-w-2xl p-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                    <h1 className="text-2xl font-bold">
                        <ProfilePageContent
                            type="profile"
                        />
                    </h1>

                    <p className="mt-4 text-red-600 dark:text-red-400">
                        <ProfilePageContent
                            type="unableToLoad"
                        />
                    </p>
                </div>
            </main>
        );
    }

    /*
     * Signed avatar URL
     */
    const avatarUrl = await getAvatarUrl(
        profile.avatar_url,
    );

    /*
     * Get user's posts
     */
    const {
        data: postRows,
        error: postsError,
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
        .eq("user_id", user.id)
        .order("created_at", {
            ascending: false,
        });

    if (postsError) {
        console.error(
            "Profile posts error:",
            postsError,
        );
    }

    /*
     * Prepare posts for PostCard
     */
    const posts = await Promise.all(
        (postRows ?? []).map(
            async (post) => {
                /*
                 * Normalize author profile
                 */
                const postProfile =
                    Array.isArray(
                        post.profiles,
                    )
                        ? post.profiles[0] ??
                          null
                        : post.profiles;

                /*
                 * Get signed author avatar
                 */
                const postAvatarUrl =
                    await getAvatarUrl(
                        postProfile?.avatar_url ??
                            null,
                    );

                /*
                 * Get post media
                 */
                const {
                    data: media,
                    error: mediaError,
                } = await supabase
                    .from("post_media")
                    .select(
                        `
                            media_url,
                            media_type
                        `,
                    )
                    .eq(
                        "post_id",
                        post.id,
                    )
                    .maybeSingle();

                if (mediaError) {
                    console.error(
                        "Profile post media error:",
                        mediaError,
                    );
                }

                /*
                 * Generate signed media URL
                 */
                const mediaUrl =
                    await getPostMediaUrl(
                        media?.media_url ??
                            null,
                    );

                /*
                 * Get likes
                 */
                const {
                    data: likes,
                    error: likesError,
                } = await supabase
                    .from("post_likes")
                    .select(
                        "user_id",
                    )
                    .eq(
                        "post_id",
                        post.id,
                    );

                if (likesError) {
                    console.error(
                        "Profile post likes error:",
                        likesError,
                    );
                }

                const postLikes =
                    likes ?? [];

                const userLiked =
                    postLikes.some(
                        (like) =>
                            like.user_id ===
                            user.id,
                    );

                return {
                    id: post.id,
                    user_id: post.user_id,
                    content: post.content,
                    visibility:
                        post.visibility,
                    created_at:
                        post.created_at,

                    profiles:
                        postProfile
                            ? {
                                  full_name:
                                      postProfile.full_name,
                                  username:
                                      postProfile.username,
                                  avatar_url:
                                      postAvatarUrl,
                              }
                            : null,

                    mediaUrl,
                    mediaType:
                        media?.media_type ??
                        null,

                    likesCount:
                        postLikes.length,

                    userLiked,
                };
            },
        ),
    );

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {/* Profile */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={`${profile.full_name} avatar`}
                                className="h-24 w-24 shrink-0 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-2xl font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                {profile.full_name
                                    .charAt(
                                        0,
                                    )
                                    .toUpperCase()}
                            </div>
                        )}

                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-bold">
                                {
                                    profile.full_name
                                }
                            </h1>

                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                @
                                {
                                    profile.username
                                }
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/profile/edit"
                        className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        <ProfilePageContent
                            type="editProfile"
                        />
                    </Link>
                </div>

                <div className="mt-6 space-y-4">
                    <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            <ProfilePageContent
                                type="email"
                            />
                        </p>

                        <p className="text-zinc-600 dark:text-zinc-400">
                            {user.email}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            <ProfilePageContent
                                type="role"
                            />
                        </p>

                        <p className="text-zinc-600 dark:text-zinc-400">
                            {profile.role}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            <ProfilePageContent
                                type="bio"
                            />
                        </p>

                        <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                            {profile.bio || (
                                <ProfilePageContent
                                    type="noBio"
                                />
                            )}
                        </p>
                    </div>
                </div>
            </section>

            {/* Posts */}
            <section className="mt-8">
                <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-white">
                    Posts
                </h2>

                {posts.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                        No posts yet.
                    </div>
                ) : (
                    <div className="space-y-5">
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                isLoggedIn={true}
                                currentUserId={
                                    user.id
                                }
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Logout */}
            <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                <LogoutButton />
            </div>
        </main>
    );
}