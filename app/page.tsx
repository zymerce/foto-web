/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { ArrowRight, Heart, Palette, ShieldCheck, Sparkles, UploadCloud, Zap } from "lucide-react";

const primaryCtaClass =
  "inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const secondaryCtaClass =
  "inline-flex items-center justify-center rounded-full border border-border bg-card px-8 py-4 text-base font-semibold text-foreground shadow-sm transition hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export default function Home() {
  return (
    <main className="bg-background text-foreground antialiased">
      <section className="relative overflow-hidden pt-20 pb-16 sm:pt-32 sm:pb-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent_36%),radial-gradient(circle_at_85%_10%,color-mix(in_oklch,var(--color-foreground)_5%,transparent),transparent_32%)]" aria-hidden="true" />

        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <header className="mx-auto max-w-4xl text-center">
            <div className="mb-8 flex justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium tracking-wide text-primary ring-1 ring-inset ring-primary/20">
                <Sparkles className="size-4" />
                Closed Beta · Studio-first delivery workflow
              </span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-7xl">
              Deliver polished client galleries with <span className="text-primary">less operational drag.</span>
            </h1>
            <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
              fotoz.io gives photographers a project-first studio workspace, a Helper app for large uploads, and two honest review paths: secure share links for fast feedback and invited private galleries for tracked selections.
            </p>
            <nav className="mt-10 flex flex-wrap items-center justify-center gap-4" aria-label="Hero navigation">
              <Link className={primaryCtaClass} href="/signup">
                Start your studio <ArrowRight aria-hidden="true" className="ml-2 size-5" />
              </Link>
              <Link className={secondaryCtaClass} href="/pricing">
                View pricing plans
              </Link>
            </nav>
          </header>

          <div className="mt-16 flow-root sm:mt-24">
            <div className="rounded-[2rem] border border-border/70 bg-card/70 p-3 shadow-2xl shadow-primary/10 ring-1 ring-inset ring-white/10 backdrop-blur">
              <img
                src="/marketing/studio-home.png"
                alt="fotoz.io studio home with recent project cards and plan growth hook"
                className="w-full rounded-[1.5rem] border border-border object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30 py-12" aria-labelledby="trust-banner-heading">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 id="trust-banner-heading" className="text-center text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            Built for photographers who want client delivery to feel premium, not patched together
          </h2>
        </div>
      </section>

      <section className="py-24 sm:py-32" aria-labelledby="features-heading">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <header className="mx-auto max-w-2xl text-center">
            <h2 id="features-heading" className="text-base font-semibold leading-7 text-primary">Built for real delivery work</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              The parts that matter are connected now.
            </p>
          </header>

          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10" aria-hidden="true">
                    <Zap className="size-6 text-primary" />
                  </div>
                  Project-first studio home
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">
                    See recent shoots, upload health, client readiness, and plan pressure from the first screen instead of managing your studio through a wall of stats.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10" aria-hidden="true">
                    <UploadCloud className="size-6 text-primary" />
                  </div>
                  Helper-powered upload flow
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">
                    The desktop Helper app handles large upload runs with project-scoped sessions, direct storage uploads, and visible progress instead of asking the browser to pretend it’s a file-ingestion engine.
                  </p>
                </dd>
              </div>
              <div className="flex flex-col">
                <dt className="flex items-center gap-x-3 text-lg font-semibold leading-7">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10" aria-hidden="true">
                    <Heart className="size-6 text-primary" />
                  </div>
                  Dual client review model
                </dt>
                <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-muted-foreground">
                  <p className="flex-auto">
                    Use secure share links for low-friction review, or invite clients into the private gallery flow when the studio needs tracked identities, draft saves, and final submissions.
                  </p>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="bg-card py-24 sm:py-32" aria-labelledby="review-model-heading">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <article className="rounded-[2rem] border border-border bg-background p-4 shadow-sm">
              <img src="/marketing/gallery-review.png" alt="Secure gallery review surface with image cards and selection actions" className="w-full rounded-[1.5rem] border border-border object-cover" />
              <div className="mt-6 flex items-start gap-3">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span>
                <div>
                  <h3 id="review-model-heading" className="text-xl font-semibold tracking-tight">Secure share links for fast review</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    Send a lightweight gallery link when you want clients to start reviewing immediately on any device. They can save a draft, submit final picks, and stay inside one clean visual flow.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-border bg-background p-4 shadow-sm">
              <img src="/marketing/helper-upload.png" alt="Helper desktop interface showing upload queue and project context" className="w-full rounded-[1.5rem] border border-border object-cover" />
              <div className="mt-6 flex items-start gap-3">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Palette className="size-5" /></span>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">A calmer upload experience for the studio team</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    The Helper app mirrors the studio’s visual language, keeps queue state visible, and gives photographers a clearer sense of what is uploaded, retrying, or ready for delivery.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32" aria-labelledby="workflow-heading">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 id="workflow-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                One truthful V1 workflow, start to finish.
              </h2>
              <dl className="mt-10 space-y-10">
                <div className="relative pl-9">
                  <dt className="inline font-semibold text-foreground">
                    <div aria-hidden="true" className="absolute top-1 left-0 flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">1</div>
                    Create the project.
                  </dt>
                  <dd className="mt-2 text-muted-foreground">
                    Sign up as a studio owner, create a project, and assign the photographer and client access from the same operational surface.
                  </dd>
                </div>
                <div className="relative pl-9">
                  <dt className="inline font-semibold text-foreground">
                    <div aria-hidden="true" className="absolute top-1 left-0 flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</div>
                    Sync the shoot.
                  </dt>
                  <dd className="mt-2 text-muted-foreground">
                    Launch Helper from the project, push the images into Cloudflare R2, and watch the queue move instead of hoping the browser survives the upload.
                  </dd>
                </div>
                <div className="relative pl-9">
                  <dt className="inline font-semibold text-foreground">
                    <div aria-hidden="true" className="absolute top-1 left-0 flex size-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">3</div>
                    Review and finish.
                  </dt>
                  <dd className="mt-2 text-muted-foreground">
                    Share a secure link for quick feedback or invite the client into the private gallery flow for tracked selections and final submission history.
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="rounded-[1.5rem] border border-border bg-background p-6">
                <h3 className="text-xl font-semibold tracking-tight">What V1 is honest about</h3>
                <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
                  <li className="flex gap-3"><ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" /> Studio onboarding, project-based delivery, Helper-assisted upload, invited client review, secure share links, and basic billing.</li>
                  <li className="flex gap-3"><ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" /> Not promising enterprise-grade public galleries, deep analytics, or self-serve complexity that the product is not ready to carry yet.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 sm:py-32" aria-labelledby="pricing-teaser-heading">
        <div className="mx-auto max-w-7xl px-6 text-center lg:px-8">
          <h2 id="pricing-teaser-heading" className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Simple pricing, honest scope.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free with 2 active projects. Upgrade to Pro for ₹1,499/mo when your studio is ready for higher limits and a smoother delivery rhythm.
          </p>
          <div className="mt-10">
            <Link href="/pricing" className="text-sm font-semibold leading-6 text-primary hover:text-primary/80">
              View detailed pricing plans <ArrowRight aria-hidden="true" className="inline size-4 align-text-bottom" />
            </Link>
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden bg-primary px-6 py-24 sm:py-32 lg:px-8" aria-labelledby="cta-heading">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,var(--color-primary-foreground)/10,transparent)] opacity-20" aria-hidden="true" />
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="cta-heading" className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
            Ready to run your next shoot through fotoz.io?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-primary-foreground/80">
            Bring one studio into the closed beta, move a real project through the full workflow, and let the product earn wider trust from there.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-full bg-primary-foreground px-8 py-4 text-base font-semibold text-primary shadow-sm hover:bg-primary-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground"
            >
              Start your studio
            </Link>
            <Link href="/pricing" className="text-sm font-semibold leading-6 text-primary-foreground">
              See pricing <ArrowRight aria-hidden="true" className="inline size-4 align-text-bottom" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-background py-12">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              &copy; 2026 foto.io. All rights reserved.
            </p>
            <nav className="flex gap-x-6 text-xs text-muted-foreground" aria-label="Footer navigation">
              <Link href="/about" className="hover:text-foreground">About foto.io</Link>
              <Link href="/pricing" className="hover:text-foreground">Pricing plans</Link>
              <Link href="/privacy" className="hover:text-foreground">Privacy policy</Link>
              <Link href="/terms" className="hover:text-foreground">Terms of service</Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
