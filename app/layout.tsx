import "@/styles/globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { siteConfig } from "@/config/site";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { UIStructure } from "@/components/ui/ui-structure";
import { SidebarToggle } from "@/app/_components/sidebar-toggle";
import { SidebarProvider } from "@/components/ui/sidebar";
export const metadata: Metadata = siteConfig;

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${font.className} text-foreground bg-background`}>
        <Providers>
          <div className="flex h-screen w-full overflow-hidden">
            <SidebarProvider>
              <UIStructure />
              <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="absolute top-4 left-4 z-50 md:hidden">
                  <SidebarToggle />
                </div>
                {children}
              </main>
            </SidebarProvider>
          </div>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
