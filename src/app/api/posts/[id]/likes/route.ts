import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getAvatarUrl } from "@/lib/supabase/storage";

type RouteContext = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(
    _request: Request,
    { params }: RouteContext,
) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: likes,
        error,
    } = await supabase
        .from("post_likes")
        .select(
            `
                user_id,
                profiles!post_likes_user_id_fkey (
                    full_name,
                    username,
                    avatar_url
                )
            `,
        )
        .eq("post_id", id)
        .order("created_at", {
            ascending: false,
        });

    if (error) {
        console.error(
            "Post likes API error:",
            error,
        );

        return NextResponse.json(
            {
                error: "Unable to load likes",
            },
            {
                status: 500,
            },
        );
    }

    const users = await Promise.all(
        (likes ?? []).map(
            async (like) => {
                const profile =
                    Array.isArray(
                        like.profiles,
                    )
                        ? like.profiles[0]
                        : like.profiles;

                if (!profile) {
                    return {
                        user_id:
                            like.user_id,
                        profile: null,
                    };
                }

                const avatarUrl =
                    await getAvatarUrl(
                        profile.avatar_url,
                    );

                return {
                    user_id:
                        like.user_id,
                    profile: {
                        full_name:
                            profile.full_name,
                        username:
                            profile.username,
                        avatar_url:
                            avatarUrl,
                    },
                };
            },
        ),
    );

    return NextResponse.json({
        users,
    });
}