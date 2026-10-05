import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import ReportForm from "@/components/reports/report-form";

type ReportPageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function ReportPostPage({
    params,
}: ReportPageProps) {
    const { id } = await params;

    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    /*
     * Only authenticated users can report.
     */
    if (!user) {
        redirect(
            `/login?next=/post/report/${id}`,
        );
    }

    /*
     * Verify that the post exists.
     */
    const {
        data: post,
        error,
    } = await supabase
        .from("posts")
        .select(
            `
                id,
                content,
                visibility,
                profiles!posts_user_id_fkey (
                    full_name,
                    username
                )
            `,
        )
        .eq("id", id)
        .maybeSingle();

    if (error) {
        console.error(
            "Report post lookup error:",
            error,
        );

        notFound();
    }

    if (!post) {
        notFound();
    }

    const profile = Array.isArray(
        post.profiles,
    )
        ? post.profiles[0]
        : post.profiles;

    return (
        <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
            <div className="rounded-2xl border bg-black p-6 shadow-sm">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold">
                        Report Post
                    </h1>

                    <p className="mt-2 text-sm text-gray-500">
                        Tell us what is wrong with
                        this post. Our team will
                        review your report.
                    </p>
                </div>

                <div className="mb-6 rounded-xl bg-black p-4">
                    <p className="text-sm font-semibold">
                        Post by{" "}
                        {profile?.full_name ??
                            "KACM Fan"}
                    </p>

                    <p className="text-xs text-gray-500">
                        @
                        {profile?.username ??
                            "unknown"}
                    </p>

                    {post.content && (
                        <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm text-gray-700">
                            {post.content}
                        </p>
                    )}
                </div>

                <ReportForm
                    targetType="post"
                    targetId={post.id}
                />
            </div>
        </main>
    );
}