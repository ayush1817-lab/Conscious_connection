import { AdminPageHeader } from "@/components/admin/page-header";
import { ContentTabs } from "@/components/content/content-tabs";
import { requireAdmin } from "@/lib/auth/admin";

// A8 – Website content: a tab per part of the public site.
export default async function ContentLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <AdminPageHeader eyebrow="Website content" title="Edit the website">
        Pick a page, then change its words and photos. The preview shows how the page will look. Changes go live as soon as you save.
      </AdminPageHeader>
      <ContentTabs />
      {children}
    </div>
  );
}
