"use client";

import { useLanguage } from "@/components/providers/language-provider";

export default function FeedHeader() {
    const { t } = useLanguage();

    return (
        <h1 className="mb-4 text-2xl font-bold text-zinc-900 dark:text-white">
            {t.feed.title}
        </h1>
    );
}