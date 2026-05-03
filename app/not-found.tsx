/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import { Button } from "@/components/ui/button";
import { ChatCircle, HouseLine, WarningCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-6">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px] size-[500px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center max-w-lg w-full text-center"
      >
        {/* 404 Heading - now a regular heading */}
        <h1 className="text-8xl font-black tracking-tighter text-foreground mb-4 md:text-9xl">
          404
        </h1>
        
        <div className="relative flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Lost in the digital void
          </h2>
          <p className="text-muted-foreground font-medium">
            The page you&apos;re looking for has either drifted away or never existed.
          </p>
        </div>

        {/* Action Buttons - matching agent mode style */}
        <div className="mt-8 flex flex-col gap-3 w-full sm:flex-row sm:justify-center">
          <Button 
            asChild 
            variant="default" 
            size="lg" 
            className="h-11 px-8 rounded-xl font-medium shadow-sm transition-all duration-200"
          >
            <Link href="/" className="flex items-center gap-2">
              <HouseLine weight="bold" size={18} />
              Back Home
            </Link>
          </Button>
          <Button 
            asChild 
            variant="ghost" 
            size="lg" 
            className="h-11 px-8 rounded-xl bg-white text-blue-600 border border-blue-100 shadow-sm font-medium hover:bg-blue-50/50 hover:border-blue-200 transition-colors duration-200"
          >
            <Link href="/chat" className="flex items-center gap-2">
              <ChatCircle weight="bold" size={18} />
              Start Chat
            </Link>
          </Button>
        </div>

        {/* Subtle Footer */}
        <div className="mt-10 text-sm text-muted-foreground/60 font-medium">
          Found a bug? <a href="https://github.com/Suryanshu-Nabheet/AiBoT/issues" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary transition-colors border-b border-primary/20 hover:border-primary">Report an Issue</a>
        </div>
      </motion.div>
    </div>
  );
}
