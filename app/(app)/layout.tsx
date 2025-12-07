import { SidebarToggle } from "@/app/_components/sidebar-toggle";
import { SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <SidebarInset className="h-full overflow-hidden bg-background">
          <div className="flex h-full flex-col w-full relative">
            <header className="flex h-12 w-full items-center gap-2 shrink-0 px-4 bg-background z-10">
              <SidebarToggle />
            </header>
            <main className="flex-1 w-full relative overflow-hidden">
              {children}
            </main>
          </div>
        </SidebarInset>
      </ThemeProvider>
    </>
  );
}
