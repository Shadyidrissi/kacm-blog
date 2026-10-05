
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import EditPostForm from "@/components/posts/edit-post-form";

type EditPostPageProps = {
    params: Promise<{
        id: string;
    }>;
};

export default async function EditPostPage({
    params,
}: EditPostPageProps) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // User must be logged in
    if (!user) {
        redirect("/login");
    }

    const { id } = await params;

    // Load the post
    const {
        data: post,
        error,
    } = await supabase
        .from("posts")
        .select(
            "id, user_id, content, visibility",
        )
        .eq("id", id)
        .maybeSingle();

    // Database error
    if (error) {
        console.error(
            "Edit post load error:",
            error,
        );

        notFound();
    }

    // Post does not exist
    if (!post) {
        notFound();
    }

    // SECURITY:
    // Only the owner of the post can edit it.
    if (post.user_id !== user.id) {
        redirect(`/post/${id}`);
    }

    return (
        <main className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100 sm:px-6">
            <div className="mx-auto w-full max-w-2xl">
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    {/* Header */}
                    <div className="mb-6 flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
                                Edit Post
                            </h1>

                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                Update your post.
                            </p>
                        </div>

                        <Link
                            href={`/post/${id}`}
                            className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </Link>
                    </div>

                    {/* Edit Form */}
                    <EditPostForm
                        postId={post.id}
                        initialContent={
                            post.content ?? ""
                        }
                        visibility={
                            post.visibility
                        }
                    />
                </div>
            </div>
        </main>
    );
}

