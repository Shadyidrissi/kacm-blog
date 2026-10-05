"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";
import Link from "next/link";

import { useLanguage } from "@/components/providers/language-provider";
import { createClient } from "@/lib/supabase/client";

type PostActionsProps = {
    postId: string;
    canManage?: boolean;
};

export default function PostActions({
    postId,
    canManage = false,
}: PostActionsProps) {
    const { locale } = useLanguage();

    const isArabic = locale === "ar";

    const [open, setOpen] =
        useState(false);

    const [copied, setCopied] =
        useState(false);

    const [deleting, setDeleting] =
        useState(false);

    const menuRef =
        useRef<HTMLDivElement>(null);

    const supabase = createClient();

    useEffect(() => {
        function handleClickOutside(
            event: MouseEvent,
        ) {
            if (
                menuRef.current &&
                !menuRef.current.contains(
                    event.target as Node,
                )
            ) {
                setOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleClickOutside,
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside,
            );
        };
    }, []);

    async function handleShare() {
        const url =
            `${window.location.origin}/post/${postId}`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: "KACM Post",
                    url,
                });
            } else {
                await navigator.clipboard.writeText(
                    url,
                );

                setCopied(true);

                setTimeout(() => {
                    setCopied(false);
                }, 2000);
            }

            setOpen(false);
        } catch {
            // User cancelled native share.
        }
    }

    async function handleDelete() {
        const confirmed = window.confirm(
            isArabic
                ? "هل أنت متأكد من حذف هذا المنشور؟ لا يمكن التراجع عن هذا الإجراء."
                : "Are you sure you want to delete this post? This action cannot be undone.",
        );

        if (!confirmed) return;

        setDeleting(true);

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                throw new Error(
                    "Not authenticated",
                );
            }

            /*
             * RLS must enforce that only the
             * owner can delete this post.
             */
            const { error } =
                await supabase
                    .from("posts")
                    .delete()
                    .eq("id", postId)
                    .eq("user_id", user.id);

            if (error) {
                throw error;
            }

            setOpen(false);

            window.location.reload();
        } catch (error) {
            console.error(
                "Delete post error:",
                error,
            );

            alert(
                isArabic
                    ? "تعذر حذف المنشور."
                    : "Unable to delete the post.",
            );
        } finally {
            setDeleting(false);
        }
    }

    return (
        <div
            ref={menuRef}
            className="relative"
        >
            <button
                type="button"
                onClick={() =>
                    setOpen(
                        (value) => !value,
                    )
                }
                aria-label={
                    isArabic
                        ? "خيارات المنشور"
                        : "Post options"
                }
                aria-expanded={open}
                className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
                ⋮
            </button>

            {open && (
                <div className="absolute end-0 top-0 z-100 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700  dark:bg-zinc-900">
                    {/* Owner controls */}
                    {canManage && (
                        <>
                            <Link
                                href={`/post/${postId}/edit`}
                                onClick={() =>
                                    setOpen(
                                        false,
                                    )
                                }
                                className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                                <span>
                                    ✏️
                                </span>

                                <span>
                                    {isArabic
                                        ? "تعديل"
                                        : "Edit"}
                                </span>
                            </Link>

                            <button
                                type="button"
                                disabled={
                                    deleting
                                }
                                onClick={
                                    handleDelete
                                }
                                className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
                            >
                                <span>
                                    🗑️
                                </span>

                                <span>
                                    {deleting
                                        ? isArabic
                                            ? "جاري الحذف..."
                                            : "Deleting..."
                                        : isArabic
                                          ? "حذف"
                                          : "Delete"}
                                </span>
                            </button>

                            <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />
                        </>
                    )}

                    {/* Share */}
                    <button
                        type="button"
                        onClick={
                            handleShare
                        }
                        className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        <span>
                            ↗
                        </span>

                        <span>
                            {copied
                                ? isArabic
                                    ? "تم نسخ الرابط"
                                    : "Link copied"
                                : isArabic
                                  ? "مشاركة"
                                  : "Share"}
                        </span>
                    </button>

                    {/* Report */}
                    <Link
                        href={`/post/report/${postId}`}
                        onClick={() =>
                            setOpen(false)
                        }
                        className="flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        <span>
                            ⚑
                        </span>

                        <span>
                            {isArabic
                                ? "إبلاغ"
                                : "Report"}
                        </span>
                    </Link>
                </div>
            )}
        </div>
    );
}