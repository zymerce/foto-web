import { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AuthPageShell({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 items-start gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-10 lg:px-8">
      <div className="order-2 lg:order-1">
        <div className="mb-4 flex justify-end">
          <ThemeToggle />
        </div>
        {children}
      </div>
      <aside className="order-1 lg:order-2">{aside}</aside>
    </main>
  );
}
