/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, 
  Palette, 
  Cpu, 
  Key, 
  Info, 
  X, 
  CaretRight, 
  Check,
  Bell,
  Globe,
  ShieldCheck,
  Plus,
  Trash,
  ArrowSquareOut,
  Circle
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useViewMode } from "@/contexts/view-mode-context";
import { useSettings, ApiKeys } from "@/contexts/settings-context";
import { MODELS, ModelFull } from "@/lib/types";
import { PROVIDER_MODELS, ProviderModel } from "@/lib/provider-models";
import { toast } from "sonner";

type SettingsSection = "general" | "appearance" | "models" | "api-keys" | "about";

interface SectionItem {
  id: SettingsSection;
  label: string;
  icon: React.ElementType;
}

const SECTIONS: SectionItem[] = [
  { id: "general", label: "General", icon: User },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "models", label: "Model Preferences", icon: Cpu },
  { id: "api-keys", label: "API Keys & Secrets", icon: Key },
  { id: "about", label: "About AiBoT", icon: Info },
];

const PROVIDERS = [
  { id: "openai", name: "OpenAI", placeholder: "sk-proj-...", icon: "/icons/chatgpt.svg" },
  { id: "anthropic", name: "Anthropic", placeholder: "sk-ant-...", icon: "/icons/anthropic.svg" },
  { id: "google", name: "Google Gemini", placeholder: "AIzaSy...", icon: "/icons/google.svg" },
  { id: "deepseek", name: "DeepSeek", placeholder: "sk-...", icon: "/icons/deepseek.svg" },
  { id: "openrouter", name: "OpenRouter", placeholder: "sk-or-...", icon: "/icons/openrouter.svg" },
];

export function SettingsPanel() {
  const { setViewMode } = useViewMode();
  const { 
    apiKeys, 
    setApiKey, 
    availableModels,
    enabledModels, 
    toggleModel, 
    verifyKey 
  } = useSettings();
  
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [verifyingProvider, setVerifyingProvider] = useState<string | null>(null);

  const handleVerifyKey = async (provider: keyof ApiKeys, key: string) => {
    if (!key) return;
    setVerifyingProvider(provider);
    const isValid = await verifyKey(provider, key);
    setVerifyingProvider(null);
    if (isValid) {
      toast.success(`${provider.toUpperCase()} key verified and saved!`);
    } else {
      toast.error(`Invalid ${provider.toUpperCase()} key.`);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "general":
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header>
              <h3 className="text-xl font-bold tracking-tight mb-1 text-foreground">General Settings</h3>
              <p className="text-sm text-muted-foreground">Manage your core application experience.</p>
            </header>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/20 border border-border/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                    <Globe className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Display Language</p>
                    <p className="text-[11px] text-muted-foreground">The language used for the interface elements.</p>
                  </div>
                </div>
                <select className="bg-background/50 backdrop-blur-md border border-border/50 rounded-xl text-xs font-bold p-2 px-4 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all cursor-pointer">
                  <option>English (US)</option>
                  <option>Hindi (India)</option>
                  <option>Japanese</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl bg-muted/20 border border-border/40 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                    <Bell className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Desktop Notifications</p>
                    <p className="text-[11px] text-muted-foreground">Get alerted when AI finishes long reasoning tasks.</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        );

      case "models":
        const activeProviders = Object.keys(apiKeys).filter(p => !!apiKeys[p as keyof ApiKeys]);

        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight mb-1 text-foreground">Model Preferences</h3>
                <p className="text-sm text-muted-foreground">Enable or disable models to clean up your chat selector.</p>
              </div>
            </header>

            <div className="space-y-12">
              {/* Platform Models */}
              <section>
                <div className="flex items-center gap-2 mb-5 ml-1">
                  <div className="size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">AiBoT Platform Models</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MODELS.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex items-center justify-between p-4.5 rounded-2xl border transition-all duration-300",
                        enabledModels.includes(m.id) 
                          ? "bg-primary/[0.02] border-primary/10 shadow-sm" 
                          : "bg-muted/10 border-border/20 opacity-50 grayscale"
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-sm">
                           <img src={m.logo || "/icons/ai.svg"} alt="" className="w-full h-full object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[14px] font-bold tracking-tight truncate">{m.name.replace(" (Free)", "")}</p>
                          <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider truncate opacity-70">Platform Optimized</p>
                        </div>
                      </div>
                      <Switch 
                        checked={enabledModels.includes(m.id)} 
                        onCheckedChange={() => toggleModel(m.id)}
                      />
                    </div>
                  ))}
                </div>
              </section>

              {/* Dynamic Provider Models */}
              {activeProviders.length > 0 && (
                <div className="pt-10 border-t border-border/30 mt-10">
                  <div className="flex flex-col gap-1.5 mb-10">
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.4em] text-primary">External Provider Models</h4>
                    <p className="text-[10px] text-muted-foreground font-medium">Models unlocked via your custom API configurations.</p>
                  </div>
                  
                  <div className="space-y-12">
                    {activeProviders.map(providerId => {
                      const provider = PROVIDERS.find(p => p.id === providerId);
                      const models = PROVIDER_MODELS[providerId] || [];

                      if (models.length === 0) return null;

                      return (
                        <section key={providerId} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex items-center gap-2 mb-5 ml-1">
                            <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{provider?.name} Ecosystem</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {models.map((m) => (
                              <div
                                key={m.id}
                                className={cn(
                                  "flex items-center justify-between p-4.5 rounded-2xl border transition-all duration-300",
                                  enabledModels.includes(m.id) 
                                    ? "bg-emerald-500/[0.02] border-emerald-500/20 shadow-sm" 
                                    : "bg-muted/10 border-border/20 opacity-50 grayscale"
                                )}
                              >
                                <div className="flex items-center gap-4 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center p-2 shrink-0 overflow-hidden shadow-sm">
                                     <img src={provider?.icon} alt="" className="w-full h-full object-contain" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[14px] font-bold tracking-tight truncate">{m.name}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider truncate opacity-70">{m.id}</p>
                                  </div>
                                </div>
                                <Switch 
                                  checked={enabledModels.includes(m.id)} 
                                  onCheckedChange={() => toggleModel(m.id)}
                                />
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeProviders.length === 0 && (
                 <div className="p-12 rounded-3xl border border-dashed border-border/60 bg-muted/5 flex flex-col items-center text-center space-y-4">
                    <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground shadow-inner">
                       <Key className="size-6" />
                    </div>
                    <div className="max-w-[280px] space-y-2">
                       <p className="text-[15px] font-bold">Unlock Provider Models</p>
                       <p className="text-[11px] text-muted-foreground leading-relaxed">Add your API keys in the <button onClick={() => setActiveSection("api-keys")} className="text-primary font-bold hover:underline">API Keys</button> section to automatically reveal models from OpenAI, Anthropic, and more.</p>
                    </div>
                 </div>
              )}
            </div>
          </div>
        );

      case "api-keys":
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header>
              <h3 className="text-xl font-bold tracking-tight mb-1 text-foreground">API Keys & Secrets</h3>
              <p className="text-sm text-muted-foreground">Use your own keys to access specialized models or increase limits.</p>
            </header>
            
            <div className="space-y-4">
              {PROVIDERS.map((provider) => (
                <div key={provider.id} className="p-5 rounded-2xl bg-muted/20 border border-border/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center p-2 shadow-sm">
                        <img src={provider.icon} alt="" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{provider.name}</p>
                        <p className="text-[10px] text-muted-foreground">Enter your {provider.name} secret key.</p>
                      </div>
                    </div>
                    {apiKeys[provider.id as keyof ApiKeys] && (
                       <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase tracking-wider">Active</span>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1 group">
                      <Input 
                        type="password" 
                        placeholder={provider.placeholder}
                        value={apiKeys[provider.id as keyof ApiKeys] || ""}
                        onChange={(e) => setApiKey(provider.id as keyof ApiKeys, e.target.value)}
                        className="bg-background/50 border-border/50 rounded-xl px-4 py-5 text-xs font-mono focus:ring-1 focus:ring-primary/30"
                      />
                      <Key className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30 group-focus-within:text-primary/50 transition-colors" />
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => handleVerifyKey(provider.id as keyof ApiKeys, apiKeys[provider.id as keyof ApiKeys] || "")}
                      disabled={verifyingProvider === provider.id || !apiKeys[provider.id as keyof ApiKeys]}
                      className="rounded-xl border-border/50 text-[11px] font-bold h-auto py-2.5 px-6 hover:bg-primary hover:text-white hover:border-primary transition-all duration-300"
                    >
                      {verifyingProvider === provider.id ? "Checking..." : "Verify & Save"}
                    </Button>
                  </div>
                </div>
              ))}

              <div className="p-5 rounded-2xl bg-primary/[0.03] border border-primary/10 flex items-start gap-4 mt-8">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ShieldCheck className="size-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary mb-1">Local Encryption Enabled</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">Your API keys never leave your browser. They are encrypted and stored in your local session.</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "about":
        return (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12 max-w-3xl mx-auto">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <div className="absolute -inset-10 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl opacity-20" />
                <h1 className="text-6xl font-extrabold tracking-tighter relative z-10">
                  <span className="text-foreground">Ai</span>
                  <span className="text-primary">BoT</span>
                </h1>
              </div>
              <div className="space-y-2 relative z-10">
                <p className="text-[10px] font-bold text-primary uppercase tracking-[0.6em] ml-[0.6em]">Autonomous Orchestration</p>
                <div className="flex items-center justify-center gap-3 opacity-40">
                  <span className="text-[9px] font-bold uppercase tracking-widest">Version 2.4.0</span>
                  <div className="size-1 rounded-full bg-border" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Enterprise Core</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 rounded-[2.5rem] bg-muted/10 border border-border/40 space-y-4 transition-all hover:bg-muted/20">
                <div className="flex items-center gap-3 text-primary">
                  <User weight="fill" className="size-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">The Developer</span>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-foreground">Suryanshu Nabheet</p>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    A visionary software architect and AI engineer focused on pushing the boundaries of autonomous coding and high-performance intelligent systems.
                  </p>
                </div>
              </div>

              <div className="p-8 rounded-[2.5rem] bg-muted/10 border border-border/40 space-y-4 transition-all hover:bg-muted/20">
                <div className="flex items-center gap-3 text-primary">
                  <Cpu weight="fill" className="size-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">Technical Stack</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-[11px] font-bold text-muted-foreground/80 uppercase tracking-tight">
                  <div className="flex items-center gap-2"><div className="size-1.5 rounded-full bg-primary/40" /> Next.js 15.5</div>
                  <div className="flex items-center gap-2"><div className="size-1.5 rounded-full bg-primary/40" /> React 19</div>
                  <div className="flex items-center gap-2"><div className="size-1.5 rounded-full bg-primary/40" /> TypeScript 5.8</div>
                  <div className="flex items-center gap-2"><div className="size-1.5 rounded-full bg-primary/40" /> Tailwind 4.0</div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="flex items-center justify-center gap-2 px-1">
                <div className="h-px w-12 bg-border/50" />
                <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Architectural Foundation</h4>
                <div className="h-px w-12 bg-border/50" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { 
                    title: "Intelligent Model Orchestration", 
                    desc: "State-of-the-art routing engine that dynamically switches between frontier LLMs (GPT-4o, Claude 3.5, Gemini 1.5) based on task complexity and performance metrics.",
                    icon: ShieldCheck
                  },
                  { 
                    title: "Autonomous Coding Environment", 
                    desc: "Real-time web prototyping and functional application generation from natural language, powered by specialized reasoning models and a custom execution context.",
                    icon: ArrowSquareOut
                  },
                  { 
                    title: "Research-Grade Document Intelligence", 
                    desc: "Deep synthesis and multi-format data extraction capable of processing massive datasets for comprehensive, cross-referenced research insights.",
                    icon: Info
                  }
                ].map((item, i) => (
                  <div key={i} className="group p-6 rounded-[2rem] bg-muted/5 border border-border/30 hover:border-primary/20 hover:bg-primary/[0.01] transition-all duration-300 flex items-start gap-6">
                    <div className="w-10 h-10 rounded-2xl bg-background border border-border/50 flex items-center justify-center text-primary shrink-0 shadow-sm transition-transform group-hover:scale-110">
                      <item.icon weight="bold" className="size-5" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-foreground tracking-tight">{item.title}</p>
                      <p className="text-[12px] text-muted-foreground leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-center gap-8 text-center pt-8">
               <div className="h-px w-full max-w-[200px] bg-gradient-to-r from-transparent via-border to-transparent" />
               <div className="flex gap-10 grayscale opacity-30 hover:opacity-100 hover:grayscale-0 transition-all duration-700 cursor-default">
                  <img src="/icons/meta.svg" className="size-6" />
                  <img src="/icons/google.svg" className="size-6" />
                  <img src="/icons/chatgpt.svg" className="size-6" />
                  <img src="/icons/nvidia.svg" className="size-6" />
               </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full w-full bg-background flex overflow-hidden relative border-t border-border/50">
      {/* Settings Sidebar - AGENT MODE INSPIRED SIZING */}
      <div className="w-[260px] border-r border-border/50 flex flex-col bg-muted/[0.02] relative z-20">
        <div className="p-7 pb-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="size-2 rounded-full bg-primary/80" />
            <h2 className="text-[12px] font-bold uppercase tracking-[0.3em] text-foreground">Settings</h2>
          </div>
          <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest opacity-40">Architectural Hub</p>
        </div>
        
        <div className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-none">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "inline-flex cursor-pointer items-center whitespace-nowrap text-sm disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none w-full justify-start gap-3 h-10 transition-all duration-200 rounded-xl px-4 py-2 font-bold tracking-tight",
                activeSection === section.id 
                  ? "bg-primary/[0.08] text-primary" 
                  : "bg-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              )}
            >
              <section.icon className={cn(
                "size-4.5 transition-all duration-300",
                activeSection === section.id ? "text-primary scale-110" : "text-muted-foreground/40"
              )} />
              <span className="truncate">{section.label}</span>
            </button>
          ))}
        </div>

        <div className="p-8">
           <div className="p-4 rounded-2xl bg-muted/20 border border-border/40 flex items-center justify-center">
              <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.4em]">Enterprise 2.4</span>
           </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
        {/* Navigation Header */}
        <div className="h-16 flex items-center justify-between px-10 border-b border-border/30 backdrop-blur-sm sticky top-0 z-10">
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">Hub /</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.3em]">{activeSection.replace("-", " ")}</span>
           </div>
           <button 
              onClick={() => setViewMode("direct")}
              className="group p-2.5 rounded-2xl bg-muted/20 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            >
              <X className="size-4.5 group-hover:rotate-90 transition-transform duration-300" />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50 scrollbar-track-transparent">
          <div className="max-w-4xl w-full mx-auto px-10 md:px-14 py-12 lg:py-20">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
