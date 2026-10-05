"use client";

import { FormEvent, useState } from "react";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const registerSchema = z
    .object({
        fullName: z
            .string()
            .trim()
            .min(2, "Full name must be at least 2 characters.")
            .max(100, "Full name is too long."),

        username: z
            .string()
            .trim()
            .min(3, "Username must be at least 3 characters.")
            .max(30, "Username is too long.")
            .regex(
                /^[a-zA-Z0-9_]+$/,
                "Username can only contain letters, numbers, and underscores.",
            ),

        email: z
            .string()
            .trim()
            .email("Enter a valid email address."),

        password: z
            .string()
            .min(8, "Password must be at least 8 characters.")
            .max(72, "Password is too long."),

        confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match.",
        path: ["confirmPassword"],
    });

export default function RegisterPage() {
    const supabase = createClient();

    const [fullName, setFullName] = useState("");
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setSuccess("");

        const validation = registerSchema.safeParse({
            fullName,
            username,
            email,
            password,
            confirmPassword,
        });

        if (!validation.success) {
            setError(validation.error.issues[0]?.message ?? "Invalid form.");
            return;
        }

        setLoading(true);

        try {
            const normalizedUsername = username.trim().toLowerCase();
            const normalizedEmail = email.trim().toLowerCase();
            const normalizedFullName = fullName.trim();

            /*
             * Check username before creating the Auth user.
             * The UNIQUE constraint in PostgreSQL remains the final authority.
             */
            const { data: usernameAvailable, error: usernameCheckError } =
                await supabase.rpc("is_username_available", {
                    check_username: normalizedUsername,
                });

            if (usernameCheckError) {
                throw new Error("Unable to check username availability.");
            }

            if (!usernameAvailable) {
                setError("This username is already taken.");
                return;
            }

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: normalizedEmail,
                password,
                options: {
                    data: {
                        full_name: normalizedFullName,
                        username: normalizedUsername,
                    },
                },
            });

            if (signUpError) {
                if (signUpError.message.toLowerCase().includes("already registered")) {
                    setError("This email is already registered.");
                } else {
                    setError(signUpError.message);
                }

                return;
            }

            if (!data.user) {
                setError("Registration failed. Please try again.");
                return;
            }

            /*
             * If email confirmation is enabled, session will normally be null.
             */
            if (!data.session) {
                setSuccess(
                    "Account created successfully. Please check your email to confirm your account.",
                );
            } else {
                setSuccess("Account created successfully. You are now logged in.");
            }

            setFullName("");
            setUsername("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Something went wrong. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-6">
            <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
                <h1 className="text-3xl font-bold">Create Account</h1>

                <p className="mt-2 text-sm text-gray-500">
                    Join the KACM community.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="fullName" className="mb-1 block text-sm font-medium">
                            Full Name
                        </label>

                        <input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                            autoComplete="name"
                            disabled={loading}
                            className="w-full rounded-lg border px-3 py-2 outline-none"
                            placeholder="Your full name"
                        />
                    </div>

                    <div>
                        <label htmlFor="username" className="mb-1 block text-sm font-medium">
                            Username
                        </label>

                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            autoComplete="username"
                            disabled={loading}
                            className="w-full rounded-lg border px-3 py-2 outline-none"
                            placeholder="your_username"
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="mb-1 block text-sm font-medium">
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            disabled={loading}
                            className="w-full rounded-lg border px-3 py-2 outline-none"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="mb-1 block text-sm font-medium">
                            Password
                        </label>

                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="new-password"
                            disabled={loading}
                            className="w-full rounded-lg border px-3 py-2 outline-none"
                            placeholder="At least 8 characters"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="confirmPassword"
                            className="mb-1 block text-sm font-medium"
                        >
                            Confirm Password
                        </label>

                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            autoComplete="new-password"
                            disabled={loading}
                            className="w-full rounded-lg border px-3 py-2 outline-none"
                            placeholder="Repeat your password"
                        />
                    </div>

                    {error && (
                        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700">
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-black px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Creating account..." : "Create Account"}
                    </button>
                </form>
            </div>
        </main>
    );
}