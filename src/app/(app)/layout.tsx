import type { ReactNode } from "react";
import { Nav } from "./components/nav";
import { MobileNav } from "@/components/argo/MobileNav";
import { QuickAddTransactionModal } from "./components/quick-add-transaction";
import { AppProviders } from "./providers";
import { ChatWidget } from "./components/chat-widget";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <div className="relative min-h-screen bg-transparent z-10 app-shell">
        <Nav />
        <main className="px-4 pb-24 pt-6 sm:px-6 lg:px-10">
          {children}
        </main>
        <QuickAddTransactionModal />
        <MobileNav />
        <ChatWidget />
      </div>
    </AppProviders>
  );
}
