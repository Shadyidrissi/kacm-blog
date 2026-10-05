import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getAvatarUrl } from "@/lib/supabase/storage";

import UserBlockButton from "@/components/profile/user-block-button";
import ProfilePageContent from "@/components/profile/profile-page-content";
import { getBlockStatus } from "@/app/actions/blocks";

type ProfilePageProps = {
    params: Promise<{
        username: string;
    }>;
};

export default async function UserProfilePage({
    params,
}: ProfilePageProps) {
    const supabase = await createClient();

    /*
     * Only authenticated users can view fan profiles.
     */
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { username } = await params;

    const normalizedUsername = username
        .trim()
        .toLowerCase();

    /*
     * Find the profile by unique username.
     */
    const {
        data: profile,
        error,
    } = await supabase
        .from("profiles")
        .select(
            "id, full_name, username, bio, avatar_url, role, created_at",
        )
        .eq(
            "username",
            normalizedUsername,
        )
        .maybeSingle();

    if (error) {
        console.error(
            "Public profile load error:",
            error,
        );

        notFound();
    }

    if (!profile) {
        notFound();
    }

    /*
     * Generate a temporary signed URL
     * for the private avatar.
     */
    const avatarUrl = await getAvatarUrl(
        profile.avatar_url,
    );

    const isOwnProfile =
        profile.id === user.id;

    const blockStatus =
        await getBlockStatus(
            profile.id,
        );

    return (
        <main className="mx-auto max-w-2xl p-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={`${profile.full_name} avatar`}
                                className="h-24 w-24 shrink-0 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-2xl font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                                {profile.full_name
                                    .charAt(0)
                                    .toUpperCase()}
                            </div>
                        )}

                        <div className="min-w-0">
                            <h1 className="truncate text-2xl font-bold">
                                {profile.full_name}
                            </h1>

                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                @{profile.username}
                            </p>
                        </div>
                    </div>

                    {isOwnProfile && (
                        <Link
                            href="/profile/edit"
                            className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            <ProfilePageContent
                                type="editProfile"
                            />
                        </Link>
                    )}
                </div>

                {/* Bio */}
                <div className="mt-6">
                    <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        <ProfilePageContent
                            type="bio"
                        />
                    </h2>

                    <p className="mt-1 whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
                        {profile.bio || (
                            <ProfilePageContent
                                type="noBio"
                            />
                        )}
                    </p>
                </div>

                {/* Member information */}
                <div className="mt-6 border-t border-zinc-200 pt-6 dark:border-zinc-800">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        <ProfilePageContent
                            type="kacmFan"
                        />
                    </p>
                </div>

                {user.id !== profile.id && (
                    <div className="mt-6">
                        <UserBlockButton
                            targetUserId={
                                profile.id
                            }
                            initialBlocked={
                                blockStatus.blocked ??
                                false
                            }
                        />
                    </div>
                )}
            </div>
        </main>
    );
}