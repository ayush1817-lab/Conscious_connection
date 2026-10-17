"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { createStoryImageUpload, submitStory, type StoryState } from "@/app/(public)/stories/share/actions";
import { STORY_LIMITS } from "@/lib/public/story-form";
import { buttonClass } from "@/components/ui/button";
import { ConsentField, FormAlert, Honeypot, InputField, TextAreaField } from "./forms/fields";
import { useFocusFirstError } from "./forms/use-focus-first-error";
import { CheckCircleIcon } from "./icons";
import { PosterUpload } from "./poster-upload";

// "Share your story". After sending, the form is replaced by a confirmation.
export function StoryForm() {
  const [state, formAction, pending] = useActionState<StoryState, FormData>(submitStory, {});
  const formRef = useRef<HTMLFormElement>(null);
  const v = state.values;
  const e = state.fieldErrors ?? {};
  const [anonymous, setAnonymous] = useState(v?.anonymous ?? false);
  useFocusFirstError(formRef, state);

  if (state.done) return <Sent />;

  return (
    <form ref={formRef} key={JSON.stringify(v ?? null)} action={formAction} noValidate className="relative space-y-6">
      {state.error ? <FormAlert>{state.error}</FormAlert> : null}
      <InputField id="title" label="Title" required maxLength={STORY_LIMITS.title} placeholder="e.g. Finding my people in Leitrim" defaultValue={v?.title} error={e.title} />
      <TextAreaField
        id="body"
        label="Your story"
        required
        rows={12}
        maxLength={STORY_LIMITS.body}
        hint="Write it in your own words. Leave a blank line between paragraphs."
        defaultValue={v?.body}
        error={e.body}
      />
      <PosterUpload
        defaultPath={v?.image_path ?? ""}
        error={e.image_path}
        name="image_path"
        label="A photo to go with it"
        hint="JPG, PNG or WebP. Please only share photos you took, and ask anyone in them first."
        bucket="content"
        noun="image"
        requestUpload={createStoryImageUpload}
      />
      <fieldset className="space-y-4 rounded-card border border-border bg-surface p-5">
        <legend className="px-1 font-heading text-lg font-semibold">About you</legend>
        <div className="flex items-start gap-3">
          <input
            id="anonymous"
            name="anonymous"
            type="checkbox"
            value="yes"
            defaultChecked={anonymous}
            onChange={(ev) => setAnonymous(ev.target.checked)}
            className="mt-0.5 h-6 w-6 shrink-0 accent-primary"
          />
          <label htmlFor="anonymous" className="min-h-tap">
            Publish my story anonymously
          </label>
        </div>
        {anonymous ? null : (
          <InputField
            id="author_name"
            label="Name to show with your story"
            maxLength={STORY_LIMITS.name}
            autoComplete="given-name"
            hint="A first name or nickname is fine. Leave it empty to stay anonymous."
            defaultValue={v?.author_name}
            error={e.author_name}
          />
        )}
        <InputField
          id="email"
          label="Your email"
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          inputMode="email"
          hint="Never shown. We only use it to follow up about your story, and delete it 30 days after we've decided."
          defaultValue={v?.email}
          error={e.email}
        />
      </fieldset>
      <p className="text-muted">
        Our team reads every story before it&apos;s published and may make small edits for length or privacy.{" "}
        <Link href="/privacy" className="font-medium text-primary underline underline-offset-4">
          Privacy
        </Link>
      </p>
      <ConsentField id="consent" defaultChecked={v?.consent} error={e.consent}>
        I agree to Conscious Connections publishing my story on its website.
      </ConsentField>
      <Honeypot />
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className="inline-flex min-h-tap w-full items-center justify-center gap-2 rounded-control bg-primary px-6 font-medium text-on-primary hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {pending ? (
          <>
            <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
            Sending…
          </>
        ) : (
          "Send my story"
        )}
      </button>
    </form>
  );
}

function Sent() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "start" });
    ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div ref={ref} tabIndex={-1} role="status" className="rounded-card border-2 border-success bg-surface p-6 focus:outline-none md:p-8">
      <CheckCircleIcon size={40} className="text-success" />
      <h2 className="mt-3 font-heading text-2xl font-semibold">Story sent</h2>
      <p className="mt-2 text-lg">
        Thank you for sharing your story. Our team will read it and email you once we&apos;ve reviewed it.
      </p>
      <p className="mt-4 rounded-card bg-private p-4">We&apos;ve sent you a confirmation email. Please check your spam folder if you don&apos;t see it.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/stories" className={buttonClass("primary")}>
          Read more stories
        </Link>
      </div>
    </div>
  );
}
