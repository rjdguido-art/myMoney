import type { ReactNode } from "react";
import { Nav } from "./components/nav";
import { BottomTabBar } from "./components/bottom-tab-bar";
import { QuickAddTransactionModal } from "./components/quick-add-transaction";
import { AppProviders } from "./providers";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AppProviders>
      <div className="min-h-screen bg-surface">
        <Nav />
        <main className="px-4 pb-24 pt-6 sm:px-6 lg:px-10">
          {children}
        </main>
        <QuickAddTransactionModal />
        <BottomTabBar />
      </div>
    </AppProviders>
  );
}
