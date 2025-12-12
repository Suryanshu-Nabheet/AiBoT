import "@/styles/globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { siteConfig } from "@/config/site";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import { UIStructure } from "@/components/ui/ui-structure";
import { SidebarProvider } from "@/components/ui/sidebar";

export const metadata: Metadata = siteConfig;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${font.className} text-foreground bg-background overflow-x-hidden`}
      >
        <Providers>
          <div className="flex h-screen w-full max-w-full overflow-hidden">
            <SidebarProvider>
              <UIStructure />
              <main className="flex-1 flex flex-col h-full w-full max-w-full overflow-hidden relative">
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
