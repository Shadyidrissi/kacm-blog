import { createClient } from "@/lib/supabase/server";

type BlockCheckResult = {
    blocked: boolean;
    error?: string;
};

/**
 * Checks whether either user has blocked the other.
 *
 * Returns blocked = true when:
 * - current user blocked target user
 * - target user blocked current user
 */
export async function areUsersBlocked(
    currentUserId: string,
    targetUserId: string,
): Promise<BlockCheckResult> {
    if (
        !currentUserId ||
        !targetUserId
    ) {
        return {
            blocked: false,
        };
    }

    if (
        currentUserId === targetUserId
    ) {
        return {
            blocked: false,
        };
    }

    const supabase =
        await createClient();

    const { data, error } =
        await supabase
            .from("user_blocks")
            .select(
                `
                    blocker_user_id,
                    blocked_user_id
                `,
            )
            .or(
                `and(blocker_user_id.eq.${currentUserId},blocked_user_id.eq.${targetUserId}),and(blocker_user_id.eq.${targetUserId},blocked_user_id.eq.${currentUserId})`,
            )
            .limit(1)
            .maybeSingle();

    if (error) {
        console.error(
            "Block guard error:",
            error,
        );

        return {
            blocked: false,
            error:
                "Unable to verify block status.",
        };
    }

    return {
        blocked: !!data,
    };
}


/**
 * Checks whether the current user
 * can interact with another user.
 */
export async function canInteractWithUser(
    currentUserId: string,
    targetUserId: string,
): Promise<BlockCheckResult> {
    const result =
        await areUsersBlocked(
            currentUserId,
            targetUserId,
        );

    if (result.error) {
        return result;
    }

    if (result.blocked) {
        return {
            blocked: true,
            error:
                "You cannot interact with this user.",
        };
    }

    return {
        blocked: false,
    };
}