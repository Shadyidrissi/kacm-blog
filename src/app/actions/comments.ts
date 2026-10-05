"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { canInteractWithUser } from "@/lib/auth/block-guard";

const commentSchema = z.object({
    postId: z.string().uuid(),

    content: z
        .string()
        .trim()
        .min(
            1,
            "Comment cannot be empty.",
        )
        .max(
            2000,
            "Comment is too long.",
        ),
});

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
            "Get profile for comment error:",
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


/*
|--------------------------------------------------------------------------
| Create Comment
|--------------------------------------------------------------------------
*/

export async function createComment(
    postId: string,
    content: string,
) {
    const validation =
        commentSchema.safeParse({
            postId,
            content,
        });

    if (!validation.success) {
        return {
            error:
                validation.error.issues[0]
                    ?.message ??
                "Invalid comment.",
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
     * Get post owner.
     */
    const {
        data: post,
        error: postError,
    } = await supabase
        .from("posts")
        .select(
            `
                id,
                user_id
            `,
        )
        .eq(
            "id",
            validation.data.postId,
        )
        .maybeSingle();

    if (postError) {
        console.error(
            "Comment post lookup error:",
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
     * If either user blocked the other,
     * commenting is not allowed.
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
                "You cannot comment on this post.",
        };
    }

    /*
     * Create comment.
     */
    const { error } = await supabase
        .from("comments")
        .insert({
            post_id:
                validation.data.postId,

            user_id: user.id,

            content:
                validation.data.content,
        });

    if (error) {
        console.error(
            "Create comment error:",
            error,
        );

        return {
            error:
                "Unable to create comment.",
        };
    }

    revalidatePath("/");
    revalidatePath(
        `/post/${validation.data.postId}`,
    );

    return {
        success: true,
    };
}


/*
|--------------------------------------------------------------------------
| Delete Comment
|--------------------------------------------------------------------------
*/

export async function deleteComment(
    commentId: string,
) {
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
            "Comment lookup error:",
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

    const canDelete =
        comment.user_id === user.id ||
        profile.role === "admin";

    if (!canDelete) {
        return {
            error:
                "You cannot delete this comment.",
        };
    }

    const {
        error: deleteError,
    } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

    if (deleteError) {
        console.error(
            "Delete comment error:",
            deleteError,
        );

        return {
            error:
                "Unable to delete comment.",
        };
    }

    revalidatePath("/");
    revalidatePath(
        `/post/${comment.post_id}`,
    );

    return {
        success: true,
    };
}