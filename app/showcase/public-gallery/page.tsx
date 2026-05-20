const frames = ["from-rose-200/80 to-orange-100", "from-cyan-200/80 to-sky-100", "from-emerald-200/80 to-lime-100", "from-fuchsia-200/80 to-rose-100", "from-amber-200/80 to-yellow-100", "from-blue-200/80 to-indigo-100"];

export default function ShowcasePublicGalleryPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-8 py-8 text-slate-900">
      <div className="mx-auto max-w-6xl rounded-[36px] border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/60">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Secure Gallery Review</span>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight">A private, low-friction review surface for clients.</h1>
            <p className="mt-3 text-base text-slate-600">Clients can keep tapping favorites, save a draft, and send the final shortlist back to the studio without leaving the visual flow.</p>
          </div>
          <div className="grid min-w-[18rem] grid-cols-3 gap-3">
            {[
              ["Assets", "428"],
              ["Draft picks", "36"],
              ["Submitted", "1"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <section className="mt-8 grid gap-5 xl:grid-cols-3">
          {frames.map((tone, idx) => (
            <article key={idx} className={`rounded-[28px] border ${idx < 2 ? "border-teal-300 bg-teal-50/60" : "border-slate-200 bg-white"} p-3 shadow-sm`}>
              <div className={`aspect-[4/3] rounded-[20px] bg-gradient-to-br ${tone}`} />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Frame_{idx + 1}.jpg</p>
                  <p className="mt-1 text-xs text-slate-500">Tap to add to final picks</p>
                </div>
                <span className={`inline-flex size-9 items-center justify-center rounded-full ${idx < 2 ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-400"}`}>♥</span>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
