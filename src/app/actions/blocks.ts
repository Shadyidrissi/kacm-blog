"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const userIdSchema = z.string().uuid();

type ProfileStatus = {
    id: string;
    role: "fan" | "admin";
    blocked_until: string | null;
    is_permanently_blocked: boolean;
};

function isAccountBlocked(
    profile: ProfileStatus,
) {
    if (profile.is_permanently_blocked) {
        return true;
    }

    if (
        profile.blocked_until &&
        new Date(profile.blocked_until).getTime() >
            Date.now()
    ) {
        return true;
    }

    return false;
}

async function getCurrentUserAndProfile() {
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
            "Get current profile for block error:",
            error,
        );

        return {
            supabase,
            user,
            profile: null,
        };
    }

    return {
        supabase,
        user,
        profile: profile as
            | ProfileStatus
            | null,
    };
}


/*
|--------------------------------------------------------------------------
| Block User
|--------------------------------------------------------------------------
*/

export async function blockUser(
    blockedUserId: string,
) {
    const validation =
        userIdSchema.safeParse(
            blockedUserId,
        );

    if (!validation.success) {
        return {
            error: "Invalid user.",
        };
    }

    const {
        supabase,
        user,
        profile,
    } =
        await getCurrentUserAndProfile();

    if (!user || !profile) {
        return {
            error: "You must be logged in.",
        };
    }

    if (
        profile.is_permanently_blocked ||
        (
            profile.blocked_until &&
            new Date(
                profile.blocked_until,
            ).getTime() > Date.now()
        )
    ) {
        return {
            error: "Your account is blocked.",
        };
    }

    if (
        validation.data === user.id
    ) {
        return {
            error: "You cannot block yourself.",
        };
    }

    /*
     * Check target user exists.
     */

    const {
        data: targetUser,
        error: targetError,
    } = await supabase
        .from("profiles")
        .select("id")
        .eq(
            "id",
            validation.data,
        )
        .maybeSingle();

    if (targetError) {
        console.error(
            "Target user lookup error:",
            targetError,
        );

        return {
            error: "Unable to find this user.",
        };
    }

    if (!targetUser) {
        return {
            error: "User not found.",
        };
    }

    /*
     * Admin accounts cannot be blocked by normal fans.
     */

    const {
        data: targetProfile,
        error: targetProfileError,
    } =
        await supabase
            .from("profiles")
            .select("role")
            .eq(
                "id",
                validation.data,
            )
            .maybeSingle();

    if (targetProfileError) {
        console.error(
            "Target profile role lookup error:",
            targetProfileError,
        );

        return {
            error: "Unable to check this user.",
        };
    }

    if (
        targetProfile?.role ===
            "admin" &&
        profile.role !== "admin"
    ) {
        return {
            error: "You cannot block an admin.",
        };
    }

    /*
     * Check existing block.
     */

    const {
        data: existingBlock,
        error: existingBlockError,
    } =
        await supabase
            .from("user_blocks")
            .select(
                "blocker_user_id",
            )
            .eq(
                "blocker_user_id",
                user.id,
            )
            .eq(
                "blocked_user_id",
                validation.data,
            )
            .maybeSingle();

    if (existingBlockError) {
        console.error(
            "Existing block lookup error:",
            existingBlockError,
        );

        return {
            error:
                "Unable to check block status.",
        };
    }

    if (existingBlock) {
        return {
            error:
                "You have already blocked this user.",
        };
    }

    /*
     * Create block.
     */

    const {
        error: insertError,
    } = await supabase
        .from("user_blocks")
        .insert({
            blocker_user_id:
                user.id,
            blocked_user_id:
                validation.data,
        });

    if (insertError) {
        console.error(
            "Create user block error:",
            insertError,
        );

        return {
            error:
                "Unable to block this user.",
        };
    }

    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/profile/[username]");

    return {
        success: true,
        blocked: true,
    };
}


/*
|--------------------------------------------------------------------------
| Unblock User
|--------------------------------------------------------------------------
*/

export async function unblockUser(
    blockedUserId: string,
) {
    const validation =
        userIdSchema.safeParse(
            blockedUserId,
        );

    if (!validation.success) {
        return {
            error: "Invalid user.",
        };
    }

    const {
        supabase,
        user,
        profile,
    } =
        await getCurrentUserAndProfile();

    if (!user || !profile) {
        return {
            error: "You must be logged in.",
        };
    }

    if (isAccountBlocked(profile)) {
        return {
            error: "Your account is blocked.",
        };
    }

    if (
        validation.data === user.id
    ) {
        return {
            error: "Invalid user.",
        };
    }

    const {
        data: existingBlock,
        error: lookupError,
    } = await supabase
        .from("user_blocks")
        .select(
            "blocker_user_id",
        )
        .eq(
            "blocker_user_id",
            user.id,
        )
        .eq(
            "blocked_user_id",
            validation.data,
        )
        .maybeSingle();

    if (lookupError) {
        console.error(
            "Unblock lookup error:",
            lookupError,
        );

        return {
            error:
                "Unable to check block status.",
        };
    }

    if (!existingBlock) {
        return {
            error:
                "This user is not blocked.",
        };
    }

    const {
        error: deleteError,
    } = await supabase
        .from("user_blocks")
        .delete()
        .eq(
            "blocker_user_id",
            user.id,
        )
        .eq(
            "blocked_user_id",
            validation.data,
        );

    if (deleteError) {
        console.error(
            "Unblock user error:",
            deleteError,
        );

        return {
            error:
                "Unable to unblock this user.",
        };
    }

    revalidatePath("/");
    revalidatePath("/profile");
    revalidatePath("/profile/[username]");

    return {
        success: true,
        blocked: false,
    };
}


/*
|--------------------------------------------------------------------------
| Check if current user blocked another user
|--------------------------------------------------------------------------
*/

export async function getBlockStatus(
    targetUserId: string,
) {
    const validation =
        userIdSchema.safeParse(
            targetUserId,
        );

    if (!validation.success) {
        return {
            error: "Invalid user.",
            blocked: false,
        };
    }

    const {
        supabase,
        user,
    } =
        await getCurrentUserAndProfile();

    if (!user) {
        return {
            blocked: false,
        };
    }

    if (
        validation.data === user.id
    ) {
        return {
            blocked: false,
        };
    }

    const {
        data,
        error,
    } = await supabase
        .from("user_blocks")
        .select(
            "blocker_user_id",
        )
        .eq(
            "blocker_user_id",
            user.id,
        )
        .eq(
            "blocked_user_id",
            validation.data,
        )
        .maybeSingle();

    if (error) {
        console.error(
            "Get block status error:",
            error,
        );

        return {
            error:
                "Unable to check block status.",
            blocked: false,
        };
    }

    return {
        blocked: !!data,
    };
}