// Carries a just-created private host link from the approve action to A5.
// httpOnly, scoped to that one page, and gone after 10 minutes.
export function hostLinkCookie(eventId: string) {
  return {
    name: "cc_host_link",
    options: {
      path: `/admin/events/${eventId}/approved`,
      maxAge: 600,
      httpOnly: true,
      sameSite: "strict" as const,
      secure: process.env.NODE_ENV === "production",
    },
  };
}
