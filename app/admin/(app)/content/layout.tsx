import { ContentTabs } from "@/components/content/content-tabs";
import { requireAdmin } from "@/lib/auth/admin";

// A8 – Website content: a tab per part of the public site.
export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Website content</h1>
        <p className="mt-1 text-muted">Changes go live on the website as soon as you save.</p>
      </div>
      <ContentTabs />
      {children}
    </div>
  );
}
