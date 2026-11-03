import { useEffect, useRef, useState } from "react";

/** Renders a generated DOCX (via docx-preview) or PDF (native viewer) blob. */
export function DocPreview({ blob, fileType }: { blob: Blob | null; fileType: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) return;
    if (fileType === "pdf") {
      const u = URL.createObjectURL(blob);
      setUrl(u);
      return () => URL.revokeObjectURL(u);
    }
    let cancelled = false;
    (async () => {
      const { renderAsync } = await import("docx-preview");
      if (cancelled || !ref.current) return;
      ref.current.innerHTML = "";
      await renderAsync(blob, ref.current, undefined, { inWrapper: true, ignoreLastRenderedPageBreak: true });
    })();
    return () => { cancelled = true; };
  }, [blob, fileType]);

  if (!blob) return <div className="grid h-[70vh] place-items-center rounded-xl border text-sm text-muted-foreground">Preview appears here</div>;
  if (fileType === "pdf") return url ? <iframe title="Preview" src={url} className="h-[70vh] w-full rounded-xl border" /> : null;
  return <div ref={ref} className="h-[70vh] overflow-auto rounded-xl border bg-muted" />;
}
