// Carries a just-created private host link from an action to the one page
// that shows it (A5 after approving, or the new-link page after regenerating).
// httpOnly, scoped to that page, and gone after 10 minutes.
export function hostLinkCookie(eventId: string, page: "approved" | "new-host-link" = "approved") {
  return {
    name: "cc_host_link",
    options: {
      path: `/admin/events/${eventId}/${page}`,
      maxAge: 600,
      httpOnly: true,
      sameSite: "strict" as const,
      secure: process.env.NODE_ENV === "production",
    },
  };
}

export function readHostLinkCookie(raw: string | undefined): { token: string; emailed: boolean } | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value.token === "string" ? { token: value.token, emailed: value.emailed !== false } : null;
  } catch {
    return null;
  }
}
