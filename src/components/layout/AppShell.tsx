import type { ReactNode } from "react";
import Header from "./Header";
import { BottomNavigation, SideNavigation } from "./Navigation";
import PauseBanner from "@/components/shared/PauseBanner";
import Toaster from "@/components/shared/Toaster";
import WalletPickerDialog from "@/components/shared/WalletPickerDialog";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <Header />
      <PauseBanner />
      <div className="mx-auto flex max-w-6xl gap-8 px-4 pb-28 pt-5 sm:px-5 md:pb-12">
        <SideNavigation />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomNavigation />
      <Toaster />
      <WalletPickerDialog />
    </div>
  );
}
