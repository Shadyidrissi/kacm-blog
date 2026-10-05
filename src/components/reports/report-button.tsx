"use client";

import {
    useState,
    useTransition,
} from "react";

import { createReport } from "@/app/actions/reports";

type ReportTarget =
    | "post"
    | "comment"
    | "profile"
    | "story";

type ReportButtonProps = {
    targetType: ReportTarget;
    targetId: string;
    isLoggedIn: boolean;
};

export default function ReportButton({
    targetType,
    targetId,
    isLoggedIn,
}: ReportButtonProps) {
    const [
        isPending,
        startTransition,
    ] = useTransition();

    const [open, setOpen] =
        useState(false);

    const [reason, setReason] =
        useState("");

    const [message, setMessage] =
        useState<string | null>(null);

    const [success, setSuccess] =
        useState(false);

    function handleOpen() {
        if (!isLoggedIn) {
            setMessage(
                "You must log in to report.",
            );

            return;
        }

        setMessage(null);
        setSuccess(false);
        setOpen(true);
    }

    function handleSubmit() {
        const trimmed =
            reason.trim();

        if (!trimmed) {
            setMessage(
                "Please provide a reason.",
            );

            return;
        }

        setMessage(null);

        startTransition(async () => {
            const result =
                await createReport(
                    targetType,
                    targetId,
                    trimmed,
                );

            if (result.error) {
                setMessage(
                    result.error,
                );

                return;
            }

            setReason("");
            setSuccess(true);
            setOpen(false);
        });
    }

    return (
        <div>
            <button
                type="button"
                onClick={handleOpen}
                className="text-sm font-medium text-gray-500 hover:text-red-600 hover:underline"
            >
                Report
            </button>

            {open && (
                <div className="mt-3 rounded-xl border bg-gray-50 p-4">
                    <p className="mb-3 text-sm font-semibold">
                        Report this{" "}
                        {targetType}
                    </p>

                    <textarea
                        value={reason}
                        onChange={(event) =>
                            setReason(
                                event.target
                                    .value,
                            )
                        }
                        maxLength={1000}
                        rows={3}
                        placeholder="Tell us why you are reporting this..."
                        disabled={
                            isPending
                        }
                        className="w-full resize-none rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-gray-400"
                    />

                    <div className="mt-3 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                setOpen(
                                    false,
                                )
                            }
                            disabled={
                                isPending
                            }
                            className="rounded-lg border px-3 py-2 text-sm"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={
                                handleSubmit
                            }
                            disabled={
                                isPending
                            }
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                            {isPending
                                ? "Sending..."
                                : "Submit Report"}
                        </button>
                    </div>
                </div>
            )}

            {message && (
                <p className="mt-2 text-sm text-red-600">
                    {message}
                </p>
            )}

            {success && (
                <p className="mt-2 text-sm text-green-600">
                    Report submitted successfully.
                </p>
            )}
        </div>
    );
}