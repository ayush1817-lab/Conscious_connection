import { Doodle } from "@/components/public/doodles";
import { Illustration, type IllustrationName } from "@/components/public/illustrations";
import { Eyebrow } from "@/components/public/section-heading";

// The top of an admin page, styled like the website's page intros: a small
// label, the title, a line of help and an optional drawing.
export function AdminPageHeader({
  eyebrow,
  title,
  children,
  illustration,
  actions,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  illustration?: IllustrationName;
  actions?: React.ReactNode;
}) {
  return (
    <div className="admin-page-header">
      <div className="admin-page-header-copy">
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h1 className="font-heading text-3xl font-semibold md:text-4xl">{title}</h1>
        {children ? <div className="mt-2 text-lg text-muted">{children}</div> : null}
      </div>
      {actions ? <div className="admin-page-header-actions">{actions}</div> : null}
      {illustration ? (
        <div className="admin-page-header-art" aria-hidden>
          <Illustration name={illustration} />
          <Doodle name="sparkle" tone="orchid" className="page-intro-spark" />
        </div>
      ) : null}
    </div>
  );
}
