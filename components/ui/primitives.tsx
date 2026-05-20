import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3">
      {eyebrow ? <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </article>
  );
}

export function ActionList({ items }: { items: { href: string; label: string; hint?: string }[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <Link key={item.href + item.label} href={item.href} className="rounded-xl border border-border bg-background px-4 py-3 transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
          <p className="text-sm font-medium">{item.label}</p>
          {item.hint ? <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p> : null}
        </Link>
      ))}
    </div>
  );
}

export function EmptyState({ title, detail, cta }: { title: string; detail: string; cta?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      {cta ? <div className="mt-4">{cta}</div> : null}
    </div>
  );
}

export function ErrorState({ detail, className }: { detail: string; className?: string }) {
  return <p className={cn("rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive", className)}>{detail}</p>;
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }).map((_, idx) => (
        <div key={idx} className="h-4 w-full animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}
