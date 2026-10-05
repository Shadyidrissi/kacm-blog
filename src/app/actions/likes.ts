"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { canInteractWithUser } from "@/lib/auth/block-guard";

type LikeResult = {
    error?: string;
    liked?: boolean;
    likesCount?: number;
};

async function getCurrentProfile() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return {
            supabase,
            user: null,
            profile: null,
        };
    }

    const {
        data: profile,
        error,
    } = await supabase
        .from("profiles")
        .select(
            `
                id,
                role,
                blocked_until,
                is_permanently_blocked
            `,
        )
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error(
            "Get profile for like error:",
            error,
        );
    }

    return {
        supabase,
        user,
        profile,
    };
}

function isBlocked(profile: {
    blocked_until: string | null;
    is_permanently_blocked: boolean;
}) {
    if (profile.is_permanently_blocked) {
        return true;
    }

    if (
        profile.blocked_until &&
        new Date(
            profile.blocked_until,
        ).getTime() > Date.now()
    ) {
        return true;
    }

    return false;
}

export async function togglePostLike(
    postId: string,
): Promise<LikeResult> {
    if (!postId) {
        return {
            error: "Invalid post.",
        };
    }

    const {
        supabase,
        user,
        profile,
    } = await getCurrentProfile();

    if (!user || !profile) {
        return {
            error: "You must be logged in.",
        };
    }

    if (isBlocked(profile)) {
        return {
            error: "Your account is blocked.",
        };
    }

    /*
     * Verify that the post exists
     * and get its owner.
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
                visibility
            `,
        )
        .eq("id", postId)
        .maybeSingle();

    if (postError) {
        console.error(
            "Post lookup for like error:",
            postError,
        );

        return {
            error: "Unable to find post.",
        };
    }

    if (!post) {
        return {
            error: "Post not found.",
        };
    }

    /*
     * Block check.
     *
     * Prevent interaction when either user
     * has blocked the other.
     */
    const blockCheck =
        await canInteractWithUser(
            user.id,
            post.user_id,
        );

    if (blockCheck.error) {
        return {
            error: blockCheck.error,
        };
    }

    if (blockCheck.blocked) {
        return {
            error:
                "You cannot like this post.",
        };
    }

    /*
     * Check whether the current user
     * already liked it.
     */
    const {
        data: existingLike,
        error: existingError,
    } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingError) {
        console.error(
            "Existing like lookup error:",
            existingError,
        );

        return {
            error: "Unable to check like.",
        };
    }

    /*
     * Unlike
     */
    if (existingLike) {
        const {
            error: deleteError,
        } = await supabase
            .from("post_likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", user.id);

        if (deleteError) {
            console.error(
                "Unlike error:",
                deleteError,
            );

            return {
                error:
                    "Unable to unlike post.",
            };
        }
    } else {
        /*
         * Like
         */
        const {
            error: insertError,
        } = await supabase
            .from("post_likes")
            .insert({
                post_id: postId,
                user_id: user.id,
            });

        if (insertError) {
            console.error(
                "Like error:",
                insertError,
            );

            return {
                error: "Unable to like post.",
            };
        }
    }

    /*
     * Get the new count.
     */
    const {
        count,
        error: countError,
    } = await supabase
        .from("post_likes")
        .select("*", {
            count: "exact",
            head: true,
        })
        .eq("post_id", postId);

    if (countError) {
        console.error(
            "Like count error:",
            countError,
        );
    }

    revalidatePath("/");
    revalidatePath(`/post/${postId}`);

    return {
        liked: !existingLike,
        likesCount: count ?? 0,
    };
}