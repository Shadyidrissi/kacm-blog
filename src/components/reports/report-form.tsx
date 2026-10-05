"use client";

import {
    useState,
    useTransition,
} from "react";
import { useRouter } from "next/navigation";

import { createReport } from "@/app/actions/reports";

type ReportType =
    | "spam"
    | "harassment"
    | "hate_speech"
    | "scam"
    | "inappropriate"
    | "false_information"
    | "other";

type ReportFormProps = {
    targetType: "post";
    targetId: string;
};

const reportTypes: {
    value: ReportType;
    label: string;
    description: string;
}[] = [
    {
        value: "spam",
        label: "Spam",
        description:
            "Unwanted, repetitive, or promotional content.",
    },
    {
        value: "harassment",
        label: "Harassment or bullying",
        description:
            "Threats, bullying, or targeted harassment.",
    },
    {
        value: "hate_speech",
        label: "Hate speech",
        description:
            "Hateful or discriminatory content.",
    },
    {
        value: "scam",
        label: "Scam or fraud",
        description:
            "Fraud, scams, fake offers, or suspicious activity.",
    },
    {
        value: "inappropriate",
        label: "Inappropriate content",
        description:
            "Content that should not be on KACM.",
    },
    {
        value: "false_information",
        label: "False information",
        description:
            "Information that is misleading or intentionally false.",
    },
    {
        value: "other",
        label: "Other",
        description:
            "Something else that violates the rules.",
    },
];

export default function ReportForm({
    targetType,
    targetId,
}: ReportFormProps) {
    const router = useRouter();

    const [
        isPending,
        startTransition,
    ] = useTransition();

    const [reportType, setReportType] =
        useState<ReportType | null>(
            null,
        );

    const [details, setDetails] =
        useState("");

    const [error, setError] =
        useState<string | null>(null);

    function handleSubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError(null);

        if (!reportType) {
            setError(
                "Please select a report type.",
            );

            return;
        }

        startTransition(async () => {
            const result =
                await createReport(
                    targetType,
                    targetId,
                    reportType,
                    details,
                );

            if (result.error) {
                setError(result.error);
                return;
            }

            router.push(
                `/post/${targetId}?reported=1`,
            );

            router.refresh();
        });
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6 "
        >
            <div>
                <h2 className="mb-3 text-sm font-semibold">
                    Why are you reporting this
                    post?
                </h2>

                <div className="space-y-2">
                    {reportTypes.map(
                        (type) => {
                            const selected =
                                reportType ===
                                type.value;

                            return (
                                <button
                                    key={
                                        type.value
                                    }
                                    type="button"
                                    onClick={() =>
                                        setReportType(
                                            type.value,
                                        )
                                    }
                                    disabled={
                                        isPending
                                    }
                                    className={`w-full rounded-xl border p-4 text-left transition ${
                                        selected
                                            ? "border-black bg-gray-100 text-black"
                                            : "border-gray-200 hover:bg-gray-50 hover:text-black"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                                selected
                                                    ? "border-black bg-black text-white"
                                                    : "border-gray-300"
                                            }`}
                                        >
                                            {selected
                                                ? "✓"
                                                : ""}
                                        </span>

                                        <div>
                                            <p className="text-sm font-medium">
                                                {
                                                    type.label
                                                }
                                            </p>

                                            <p className="mt-1 text-xs text-gray-500">
                                                {
                                                    type.description
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            );
                        },
                    )}
                </div>
            </div>

            <div>
                <label
                    htmlFor="report-details"
                    className="mb-2 block text-sm font-semibold"
                >
                    Additional details
                    <span className="ml-1 font-normal text-gray-400">
                        (optional)
                    </span>
                </label>

                <textarea
                    id="report-details"
                    value={details}
                    onChange={(event) =>
                        setDetails(
                            event.target
                                .value,
                        )
                    }
                    maxLength={2000}
                    rows={6}
                    disabled={isPending}
                    placeholder="Explain what happened or provide any useful details..."
                    className="w-full resize-none rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-gray-500"
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                    {details.length}/2000
                </p>
            </div>

            {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    {error}
                </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t pt-5">
                <button
                    type="button"
                    onClick={() =>
                        router.push(
                            `/post/${targetId}`,
                        )
                    }
                    disabled={isPending}
                    className="rounded-xl border px-5 py-2.5 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    disabled={
                        isPending ||
                        !reportType
                    }
                    className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isPending
                        ? "Submitting..."
                        : "Submit Report"}
                </button>
            </div>
        </form>
    );
}