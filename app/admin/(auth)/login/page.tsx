import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in · Conscious Connections" };

// A0 – Login
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="mt-1 text-center text-2xl font-semibold">Admin login</h1>
      <LoginForm next={next?.startsWith("/admin") ? next : "/admin"} />
    </>
  );
}
