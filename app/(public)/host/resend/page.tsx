import type { Metadata } from "next";
import { ResendForm } from "@/components/public/resend-form";

export const metadata: Metadata = { title: "Get a new link to your event", robots: { index: false, follow: false } };

// H6 Resend my link.
export default function ResendPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-heading text-3xl font-semibold md:text-4xl">Get a new link to your event</h1>
      <p className="mt-3 mb-8 text-lg">
        Lost the email with your private link? Enter your email and we&apos;ll send a fresh link for each event that&apos;s
        live or waiting for your changes. Any old links will stop working.
      </p>
      <ResendForm />
    </div>
  );
}
