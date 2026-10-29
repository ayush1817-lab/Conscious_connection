"use client";

import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { saveArea } from "@/app/admin/(app)/content/actions";
import { IMAGE_TARGETS } from "@/lib/content/images";
import type { Area, ContentPage, SectionDef } from "@/lib/content/sections";
import { FormError, SaveButton, UnsavedNote } from "./form-bits";
import { ImagePicker } from "./image-picker";
import { PreviewPane } from "./preview-pane";
import { TextEditor } from "./text-editor";
import { useUnsavedChanges } from "./use-unsaved-changes";

export type Draft = { heading: string; body: string; image_path: string | null; image_alt: string };
type EditorArea = Area & { defs: SectionDef[] };

const input = "min-h-tap w-full rounded-control border border-control-border bg-surface px-3";

const same = (a: Draft, b: Draft) => a.heading === b.heading && a.body === b.body && a.image_path === b.image_path && a.image_alt === b.image_alt;

// A8 Website content: the parts of one page, numbered in page order, beside a
// live preview of the real page. Opening a part highlights it in the preview,
// and clicking a part in the preview opens it here. Each part has its own Save.
export function PageEditor({
  page,
  areas,
  initial,
  live,
}: {
  page: ContentPage;
  areas: EditorArea[];
  initial: Record<string, Draft>;
  live: string | Record<string, string>;
}) {
  const [drafts, setDrafts] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [open, setOpen] = useState<string | null>(areas[0]?.key ?? null);
  const [shownPage, setShownPage] = useState(areas[0]?.key ?? "");
  const listRef = useRef<HTMLOListElement>(null);

  const isDirty = (area: EditorArea) => area.defs.some((d) => !same(drafts[d.key], saved[d.key]));
  useUnsavedChanges(areas.some(isDirty));

  const change = useCallback((key: string, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [key]: { ...d[key], ...patch } })), []);

  function openArea(key: string | null, scroll = false) {
    setOpen(key);
    if (key && typeof live !== "string") setShownPage(key);
    if (key && scroll) {
      requestAnimationFrame(() => listRef.current?.querySelector(`[data-editor-area="${key}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  const liveHref = typeof live === "string" ? live : live[shownPage] ?? "/";

  return (
    <div className="content-editor">
      <div className="content-editor-list">
        <p className="content-editor-help">
          Each numbered part matches the number on the preview. Open a part to change it, or click it in the preview. Nothing changes on the website until you press Save.
        </p>
        <ol ref={listRef} className="space-y-3">
          {areas.map((area, i) => (
            <AreaCard
              key={area.key}
              n={i + 1}
              page={page}
              area={area}
              drafts={drafts}
              open={open === area.key}
              dirty={isDirty(area)}
              onToggle={() => openArea(open === area.key ? null : area.key)}
              onFocus={() => open !== area.key && openArea(area.key)}
              onChange={change}
              onSaved={() => setSaved((s) => ({ ...s, ...Object.fromEntries(area.defs.map((d) => [d.key, drafts[d.key]])) }))}
            />
          ))}
        </ol>
      </div>
      <PreviewPane page={page} drafts={drafts} active={open} liveHref={liveHref} onPick={(key) => openArea(key, true)} />
    </div>
  );
}

function AreaCard({
  n,
  page,
  area,
  drafts,
  open,
  dirty,
  onToggle,
  onFocus,
  onChange,
  onSaved,
}: {
  n: number;
  page: ContentPage;
  area: EditorArea;
  drafts: Record<string, Draft>;
  open: boolean;
  dirty: boolean;
  onToggle: () => void;
  onFocus: () => void;
  onChange: (key: string, patch: Partial<Draft>) => void;
  onSaved: () => void;
}) {
  const action = useMemo(() => saveArea.bind(null, page, area.key), [page, area.key]);
  const [state, formAction] = useActionState(action, {});
  const id = useId();

  // Once saved, these values are the new starting point.
  const savedAt = useRef(state.savedAt);
  useEffect(() => {
    if (state.savedAt && state.savedAt !== savedAt.current) {
      savedAt.current = state.savedAt;
      onSaved();
    }
  }, [state.savedAt, onSaved]);

  return (
    <li data-editor-area={area.key} className="scroll-mt-4">
      <section aria-labelledby={`${id}-title`} className={`area-card ${open ? "is-open" : ""}`}>
        {/* The whole bar opens the part; only the title is the button's name. */}
        <div className="area-card-head">
          <span aria-hidden className="area-num">
            {n}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="m-0 font-heading text-lg font-semibold">
              <button type="button" id={`${id}-title`} aria-expanded={open} aria-controls={`${id}-body`} aria-describedby={`${id}-hint`} onClick={onToggle} className="area-card-toggle">
                {area.title}
              </button>
            </h2>
            <p id={`${id}-hint`} className="text-sm text-muted">
              {area.hint}
              {dirty ? <span className="sr-only"> This part has unsaved changes.</span> : null}
            </p>
          </div>
          {dirty ? (
            <span aria-hidden className="area-unsaved">
              Unsaved
            </span>
          ) : null}
          <svg aria-hidden viewBox="0 0 24 24" className="area-chevron">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        <div id={`${id}-body`} hidden={!open}>
          {open ? (
            <form action={formAction} onFocus={onFocus} className="area-card-body space-y-5">
              {area.defs.map((def) => (
                <SectionFields key={def.key} def={def} draft={drafts[def.key]} grouped={area.defs.length > 1} onChange={(patch) => onChange(def.key, patch)} />
              ))}
              <FormError error={state.error} />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <SaveButton dirty={dirty} />
                <UnsavedNote dirty={dirty} />
              </div>
            </form>
          ) : null}
        </div>
      </section>
    </li>
  );
}

// The fields of one section. Sections with several fields get a box and a title.
function SectionFields({ def, draft, grouped, onChange }: { def: SectionDef; draft: Draft; grouped: boolean; onChange: (patch: Partial<Draft>) => void }) {
  const id = useId();
  const name = (field: string) => `${def.key}.${field}`;
  const fieldCount = (def.heading !== "none" ? 1 : 0) + (def.body ? 1 : 0) + (def.image ? 1 : 0);
  const imageLabel = def.imageLabel ?? "Image";

  const fields = (
    <>
      {def.heading !== "none" ? (
        <div>
          <label htmlFor={`${id}-heading`} className="mb-1 block font-medium">
            {def.headingLabel ?? (def.heading === "optional" ? "Heading (optional)" : "Heading")}
          </label>
          <input
            id={`${id}-heading`}
            name={name("heading")}
            value={draft.heading}
            maxLength={150}
            onChange={(e) => onChange({ heading: e.target.value })}
            aria-describedby={def.headingHint ? `${id}-heading-hint` : undefined}
            className={input}
          />
          {def.headingHint ? (
            <p id={`${id}-heading-hint`} className="mt-1 text-sm text-muted">
              {def.headingHint}
            </p>
          ) : null}
        </div>
      ) : null}
      {def.body && def.bodyKind === "line" ? (
        <div>
          <label htmlFor={`${id}-body`} className="mb-1 block font-medium">
            {def.bodyLabel ?? "Text"}
          </label>
          <input id={`${id}-body`} name={name("body")} value={draft.body} maxLength={150} onChange={(e) => onChange({ body: e.target.value })} className={input} />
        </div>
      ) : null}
      {def.body && def.bodyKind === "lines" ? (
        <div>
          <label htmlFor={`${id}-body`} className="mb-1 block font-medium">
            {def.bodyLabel ?? "Items (one per line)"}
          </label>
          <textarea
            id={`${id}-body`}
            name={name("body")}
            value={draft.body}
            rows={8}
            maxLength={3000}
            onChange={(e) => onChange({ body: e.target.value })}
            aria-describedby={`${id}-body-hint`}
            className="block w-full resize-y rounded-control border border-control-border bg-surface px-3 py-2"
          />
          <p id={`${id}-body-hint`} className="mt-1 text-sm text-muted">
            {def.bodyHint}
          </p>
        </div>
      ) : null}
      {def.body && (!def.bodyKind || def.bodyKind === "rich") ? (
        <div>
          <TextEditor
            label={def.bodyLabel ?? "Text"}
            name={name("body")}
            value={draft.body}
            onChange={(body) => onChange({ body })}
            rows={def.maxBody ? 16 : def.blocks ? 12 : 4}
            maxLength={def.maxBody ?? 3000}
          />
          {def.bodyHint ? <p className="mt-1 text-sm text-muted">{def.bodyHint}</p> : null}
        </div>
      ) : null}
      {def.image ? (
        <ImagePicker
          label={imageLabel}
          hint={def.imageHint}
          name={name("image_path")}
          target={IMAGE_TARGETS.sections}
          value={draft.image_path}
          onChange={(image_path) => onChange({ image_path })}
        />
      ) : null}
      {def.image && draft.image_path ? (
        <div>
          <label htmlFor={`${id}-alt`} className="mb-1 block font-medium">
            Describe the image
          </label>
          <input
            id={`${id}-alt`}
            name={name("image_alt")}
            value={draft.image_alt}
            maxLength={300}
            onChange={(e) => onChange({ image_alt: e.target.value })}
            aria-describedby={`${id}-alt-hint`}
            className={input}
          />
          <p id={`${id}-alt-hint`} className="mt-1 text-sm text-muted">
            For people who use screen readers, e.g. &ldquo;A group walking along a forest path in autumn&rdquo;.
          </p>
        </div>
      ) : null}
    </>
  );

  if (grouped && fieldCount > 1) {
    return (
      <fieldset className="area-group space-y-4">
        <legend className="area-group-title">{def.title}</legend>
        {def.hint ? <p className="-mt-2 text-sm text-muted">{def.hint}</p> : null}
        {fields}
      </fieldset>
    );
  }
  return <div className="space-y-4">{fields}</div>;
}
