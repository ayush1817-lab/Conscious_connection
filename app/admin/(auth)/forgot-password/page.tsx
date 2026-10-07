import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password · Conscious Connections" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return (
    <>
      <h1 className="mt-1 text-center text-2xl font-semibold">Forgot your password?</h1>
      <ForgotForm expired={expired === "1"} />
    </>
  );
}
