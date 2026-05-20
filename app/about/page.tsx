import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-20">
      <Link href="/" className="text-sm text-primary hover:underline">← Back to home</Link>
      <h1 className="mt-8 text-4xl font-bold tracking-tight">About foto.io</h1>
      <p className="mt-6 text-xl text-muted-foreground">
        We are building the next generation of studio workflow tools for photographers. 
        Our mission is to simplify the journey from raw shoot to happy client.
      </p>
      
      <div className="mt-12 space-y-8 text-lg leading-relaxed">
        <p>
          Founded in 2026, foto.io was born out of a simple observation: photographers spend 
          too much time on administrative tasks and not enough time behind the lens.
        </p>
        <p>
          Our platform combines a powerful desktop helper for high-volume uploads with a 
          beautiful, secure client selection gallery, ensuring your workflow is as professional 
          as your photography.
        </p>
      </div>
    </main>
  );
}
