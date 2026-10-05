import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getAvatarUrl(
    avatarPath: string | null,
): Promise<string | null> {
    if (!avatarPath) {
        return null;
    }

    try {
        const admin = createAdminClient();

        const { data, error } =
            await admin.storage
                .from("avatars")
                .createSignedUrl(
                    avatarPath,
                    60 * 60,
                );

        if (error) {
            console.error(
                "❌ Avatar signed URL error:",
                error,
            );

            return null;
        }

        return data?.signedUrl ?? null;
    } catch (error) {
        console.error(
            "❌ Avatar URL exception:",
            error,
        );

        return null;
    }
}

export async function getPostMediaUrl(
    mediaPath: string | null,
): Promise<string | null> {
    if (!mediaPath) {
        return null;
    }

    try {
        const admin = createAdminClient();

        const { data, error } =
            await admin.storage
                .from("post-media")
                .createSignedUrl(
                    mediaPath,
                    60 * 60,
                );

        if (error) {
            console.error(
                "❌ Post media signed URL error:",
                error,
            );

            return null;
        }

        return data?.signedUrl ?? null;
    } catch (error) {
        console.error(
            "❌ Post media URL exception:",
            error,
        );

        return null;
    }
}