export default function ShowcaseHelperPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.18),transparent_30%),linear-gradient(180deg,#0f172a,#111827)] px-8 py-8 text-white">
      <div className="mx-auto max-w-5xl rounded-[34px] border border-white/10 bg-slate-900/90 p-8 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-teal-300">Desktop Helper</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Large upload runs without the browser drama.</h1>
          </div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">Connected</span>
        </div>
        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <section className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div>
              <p className="text-sm font-semibold">Studio context</p>
              <p className="mt-1 text-sm text-slate-300">House of Linen · Campaign Delivery</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Folder</p>
              <p className="mt-2 text-sm text-white">2026/Campaign_Selects/Final_JPEGS</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                ["Files", "428"],
                ["Uploaded", "416"],
                ["Failed", "2"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="space-y-3 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold">Upload queue</p>
            {[
              ["hero-shot-001.jpg", "Uploaded"],
              ["hero-shot-002.jpg", "Uploading"],
              ["hero-shot-003.jpg", "Uploaded"],
              ["hero-shot-004.jpg", "Retry needed"],
            ].map(([name, status]) => (
              <div key={name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm">
                <span className="truncate text-slate-200">{name}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status === "Uploaded" ? "bg-emerald-400/10 text-emerald-300" : status === "Uploading" ? "bg-teal-400/10 text-teal-300" : "bg-amber-400/10 text-amber-300"}`}>{status}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
