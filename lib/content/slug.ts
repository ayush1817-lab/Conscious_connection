// "Finding my people in Leitrim!" -> "finding-my-people-in-leitrim"
export function slugify(title: string) {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "story"
  );
}
