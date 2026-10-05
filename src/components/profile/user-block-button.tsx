"use client";

import {
    useState,
    useTransition,
} from "react";

import {
    blockUser,
    unblockUser,
} from "@/app/actions/blocks";

type UserBlockButtonProps = {
    targetUserId: string;
    initialBlocked: boolean;
};

export default function UserBlockButton({
    targetUserId,
    initialBlocked,
}: UserBlockButtonProps) {
    const [
        blocked,
        setBlocked,
    ] = useState(initialBlocked);

    const [
        isPending,
        startTransition,
    ] = useTransition();

    const [error, setError] =
        useState<string | null>(null);

    function handleBlock() {
        const confirmed =
            window.confirm(
                "Are you sure you want to block this user?",
            );

        if (!confirmed) {
            return;
        }

        setError(null);

        startTransition(async () => {
            const result =
                await blockUser(
                    targetUserId,
                );

            if (result.error) {
                setError(result.error);
                return;
            }

            setBlocked(true);
        });
    }

    function handleUnblock() {
        const confirmed =
            window.confirm(
                "Are you sure you want to unblock this user?",
            );

        if (!confirmed) {
            return;
        }

        setError(null);

        startTransition(async () => {
            const result =
                await unblockUser(
                    targetUserId,
                );

            if (result.error) {
                setError(result.error);
                return;
            }

            setBlocked(false);
        });
    }

    return (
        <div className="space-y-2">
            <button
                type="button"
                onClick={
                    blocked
                        ? handleUnblock
                        : handleBlock
                }
                disabled={isPending}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                    blocked
                        ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                } ${
                    isPending
                        ? "cursor-not-allowed opacity-50"
                        : ""
                }`}
            >
                {isPending
                    ? "Please wait..."
                    : blocked
                      ? "Unblock User"
                      : "Block User"}
            </button>

            {error && (
                <p className="text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}