import type { ReactNode } from "react";
import { Nav } from "./components/nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <Nav />
        <div className="card p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
