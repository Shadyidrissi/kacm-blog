"use client";

import { useLanguage } from "@/components/providers/language-provider";

type PostDetailsLabelProps = {
    type:
        | "visibility"
        | "comments"
        | "loginToComment"
        | "author"
        | "unknown";
    visibility?: "public" | "members";
    authorName?: string;
};

export default function PostDetailsLabel({
    type,
    visibility,
    authorName,
}: PostDetailsLabelProps) {
    const { t } = useLanguage();

    if (type === "visibility") {
        return (
            <>
                {visibility === "members"
                    ? t.post.members
                    : t.post.public}
            </>
        );
    }

    if (type === "comments") {
        return <>{t.post.comments}</>;
    }

    if (type === "loginToComment") {
        return <>{t.post.loginToComment}</>;
    }

    if (type === "author") {
        return (
            <>
                {t.post.postBy}{" "}
                {authorName ?? t.common.kacmFan}
            </>
        );
    }

    return <>{t.common.unknown}</>;
}