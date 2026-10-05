"use client";

import {
    ChangeEvent,
    FormEvent,
    useEffect,
    useState,
} from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { createPost } from "@/app/actions/posts";
import { useLanguage } from "@/components/providers/language-provider";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

export default function CreatePost() {
    const supabase = createClient();
    const router = useRouter();

    const { locale } = useLanguage();

    const [content, setContent] = useState("");
    const [visibility, setVisibility] =
        useState<"public" | "members">(
            "public",
        );

    const [imageFile, setImageFile] =
        useState<File | null>(null);

    const [imagePreview, setImagePreview] =
        useState("");

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(
                    imagePreview,
                );
            }
        };
    }, [imagePreview]);

    function handleImageChange(
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
            !ALLOWED_IMAGE_TYPES.includes(
                file.type,
            )
        ) {
            setImageFile(null);
            setImagePreview("");

            setError(
                locale === "ar"
                    ? "يجب أن تكون الصورة JPG أو PNG أو WebP."
                    : "Image must be JPG, PNG, or WebP.",
            );

            event.target.value = "";
            return;
        }

        if (file.size > MAX_IMAGE_SIZE) {
            setImageFile(null);
            setImagePreview("");

            setError(
                locale === "ar"
                    ? "يجب أن يكون حجم الصورة أقل من 10MB."
                    : "Image must be smaller than 10MB.",
            );

            event.target.value = "";
            return;
        }

        if (imagePreview) {
            URL.revokeObjectURL(
                imagePreview,
            );
        }

        const preview =
            URL.createObjectURL(file);

        setImageFile(file);
        setImagePreview(preview);
    }

    function removeImage() {
        if (imagePreview) {
            URL.revokeObjectURL(
                imagePreview,
            );
        }

        setImageFile(null);
        setImagePreview("");
    }

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const trimmedContent =
                content.trim();

            if (
                !trimmedContent &&
                !imageFile
            ) {
                setError(
                    locale === "ar"
                        ? "اكتب شيئاً أو أضف صورة."
                        : "Write something or add an image.",
                );

                return;
            }

            const result =
                await createPost({
                    content:
                        trimmedContent,
                    visibility,
                    hasImage:
                        !!imageFile,
                });

            if (
                !result.success ||
                !result.postId
            ) {
                setError(
                    result.error ??
                        (locale === "ar"
                            ? "تعذر إنشاء المنشور."
                            : "Unable to create post."),
                );

                return;
            }

            if (imageFile) {
                const {
                    data: { user },
                } =
                    await supabase.auth.getUser();

                if (!user) {
                    throw new Error(
                        locale === "ar"
                            ? "انتهت جلستك."
                            : "Your session has expired.",
                    );
                }

                const extension =
                    imageFile.type ===
                    "image/jpeg"
                        ? "jpg"
                        : imageFile.type ===
                            "image/png"
                          ? "png"
                          : "webp";

                const filePath =
                    `${user.id}/${result.postId}/image.${extension}`;

                const {
                    error: uploadError,
                } =
                    await supabase.storage
                        .from(
                            "post-media",
                        )
                        .upload(
                            filePath,
                            imageFile,
                            {
                                contentType:
                                    imageFile.type,
                                cacheControl:
                                    "3600",
                                upsert: false,
                            },
                        );

                if (uploadError) {
                    console.error(
                        "Post image upload error:",
                        uploadError,
                    );

                    throw new Error(
                        locale === "ar"
                            ? `فشل رفع الصورة: ${uploadError.message}`
                            : `Image upload failed: ${uploadError.message}`,
                    );
                }

                const {
                    error: mediaError,
                } =
                    await supabase
                        .from(
                            "post_media",
                        )
                        .insert({
                            post_id:
                                result.postId,
                            media_url:
                                filePath,
                            media_type:
                                "image",
                        });

                if (mediaError) {
                    console.error(
                        "Post media insert error:",
                        mediaError,
                    );

                    await supabase.storage
                        .from(
                            "post-media",
                        )
                        .remove([
                            filePath,
                        ]);

                    throw new Error(
                        locale === "ar"
                            ? `تعذر حفظ صورة المنشور: ${mediaError.message}`
                            : `Unable to save post image: ${mediaError.message}`,
                    );
                }
            }

            setContent("");
            setVisibility("public");
            removeImage();

            setSuccess(
                locale === "ar"
                    ? "تم نشر المنشور."
                    : "Post published.",
            );

            router.refresh();
        } catch (error) {
            console.error(
                "Create post error:",
                error,
            );

            setError(
                error instanceof Error
                    ? error.message
                    : locale === "ar"
                      ? "حدث خطأ ما."
                      : "Something went wrong.",
            );
        } finally {
            setLoading(false);
        }
    }

    const isArabic =
        locale === "ar";

    return (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                {isArabic
                    ? "إنشاء منشور"
                    : "Create Post"}
            </h2>

            <form
                onSubmit={handleSubmit}
                className="mt-4 space-y-4"
            >
                <textarea
                    value={content}
                    onChange={(event) =>
                        setContent(
                            event.target.value,
                        )
                    }
                    disabled={loading}
                    maxLength={5000}
                    rows={2}
                    placeholder={
                        isArabic
                            ? "شارك شيئاً مع جماهير KACM..."
                            : "Share something with KACM fans..."
                    }
                    className="w-full resize-none rounded-xl border border-zinc-300 bg-white p-3 text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-500"
                />

                {imagePreview && (
                    <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <img
                            src={
                                imagePreview
                            }
                            alt={
                                isArabic
                                    ? "معاينة المنشور"
                                    : "Post preview"
                            }
                            className="max-h-[500px] w-full object-cover"
                        />

                        <button
                            type="button"
                            onClick={
                                removeImage
                            }
                            disabled={
                                loading
                            }
                            className="absolute right-3 top-3 rounded-lg bg-black/70 px-3 py-2 text-sm text-white transition hover:bg-black/80"
                        >
                            {isArabic
                                ? "إزالة"
                                : "Remove"}
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <label className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800">
                            {isArabic
                                ? "إضافة صورة"
                                : "Add Photo"}

                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={
                                    handleImageChange
                                }
                                disabled={
                                    loading
                                }
                                className="hidden"
                            />
                        </label>

                        <select
                            value={
                                visibility
                            }
                            onChange={(
                                event,
                            ) =>
                                setVisibility(
                                    event
                                        .target
                                        .value as
                                        | "public"
                                        | "members",
                                )
                            }
                            disabled={
                                loading
                            }
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                        >
                            <option value="public">
                                {isArabic
                                    ? "عام"
                                    : "Public"}
                            </option>

                            <option value="members">
                                {isArabic
                                    ? "للأعضاء فقط"
                                    : "Members Only"}
                            </option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={
                            loading ||
                            (!content.trim() &&
                                !imageFile)
                        }
                        className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        {loading
                            ? isArabic
                                ? "جاري النشر..."
                                : "Publishing..."
                            : isArabic
                              ? "نشر"
                              : "Publish"}
                    </button>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {isArabic
                        ? "JPG أو PNG أو WebP · الحد الأقصى 10MB · صورة واحدة لكل منشور"
                        : "JPG, PNG or WebP · Maximum 10MB · One image per post"}
                </p>

                {error && (
                    <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300">
                        {success}
                    </div>
                )}
            </form>
        </div>
    );
}