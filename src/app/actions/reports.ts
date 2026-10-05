"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const reportSchema = z.object({
    targetType: z.enum([
        "post",
        "comment",
        "profile",
        "story",
    ]),

    targetId: z.string().uuid(),

    reportType: z.enum([
        "spam",
        "harassment",
        "hate_speech",
        "scam",
        "inappropriate",
        "false_information",
        "other",
    ]),

    details: z
        .string()
        .trim()
        .max(
            2000,
            "Report details are too long.",
        )
        .optional()
        .default(""),
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
            "Get profile for report error:",
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

export async function createReport(
    targetType:
        | "post"
        | "comment"
        | "profile"
        | "story",
    targetId: string,
    reportType:
        | "spam"
        | "harassment"
        | "hate_speech"
        | "scam"
        | "inappropriate"
        | "false_information"
        | "other",
    details: string,
) {
    const validation =
        reportSchema.safeParse({
            targetType,
            targetId,
            reportType,
            details,
        });

    if (!validation.success) {
        return {
            error:
                validation.error.issues[0]
                    ?.message ??
                "Invalid report.",
        };
    }

    const {
        supabase,
        user,
        profile,
    } = await getCurrentProfile();

    if (!user || !profile) {
        return {
            error:
                "You must be logged in to report.",
        };
    }

    if (isBlocked(profile)) {
        return {
            error: "Your account is blocked.",
        };
    }

    /*
     * Users cannot report themselves.
     */
    if (
        validation.data.targetType ===
        "profile" &&
        validation.data.targetId ===
            user.id
    ) {
        return {
            error:
                "You cannot report yourself.",
        };
    }

    /*
     * Verify the target exists.
     */
    let targetExists = false;

    if (
        validation.data.targetType ===
        "post"
    ) {
        const { data } =
            await supabase
                .from("posts")
                .select("id")
                .eq(
                    "id",
                    validation.data
                        .targetId,
                )
                .maybeSingle();

        targetExists = !!data;
    }

    if (
        validation.data.targetType ===
        "comment"
    ) {
        const { data } =
            await supabase
                .from("comments")
                .select("id")
                .eq(
                    "id",
                    validation.data
                        .targetId,
                )
                .maybeSingle();

        targetExists = !!data;
    }

    if (
        validation.data.targetType ===
        "profile"
    ) {
        const { data } =
            await supabase
                .from("profiles")
                .select("id")
                .eq(
                    "id",
                    validation.data
                        .targetId,
                )
                .maybeSingle();

        targetExists = !!data;
    }

    if (
        validation.data.targetType ===
        "story"
    ) {
        const { data } =
            await supabase
                .from("stories")
                .select("id")
                .eq(
                    "id",
                    validation.data
                        .targetId,
                )
                .maybeSingle();

        targetExists = !!data;
    }

    if (!targetExists) {
        return {
            error:
                "The reported item does not exist.",
        };
    }

    /*
     * Prevent duplicate pending reports.
     */
    const {
        data: existingReport,
        error: existingReportError,
    } = await supabase
        .from("reports")
        .select("id")
        .eq(
            "reporter_user_id",
            user.id,
        )
        .eq(
            "target_type",
            validation.data
                .targetType,
        )
        .eq(
            "target_id",
            validation.data
                .targetId,
        )
        .eq("status", "pending")
        .maybeSingle();

    if (existingReportError) {
        console.error(
            "Existing report lookup error:",
            existingReportError,
        );

        return {
            error:
                "Unable to check existing report.",
        };
    }

    if (existingReport) {
        return {
            error:
                "You have already reported this item.",
        };
    }

    /*
     * Store the report.
     *
     * reportType is stored together with the
     * details inside the existing reason field.
     */
    const reason = [
        `Type: ${validation.data.reportType}`,
        validation.data.details
            ? `Details: ${validation.data.details}`
            : null,
    ]
        .filter(Boolean)
        .join("\n\n");

    const { error: insertError } =
        await supabase
            .from("reports")
            .insert({
                reporter_user_id:
                    user.id,
                target_type:
                    validation.data
                        .targetType,
                target_id:
                    validation.data
                        .targetId,
                reason,
                status: "pending",
            });

    if (insertError) {
        console.error(
            "Create report error:",
            insertError,
        );

        return {
            error:
                "Unable to submit report.",
        };
    }

    revalidatePath("/");
    revalidatePath(
        `/post/${validation.data.targetId}`,
    );

    return {
        success: true,
    };
}