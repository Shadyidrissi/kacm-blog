"use client";

import { useLanguage } from "@/components/providers/language-provider";

export default function FeedEmptyState() {
    const { t } = useLanguage();

    return <>{t.feed.noPosts}</>;
}