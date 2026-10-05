import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
    try {
        const supabase = await createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { avatarUrl: null },
                { status: 401 },
            );
        }

        const { data: profile, error } =
            await supabase
                .from("profiles")
                .select("avatar_url")
                .eq("id", user.id)
                .maybeSingle();

        if (error) {
            console.error(
                "Avatar profile error:",
                error,
            );

            return NextResponse.json(
                { avatarUrl: null },
                { status: 500 },
            );
        }

        if (!profile?.avatar_url) {
            return NextResponse.json({
                avatarUrl: null,
            });
        }

        const admin = createAdminClient();

        const { data, error: signedUrlError } =
            await admin.storage
                .from("avatars")
                .createSignedUrl(
                    profile.avatar_url,
                    60 * 60,
                );

        if (signedUrlError) {
            console.error(
                "Avatar signed URL error:",
                signedUrlError,
            );

            return NextResponse.json({
                avatarUrl: null,
            });
        }

        return NextResponse.json({
            avatarUrl: data?.signedUrl ?? null,
        });
    } catch (error) {
        console.error(
            "Avatar route error:",
            error,
        );

        return NextResponse.json(
            { avatarUrl: null },
            { status: 500 },
        );
    }
}