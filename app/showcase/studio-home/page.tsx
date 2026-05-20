const projects = [
  { name: "Aarav & Meera Wedding", status: "Client picks submitted", assets: 428, team: 2, clients: 1, tone: "from-rose-300/70 via-amber-100 to-orange-200/80" },
  { name: "House of Linen Campaign", status: "Share link live", assets: 162, team: 1, clients: 3, tone: "from-cyan-200/80 via-sky-100 to-blue-200/80" },
  { name: "Monsoon Portrait Series", status: "Upload in progress", assets: 84, team: 1, clients: 1, tone: "from-emerald-200/80 via-lime-100 to-teal-200/80" },
];

export default function ShowcaseStudioHomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_30%),linear-gradient(180deg,#f8fafc,#f4f6f8)] px-8 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl rounded-[36px] border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/60 backdrop-blur">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Studio Home</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">Lead with the work, not the wiring.</h1>
            <p className="mt-3 text-base text-slate-600">Recent shoots, upload exceptions, and client readiness sit in one visual workspace so the studio feels active the moment you sign in.</p>
          </div>
          <div className="rounded-[28px] border border-teal-100 bg-teal-50 p-5 text-left shadow-sm">
            <p className="text-xs uppercase tracking-[0.18em] text-teal-700">Growth Hook</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">Free Plan · 2/2 Projects Used</p>
            <p className="mt-2 text-sm text-slate-600">Upgrade to Pro for more active projects, bigger upload runs, and a smoother delivery cadence.</p>
          </div>
        </div>
        <section className="mt-8 grid gap-5 xl:grid-cols-3">
          {projects.map((project) => (
            <article key={project.name} className="rounded-[30px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className={`aspect-[4/3] rounded-[22px] bg-gradient-to-br ${project.tone}`} />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold tracking-tight">{project.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{project.status}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">active</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-500">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="uppercase tracking-[0.18em]">Assets</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{project.assets}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="uppercase tracking-[0.18em]">Team</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{project.team}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="uppercase tracking-[0.18em]">Clients</p>
                  <p className="mt-1 text-base font-semibold text-slate-900">{project.clients}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
