"use client";

import { useLanguage } from "@/components/providers/language-provider";

type ProfilePageContentProps = {
    type:
        | "profile"
        | "editProfile"
        | "email"
        | "role"
        | "bio"
        | "noBio"
        | "unableToLoad"
        | "back"
        | "avatar"
        | "noAvatar"
        | "avatarPreview"
        | "selected"
        | "avatarRequirements"
        | "fullName"
        | "username"
        | "usernameRequirements"
        | "loadingProfile"
        | "saving"
        | "saveChanges"
        | "updatedSuccessfully"
        | "somethingWentWrong"
        | "kacmFan";
};

export default function ProfilePageContent({
    type,
}: ProfilePageContentProps) {
    const { t } = useLanguage();

    return <>{t.profile[type]}</>;
}