import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { refreshSiteImages } from "@/hooks/use-site-image";
import { Image as ImageIcon, Upload, Trash2, ShieldAlert, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/site-content")({
  component: SiteContent,
});

type Row = { id: string; key: string; url: string | null; alt: string | null; label: string | null; category: string | null; updated_at: string };

function SiteContent() {
  const { loading: adminLoading, isAdmin } = useIsAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase.from("site_images").select("*").order("category").order("label");
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as Row[]);
  };

  useEffect(() => { load(); }, []);

  if (adminLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!isAdmin) return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
      <h2 className="mt-3 text-xl font-bold">Admin only</h2>
      <p className="mt-1 text-sm text-muted-foreground">Site content management is restricted to admins.</p>
    </div>
  );

  const upload = async (row: Row, file: File) => {
    setBusy(row.id);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${row.key}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("site-images").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("site-images").getPublicUrl(path);
      const { error: updErr } = await supabase.from("site_images").update({ url: pub.publicUrl }).eq("id", row.id);
      if (updErr) throw updErr;
      toast.success(`${row.label} updated`);
      refreshSiteImages();
      await load();
    } catch (e: any) { toast.error(e.message ?? "Upload failed"); }
    finally { setBusy(null); }
  };

  const reset = async (row: Row) => {
    setBusy(row.id);
    try {
      const { error } = await supabase.from("site_images").update({ url: null }).eq("id", row.id);
      if (error) throw error;
      toast.success("Reset to default");
      refreshSiteImages();
      await load();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(null); }
  };

  const saveAlt = async (row: Row, alt: string) => {
    const { error } = await supabase.from("site_images").update({ alt }).eq("id", row.id);
    if (error) toast.error(error.message); else toast.success("Caption saved");
  };

  const grouped = rows.reduce<Record<string, Row[]>>((acc, r) => {
    const k = r.category || "Other";
    (acc[k] = acc[k] || []).push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Site Content</h1>
        <p className="text-sm text-muted-foreground">Replace any image used on the public website. Changes are live immediately.</p>
      </div>

      {Object.entries(grouped).map(([cat, list]) => (
        <section key={cat}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">{cat}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => (
              <Card key={r.id} row={r} busy={busy === r.id} onUpload={(f) => upload(r, f)} onReset={() => reset(r)} onSaveAlt={(alt) => saveAlt(r, alt)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Card({ row, busy, onUpload, onReset, onSaveAlt }: { row: Row; busy: boolean; onUpload: (f: File) => void; onReset: () => void; onSaveAlt: (alt: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState(row.alt ?? "");

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="relative aspect-[16/10] bg-secondary">
        {row.url ? (
          <img src={row.url} alt={row.alt ?? ""} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <div className="text-center"><ImageIcon className="mx-auto h-8 w-8" /><div className="mt-1 text-xs">Default asset</div></div>
          </div>
        )}
        {busy && <div className="absolute inset-0 grid place-items-center bg-background/80 text-sm font-semibold">Uploading…</div>}
      </div>
      <div className="space-y-3 p-4">
        <div>
          <div className="text-sm font-bold">{row.label}</div>
          <div className="text-[11px] text-muted-foreground">key: {row.key}</div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2">
          <input value={alt} onChange={(e)=>setAlt(e.target.value)} placeholder="Alt text…" className="w-full bg-transparent py-2 text-xs outline-none" />
          <button onClick={()=>onSaveAlt(alt)} className="text-muted-foreground hover:text-primary" title="Save caption"><Save className="h-3.5 w-3.5" /></button>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e)=>{ const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
          <button onClick={()=>fileRef.current?.click()} disabled={busy} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-gradient-hero px-3 py-2 text-xs font-semibold text-primary-foreground shadow-soft disabled:opacity-60">
            <Upload className="h-3.5 w-3.5" /> Replace
          </button>
          {row.url && (
            <button onClick={onReset} disabled={busy} className="rounded-full border border-border px-3 py-2 text-muted-foreground hover:text-destructive" title="Reset to default">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}