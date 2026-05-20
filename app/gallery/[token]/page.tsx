"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Heart, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui/primitives";
import { toast } from "@/components/ui/sonner";
import { apiBaseUrl, apiNetworkErrorMessage, parseError } from "@/lib/api-client";

type PublicGalleryDetail = {
  project: {
    id: string;
    name: string;
    status: string;
    asset_count: number;
    cover_preview_url: string | null;
  };
  share_link: {
    id: string;
    status: string;
    created_at: string;
    expires_at: string | null;
    is_active: boolean;
  } | null;
  assets: {
    id: string;
    file_name: string;
    preview_url: string | null;
  }[];
  selection: {
    draft_asset_ids: string[];
    reviewer_name: string | null;
    submissions: {
      id: string;
      reviewer_name: string | null;
      selected_asset_ids: string[];
      submitted_at: string;
    }[];
  };
};

export default function PublicGalleryPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || "";
  const baseUrl = apiBaseUrl();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [detail, setDetail] = useState<PublicGalleryDetail | null>(null);
  const [error, setError] = useState("");
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [reviewerName, setReviewerName] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const run = async () => {
      setState("loading");
      try {
        const response = await fetch(`${baseUrl}/public/gallery/${token}`);
        if (!response.ok) {
          throw new Error(await parseError(response, `Unable to load gallery (${response.status})`));
        }
        const body = (await response.json()) as PublicGalleryDetail;
        if (cancelled) return;
        setDetail(body);
        setSelectedAssetIds(body.selection.draft_asset_ids || []);
        setReviewerName(body.selection.reviewer_name || "");
        setState("ready");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : apiNetworkErrorMessage(baseUrl));
          setState("error");
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, token]);

  function toggleAsset(assetId: string) {
    setSelectedAssetIds((current) => (current.includes(assetId) ? current.filter((item) => item !== assetId) : [...current, assetId]));
  }

  async function refresh() {
    const response = await fetch(`${baseUrl}/public/gallery/${token}`);
    if (!response.ok) return;
    const body = (await response.json()) as PublicGalleryDetail;
    setDetail(body);
    setSelectedAssetIds(body.selection.draft_asset_ids || []);
    setReviewerName(body.selection.reviewer_name || reviewerName);
  }

  async function saveDraft() {
    setSaving(true);
    setSuccessMessage("");
    try {
      const response = await fetch(`${baseUrl}/public/gallery/${token}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_ids: selectedAssetIds, reviewer_name: reviewerName || undefined }),
      });
      if (!response.ok) {
        throw new Error(await parseError(response, `Unable to save draft (${response.status})`));
      }
      await refresh();
      setSuccessMessage("Draft saved. You can keep refining these picks before final submit.");
      toast.success("Draft saved");
    } catch (draftError) {
      const message = draftError instanceof Error ? draftError.message : apiNetworkErrorMessage(baseUrl);
      setError(message);
      toast.error("Draft not saved", { description: message });
    } finally {
      setSaving(false);
    }
  }

  async function submitSelection() {
    setSubmitting(true);
    setSuccessMessage("");
    try {
      const response = await fetch(`${baseUrl}/public/gallery/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewer_name: reviewerName || undefined }),
      });
      if (!response.ok) {
        throw new Error(await parseError(response, `Unable to submit selection (${response.status})`));
      }
      await refresh();
      setSuccessMessage("Final picks submitted. Your studio can now move into the next delivery step.");
      toast.success("Selection submitted");
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : apiNetworkErrorMessage(baseUrl);
      setError(message);
      toast.error("Submission failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  if (state === "loading") {
    return <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6"><LoadingSkeleton lines={10} /></main>;
  }

  if (state === "error" || !detail) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-12 sm:px-6">
        <ErrorState detail={error || "Unable to open this gallery."} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-28 text-foreground lg:pb-0">
      <section className="border-b border-border bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.02),transparent)]">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <ShieldCheck className="size-3.5" />
                Secure gallery review
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{detail.project.name}</h1>
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Pick favorites on any device, save a draft as you go, and send the final selection back to the studio when you’re ready.
              </p>
            </div>
            <div className="grid min-w-full gap-3 sm:grid-cols-3 lg:min-w-[22rem]">
              <div className="rounded-2xl border border-border bg-background/75 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Assets</p>
                <p className="mt-2 text-2xl font-semibold">{detail.project.asset_count}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/75 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Draft picks</p>
                <p className="mt-2 text-2xl font-semibold">{selectedAssetIds.length}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/75 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Submissions</p>
                <p className="mt-2 text-2xl font-semibold">{detail.selection.submissions.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:px-8">
        <aside className="space-y-6">
          <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold">Who is reviewing?</p>
            <p className="mt-1 text-sm text-muted-foreground">Adding a name helps the studio connect this selection to the right client thread.</p>
            <Input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Client or reviewer name" className="mt-4 min-h-11 rounded-xl" />
          </div>

          <div className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold">Selection rhythm</p>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Heart className="mt-0.5 size-4 text-primary" /> Tap the frames you love to keep building the shortlist.</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 text-primary" /> Save a draft anytime before sending the final picks.</li>
              <li className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 text-primary" /> This link only exposes this gallery, not the whole studio.</li>
            </ul>
            {successMessage ? <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{successMessage}</p> : null}
            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
          </div>

          <div className="hidden rounded-[28px] border border-border bg-card p-5 shadow-sm lg:block">
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="min-h-11 flex-1 rounded-full" onClick={saveDraft} disabled={saving}>
                {saving ? "Saving…" : "Save draft"}
              </Button>
              <Button type="button" className="min-h-11 flex-1 rounded-full" onClick={submitSelection} disabled={submitting || selectedAssetIds.length === 0}>
                {submitting ? "Submitting…" : "Submit picks"}
              </Button>
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          {detail.assets.length === 0 ? (
            <EmptyState title="Gallery not ready" detail="The studio has not uploaded the review images yet." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {detail.assets.map((asset) => {
                const selected = selectedAssetIds.includes(asset.id);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => toggleAsset(asset.id)}
                    className={selected ? "overflow-hidden rounded-[26px] border border-primary bg-primary/5 p-3 text-left shadow-sm transition" : "overflow-hidden rounded-[26px] border border-border bg-card p-3 text-left shadow-sm transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-lg"}
                  >
                    {asset.preview_url ? (
                      <img src={asset.preview_url} alt={asset.file_name} className="aspect-[4/3] w-full rounded-[20px] border border-border object-cover" />
                    ) : (
                      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[20px] border border-dashed border-border bg-muted text-xs text-muted-foreground">
                        Preview becomes available when storage is configured
                      </div>
                    )}
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{asset.file_name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Tap to {selected ? "remove" : "add"} from your picks</p>
                      </div>
                      <span className={selected ? "inline-flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground" : "inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground"}>
                        <Heart className="size-4" fill={selected ? "currentColor" : "none"} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <div className="fixed inset-x-3 bottom-3 z-30 flex gap-3 rounded-2xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur lg:hidden">
        <Button type="button" variant="outline" className="min-h-12 flex-1 rounded-full" onClick={saveDraft} disabled={saving}>
          {saving ? "Saving…" : "Save draft"}
        </Button>
        <Button type="button" className="min-h-12 flex-1 rounded-full" onClick={submitSelection} disabled={submitting || selectedAssetIds.length === 0}>
          {submitting ? "Submitting…" : "Submit picks"}
        </Button>
      </div>

      <footer className="border-t border-border px-4 py-10 text-center text-sm text-muted-foreground sm:px-6">
        <p>Need the fully managed studio review space instead? Ask your photographer to invite you into the private client portal.</p>
        <Link href="/login" className="mt-3 inline-flex items-center gap-2 font-semibold text-primary">
          Open invited client sign in
        </Link>
      </footer>
    </main>
  );
}
