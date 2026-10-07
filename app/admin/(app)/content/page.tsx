import Link from "next/link";

// A8 – Website content (built in milestone 6).
export default function ContentPage() {
  return (
    <div className="py-8">
      <h1 className="text-2xl font-semibold">Website content</h1>
      <p className="mt-2 text-muted">Editing the homepage, stories, podcasts, gallery and about page is coming soon.</p>
      <Link href="/admin" className="mt-4 inline-block py-2 text-primary underline underline-offset-4">
        Back to admin home
      </Link>
    </div>
  );
}
