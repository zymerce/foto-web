import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <Link href="/" className="text-sm text-primary hover:underline">← Back to home</Link>
      <h1 className="mt-8 text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-6 text-sm text-muted-foreground">Last updated: May 19, 2026</p>
      
      <div className="mt-12 space-y-8 text-lg leading-relaxed">
        <section>
          <h2 className="text-2xl font-semibold">1. Information We Collect</h2>
          <p className="mt-4">
            We collect information you provide directly to us, such as when you create an account, 
            upload photos, or communicate with us for support.
          </p>
        </section>
        
        <section>
          <h2 className="text-2xl font-semibold">2. How We Use Your Information</h2>
          <p className="mt-4">
            We use the information we collect to provide, maintain, and improve our services, 
            including storage and delivery of your professional photography projects.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">3. Data Security</h2>
          <p className="mt-4">
            We take reasonable measures to help protect information about you from loss, theft, 
            misuse, and unauthorized access. Photos are stored securely using industry-standard 
            encryption.
          </p>
        </section>
      </div>
    </main>
  );
}
