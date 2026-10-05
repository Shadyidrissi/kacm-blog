"use client";

import {
    ChangeEvent,
    FormEvent,
    useEffect,
    useState,
} from "react";

import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/providers/language-provider";

const MAX_AVATAR_SIZE =
    5 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

export default function EditProfilePage() {
    const { t } = useLanguage();

    const supabase = createClient();
    const router = useRouter();

    const profileSchema = z.object({
        fullName: z
            .string()
            .trim()
            .min(
                2,
                t.profile.fullNameMin,
            )
            .max(
                100,
                t.profile.fullNameMax,
            ),

        username: z
            .string()
            .trim()
            .min(
                3,
                t.profile.usernameMin,
            )
            .max(
                30,
                t.profile.usernameMax,
            )
            .regex(
                /^[a-zA-Z0-9_]+$/,
                t.profile.usernameInvalid,
            ),

        bio: z
            .string()
            .trim()
            .max(
                500,
                t.profile.bioMax,
            ),
    });

    const [userId, setUserId] =
        useState("");

    const [fullName, setFullName] =
        useState("");

    const [username, setUsername] =
        useState("");

    const [
        originalUsername,
        setOriginalUsername,
    ] = useState("");

    const [bio, setBio] =
        useState("");

    const [avatarPath, setAvatarPath] =
        useState("");

    const [avatarFile, setAvatarFile] =
        useState<File | null>(null);

    const [
        avatarPreview,
        setAvatarPreview,
    ] = useState("");

    const [
        currentAvatarUrl,
        setCurrentAvatarUrl,
    ] = useState("");

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    /*
     * Load profile.
     */
    useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            const {
                data: { user },
            } =
                await supabase.auth.getUser();

            if (!user) {
                router.replace("/login");
                return;
            }

            if (!mounted) {
                return;
            }

            setUserId(user.id);

            const {
                data,
                error: profileError,
            } = await supabase
                .from("profiles")
                .select(
                    "full_name, username, bio, avatar_url",
                )
                .eq("id", user.id)
                .single();

            if (
                profileError ||
                !data
            ) {
                console.error(
                    "Profile load error:",
                    profileError,
                );

                if (mounted) {
                    setError(
                        t.profile.unableToLoad,
                    );

                    setLoading(false);
                }

                return;
            }

            if (!mounted) {
                return;
            }

            setFullName(
                data.full_name,
            );

            setUsername(
                data.username,
            );

            setOriginalUsername(
                data.username,
            );

            setBio(
                data.bio ?? "",
            );

            setAvatarPath(
                data.avatar_url ?? "",
            );

            if (data.avatar_url) {
                const {
                    data: signedAvatar,
                    error: signedAvatarError,
                } =
                    await supabase.storage
                        .from("avatars")
                        .createSignedUrl(
                            data.avatar_url,
                            60 * 60,
                        );

                if (
                    signedAvatarError
                ) {
                    console.error(
                        "Avatar preview URL error:",
                        signedAvatarError,
                    );
                } else if (
                    mounted &&
                    signedAvatar?.signedUrl
                ) {
                    setCurrentAvatarUrl(
                        signedAvatar.signedUrl,
                    );
                }
            }

            if (mounted) {
                setLoading(false);
            }
        }

        loadProfile();

        return () => {
            mounted = false;
        };
    }, [router, supabase, t.profile.unableToLoad]);

    /*
     * Clean temporary object URL.
     */
    useEffect(() => {
        return () => {
            if (avatarPreview) {
                URL.revokeObjectURL(
                    avatarPreview,
                );
            }
        };
    }, [avatarPreview]);

    /*
     * Select avatar.
     */
    function handleAvatarChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        setError("");
        setSuccess("");

        if (
            !ALLOWED_AVATAR_TYPES.includes(
                file.type,
            )
        ) {
            setAvatarFile(null);

            if (avatarPreview) {
                URL.revokeObjectURL(
                    avatarPreview,
                );
            }

            setAvatarPreview("");

            setError(
                t.profile.avatarType,
            );

            event.target.value = "";

            return;
        }

        if (
            file.size >
            MAX_AVATAR_SIZE
        ) {
            setAvatarFile(null);

            if (avatarPreview) {
                URL.revokeObjectURL(
                    avatarPreview,
                );
            }

            setAvatarPreview("");

            setError(
                t.profile.avatarSize,
            );

            event.target.value = "";

            return;
        }

        if (avatarPreview) {
            URL.revokeObjectURL(
                avatarPreview,
            );
        }

        const previewUrl =
            URL.createObjectURL(file);

        setAvatarFile(file);

        setAvatarPreview(
            previewUrl,
        );
    }

    async function checkUsernameAvailability(
        normalizedUsername: string,
    ): Promise<boolean> {
        if (
            normalizedUsername ===
            originalUsername.toLowerCase()
        ) {
            return true;
        }

        const response =
            await fetch(
                "/api/username/check",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        username:
                            normalizedUsername,
                    }),
                },
            );

        let result: {
            available?: boolean;
            error?: string;
        };

        try {
            result =
                await response.json();
        } catch {
            throw new Error(
                t.profile.unableToCheckUsername,
            );
        }

        if (!response.ok) {
            throw new Error(
                result.error ??
                    t.profile.unableToCheckUsername,
            );
        }

        return (
            result.available ===
            true
        );
    }

    async function uploadAvatar(): Promise<string> {
        if (!avatarFile) {
            return avatarPath;
        }

        if (!userId) {
            throw new Error(
                t.profile.sessionUnavailable,
            );
        }

        const extension =
            avatarFile.type ===
            "image/jpeg"
                ? "jpg"
                : avatarFile.type ===
                    "image/png"
                  ? "png"
                  : "webp";

        const finalPath = `${userId}/avatar.${extension}`;

        const {
            error: uploadError,
        } = await supabase.storage
            .from("avatars")
            .upload(
                finalPath,
                avatarFile,
                {
                    upsert: true,
                    contentType:
                        avatarFile.type,
                    cacheControl:
                        "3600",
                },
            );

        if (uploadError) {
            console.error(
                "Avatar upload error:",
                uploadError,
            );

            throw new Error(
                `${t.profile.avatarUploadFailed}: ${uploadError.message}`,
            );
        }

        if (
            avatarPath &&
            avatarPath !==
                finalPath
        ) {
            const {
                error: removeError,
            } =
                await supabase.storage
                    .from("avatars")
                    .remove([
                        avatarPath,
                    ]);

            if (removeError) {
                console.warn(
                    "Old avatar removal failed:",
                    removeError,
                );
            }
        }

        return finalPath;
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError("");
        setSuccess("");
        setSaving(true);

        try {
            /*
             * 1. Validate profile.
             */
            const validation =
                profileSchema.safeParse({
                    fullName,
                    username,
                    bio,
                });

            if (
                !validation.success
            ) {
                setError(
                    validation.error
                        .issues[0]
                        ?.message ??
                        t.profile.invalidProfile,
                );

                return;
            }

            /*
             * 2. Normalize username.
             */
            const normalizedUsername =
                username
                    .trim()
                    .toLowerCase();

            /*
             * 3. Check username.
             */
            const usernameAvailable =
                await checkUsernameAvailability(
                    normalizedUsername,
                );

            if (
                !usernameAvailable
            ) {
                setError(
                    t.profile.usernameTaken,
                );

                return;
            }

            /*
             * 4. Upload avatar.
             */
            let finalAvatarPath =
                avatarPath;

            if (avatarFile) {
                finalAvatarPath =
                    await uploadAvatar();
            }

            /*
             * 5. Update profile.
             */
            const {
                error: updateError,
            } =
                await supabase
                    .from("profiles")
                    .update({
                        full_name:
                            fullName.trim(),

                        username:
                            normalizedUsername,

                        bio:
                            bio.trim() ||
                            null,

                        avatar_url:
                            finalAvatarPath ||
                            null,
                    })
                    .eq(
                        "id",
                        userId,
                    );

            if (updateError) {
                console.error(
                    "Profile update error:",
                    updateError,
                );

                if (
                    updateError.code ===
                    "23505"
                ) {
                    throw new Error(
                        t.profile.usernameTaken,
                    );
                }

                throw new Error(
                    `${t.profile.unableToUpdate}: ${updateError.message}`,
                );
            }

            /*
             * 6. Update local state.
             */
            setFullName(
                fullName.trim(),
            );

            setUsername(
                normalizedUsername,
            );

            setOriginalUsername(
                normalizedUsername,
            );

            setBio(
                bio.trim(),
            );

            setAvatarPath(
                finalAvatarPath,
            );

            setAvatarFile(null);

            /*
             * Create fresh signed URL.
             */
            if (finalAvatarPath) {
                const {
                    data: signedAvatar,
                    error: signedAvatarError,
                } =
                    await supabase.storage
                        .from("avatars")
                        .createSignedUrl(
                            finalAvatarPath,
                            60 * 60,
                        );

                if (
                    !signedAvatarError &&
                    signedAvatar?.signedUrl
                ) {
                    setCurrentAvatarUrl(
                        signedAvatar.signedUrl,
                    );
                }
            }

            /*
             * Remove temporary preview.
             */
            if (avatarPreview) {
                URL.revokeObjectURL(
                    avatarPreview,
                );

                setAvatarPreview("");
            }

            setSuccess(
                t.profile.updatedSuccessfully,
            );

            router.refresh();
        } catch (error) {
            console.error(
                "Edit profile error:",
                error,
            );

            setError(
                error instanceof Error
                    ? error.message
                    : t.profile.somethingWentWrong,
            );
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <main className="p-10 text-zinc-900 transition-colors dark:text-zinc-100">
                <p>
                    {t.profile.loadingProfile}
                </p>
            </main>
        );
    }

    const displayedAvatar =
        avatarPreview ||
        currentAvatarUrl;

    return (
        <main className="mx-auto max-w-2xl p-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-3xl font-bold">
                        {t.profile.editProfile}
                    </h1>

                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                "/profile",
                            )
                        }
                        disabled={saving}
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        {t.profile.back}
                    </button>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="mt-6 space-y-5"
                >
                    {/* Avatar */}
                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            {t.profile.avatar}
                        </label>

                        <div className="mb-4">
                            {displayedAvatar ? (
                                <img
                                    src={
                                        displayedAvatar
                                    }
                                    alt={
                                        t.profile.avatarPreview
                                    }
                                    className="h-24 w-24 rounded-full object-cover"
                                />
                            ) : (
                                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-zinc-300 bg-zinc-100 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                                    {t.profile.noAvatar}
                                </div>
                            )}
                        </div>

                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={
                                handleAvatarChange
                            }
                            disabled={saving}
                            className="block w-full text-sm text-zinc-700 file:me-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-4 file:py-2 file:text-sm file:font-medium dark:text-zinc-300 dark:file:bg-zinc-800"
                        />

                        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                            {t.profile.avatarRequirements}
                        </p>

                        {avatarFile && (
                            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                                {t.profile.selected}:{" "}
                                {
                                    avatarFile.name
                                }
                            </p>
                        )}
                    </div>

                    {/* Full Name */}
                    <div>
                        <label
                            htmlFor="fullName"
                            className="mb-1 block text-sm font-medium"
                        >
                            {t.profile.fullName}
                        </label>

                        <input
                            id="fullName"
                            type="text"
                            value={
                                fullName
                            }
                            onChange={(
                                event,
                            ) =>
                                setFullName(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            disabled={
                                saving
                            }
                            autoComplete="name"
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label
                            htmlFor="username"
                            className="mb-1 block text-sm font-medium"
                        >
                            {t.profile.username}
                        </label>

                        <input
                            id="username"
                            type="text"
                            value={
                                username
                            }
                            onChange={(
                                event,
                            ) =>
                                setUsername(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            disabled={
                                saving
                            }
                            autoComplete="username"
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
                        />

                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            {t.profile.usernameRequirements}
                        </p>
                    </div>

                    {/* Bio */}
                    <div>
                        <div className="flex items-center justify-between">
                            <label
                                htmlFor="bio"
                                className="mb-1 block text-sm font-medium"
                            >
                                {t.profile.bio}
                            </label>

                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                {
                                    bio.length
                                }
                                /500
                            </span>
                        </div>

                        <textarea
                            id="bio"
                            value={bio}
                            onChange={(
                                event,
                            ) =>
                                setBio(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            disabled={
                                saving
                            }
                            rows={5}
                            maxLength={
                                500
                            }
                            className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400">
                            {success}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        {saving
                            ? t.profile.saving
                            : t.profile.saveChanges}
                    </button>
                </form>
            </div>
        </main>
    );
}