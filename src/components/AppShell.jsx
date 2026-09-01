import { forwardRef } from "react";
import BottomNav from "./BottomNav";
import NotificationBell from "./NotificationBell";

const AppShell = forwardRef(({ children, showNav = true, header }, ref) => {
  return (
    <div
      ref={ref}
      className="max-w-[480px] mx-auto min-h-svh bg-background relative"
    >
      {header && (
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border px-4 h-14 flex items-center">
          <div className="min-w-0 flex-1">{header}</div>
          <div className="ml-3 shrink-0"><NotificationBell /></div>
        </header>
      )}
      <main className={showNav ? "pb-20" : ""}>{children}</main>
      {showNav && <BottomNav />}
    </div>
  );
});

AppShell.displayName = "AppShell";

export default AppShell;
