/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

import { Button } from "@/components/ui/button";
import { ChatCircle, HouseLine } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

export default function NotFound() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-10 text-center sm:px-8"
    >
      <div className="w-full max-w-md">
        <p
          aria-hidden="true"
          className="text-[clamp(6rem,22vw,10rem)] font-semibold leading-none tracking-[-0.09em] text-muted-foreground/35"
        >
          404
        </p>

        <div className="mt-5 space-y-3">
          <h1
            id="not-found-title"
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
          >
            Page not found
          </h1>
          <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground sm:text-base">
            We couldn&apos;t find that page. The link may be outdated.
          </p>
        </div>

        <nav
          aria-label="Helpful links"
          className="mt-8 flex w-full flex-col justify-center gap-3 sm:flex-row"
        >
          <Button asChild size="lg" className="min-h-11 rounded-xl px-5">
            <Link href="/" className="gap-2">
              <HouseLine size={18} weight="bold" aria-hidden="true" />
              Go home
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="min-h-11 rounded-xl px-5"
          >
            <Link href="/chat" className="gap-2">
              <ChatCircle size={18} weight="bold" aria-hidden="true" />
              Open chat
            </Link>
          </Button>
        </nav>

        <p className="mt-10 text-sm text-muted-foreground">
          Think this is a mistake?{" "}
          <a
            href="https://github.com/Suryanshu-Nabheet/AiBoT/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Report an issue
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </div>
    </section>
  );
}
