"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { canInteractWithUser } from "@/lib/auth/block-guard";
import { revalidatePath } from "next/cache";

const createPostSchema = z.object({
    content: z
        .string()
        .trim()
        .max(5000, "Post is too long.")
        .optional()
        .default(""),
    visibility: z.enum(["public", "members"]),
    hasImage: z.boolean(),
});

export async function createPost(input: {
    content?: string;
    visibility: "public" | "members";
    hasImage: boolean,

}) {
    const validation = createPostSchema.safeParse(input);

    if (!validation.success) {
        return {
            success: false,
            error:
                validation.error.issues[0]?.message ??
                "Invalid post.",
        };
    }

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return {
            success: false,
            error: "You must be logged in.",
        };
    }

    const { data: profile, error: profileError } =
        await supabase
            .from("profiles")
            .select(
                "id, role, blocked_until, is_permanently_blocked",
            )
            .eq("id", user.id)
            .single();

    if (profileError || !profile) {
        return {
            success: false,
            error: "Unable to verify your account.",
        };
    }

    if (
        profile.role !== "fan" &&
        profile.role !== "admin"
    ) {
        return {
            success: false,
            error: "You are not allowed to create posts.",
        };
    }

    if (profile.is_permanently_blocked) {
        return {
            success: false,
            error: "Your account is permanently blocked.",
        };
    }

    if (
        profile.blocked_until &&
        new Date(profile.blocked_until) > new Date()
    ) {
        return {
            success: false,
            error: "Your account is temporarily blocked.",
        };
    }

    const content = validation.data.content.trim();

    if (!content && !validation.data.hasImage) {
        return { error: "Post must contain text or an image." };
    }

    const { data: post, error: postError } =
        await supabase
            .from("posts")
            .insert({
                user_id: user.id,
                content,
                visibility:
                    validation.data.visibility,
            })
            .select("id")
            .single();

    if (postError || !post) {
        console.error(
            "Create post error:",
            postError,
        );

        return {
            success: false,
            error: "Unable to create post.",
        };
    }

    return {
        success: true,
        postId: post.id,
    };
}


export async function updatePost(
    postId: string,
    content: string,
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return {
            success: false,
            error: "You must be logged in.",
        };
    }

    if (!postId) {
        return {
            success: false,
            error: "Invalid post.",
        };
    }

    const trimmedContent =
        content.trim();

    if (!trimmedContent) {
        return {
            success: false,
            error: "Post content cannot be empty.",
        };
    }

    if (trimmedContent.length > 5000) {
        return {
            success: false,
            error: "Post content is too long.",
        };
    }

    /*
     * SECURITY CHECK
     * Only the owner can update this post.
     */
    const {
        data: post,
        error: postError,
    } = await supabase
        .from("posts")
        .select("id, user_id")
        .eq("id", postId)
        .maybeSingle();

    if (postError) {
        console.error(
            "Update post lookup error:",
            postError,
        );

        return {
            success: false,
            error: "Unable to load post.",
        };
    }

    if (!post) {
        return {
            success: false,
            error: "Post not found.",
        };
    }

    if (post.user_id !== user.id) {
        return {
            success: false,
            error: "You can only edit your own posts.",
        };
    }

    /*
     * Update only the content.
     * Visibility, media, likes and comments
     * remain unchanged.
     */
    const {
        error: updateError,
    } = await supabase
        .from("posts")
        .update({
            content: trimmedContent,
        })
        .eq("id", postId)
        .eq("user_id", user.id);

    if (updateError) {
        console.error(
            "Update post error:",
            updateError,
        );

        return {
            success: false,
            error: "Unable to update post.",
        };
    }

    revalidatePath("/");
    revalidatePath(`/post/${postId}`);
    revalidatePath("/profile");

    return {
        success: true,
    };
}

