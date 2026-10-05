"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { canInteractWithUser } from "@/lib/auth/block-guard";

type CommentLikeResult = {
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
            "Get profile for comment like error:",
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

export async function toggleCommentLike(
    commentId: string,
): Promise<CommentLikeResult> {
    if (!commentId) {
        return {
            error: "Invalid comment.",
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
     * Make sure the comment exists
     * and get its owner.
     */
    const {
        data: comment,
        error: commentError,
    } = await supabase
        .from("comments")
        .select(
            `
                id,
                post_id,
                user_id
            `,
        )
        .eq("id", commentId)
        .maybeSingle();

    if (commentError) {
        console.error(
            "Comment lookup for like error:",
            commentError,
        );

        return {
            error: "Unable to find comment.",
        };
    }

    if (!comment) {
        return {
            error: "Comment not found.",
        };
    }

    /*
     * Block check.
     *
     * Prevent liking the comment when
     * either user has blocked the other.
     */
    const blockCheck =
        await canInteractWithUser(
            user.id,
            comment.user_id,
        );

    if (blockCheck.error) {
        return {
            error: blockCheck.error,
        };
    }

    if (blockCheck.blocked) {
        return {
            error:
                "You cannot like this comment.",
        };
    }

    /*
     * Check whether the user already
     * liked the comment.
     */
    const {
        data: existingLike,
        error: existingError,
    } = await supabase
        .from("comment_likes")
        .select("comment_id")
        .eq(
            "comment_id",
            commentId,
        )
        .eq(
            "user_id",
            user.id,
        )
        .maybeSingle();

    if (existingError) {
        console.error(
            "Existing comment like lookup error:",
            existingError,
        );

        return {
            error:
                "Unable to check comment like.",
        };
    }

    /*
     * Unlike.
     */
    if (existingLike) {
        const {
            error: deleteError,
        } = await supabase
            .from("comment_likes")
            .delete()
            .eq(
                "comment_id",
                commentId,
            )
            .eq(
                "user_id",
                user.id,
            );

        if (deleteError) {
            console.error(
                "Unlike comment error:",
                deleteError,
            );

            return {
                error:
                    "Unable to unlike comment.",
            };
        }
    } else {
        /*
         * Like.
         */
        const {
            error: insertError,
        } = await supabase
            .from("comment_likes")
            .insert({
                comment_id:
                    commentId,

                user_id:
                    user.id,
            });

        if (insertError) {
            console.error(
                "Like comment error:",
                insertError,
            );

            return {
                error:
                    "Unable to like comment.",
            };
        }
    }

    /*
     * Get the new total.
     */
    const {
        count,
        error: countError,
    } = await supabase
        .from("comment_likes")
        .select("*", {
            count: "exact",
            head: true,
        })
        .eq(
            "comment_id",
            commentId,
        );

    if (countError) {
        console.error(
            "Comment like count error:",
            countError,
        );
    }

    /*
     * Refresh the post page.
     */
    revalidatePath("/");
    revalidatePath(
        `/post/${comment.post_id}`,
    );

    return {
        liked: !existingLike,
        likesCount: count ?? 0,
    };
}