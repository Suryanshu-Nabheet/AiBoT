/**
 * AiBoT - AI-Powered Platform
 * Copyright (c) 2026 Suryanshu Nabheet
 * Licensed under MIT with Additional Commercial Terms
 * See LICENSE file for details
 */

export const en = {
  // Settings shell
  "settings.title": "Settings",
  "settings.subtitle": "Preferences",
  "settings.breadcrumb": "SETTINGS /",
  "settings.section.general": "General",
  "settings.section.models": "Model Preferences",
  "settings.section.apiKeys": "API Keys & Secrets",
  "settings.section.localLlm": "Local LLM",
  "settings.section.about": "About AiBoT",
  "settings.footer.edition": "Edition",
  "general.group.preferences": "Preferences",
  "general.group.alerts": "Alerts",

  // General
  "general.title": "General",
  "general.subtitle": "Language, appearance, and notifications.",
  "general.language.title": "Display Language",
  "general.language.desc":
    "The language used for the interface and AI replies.",
  "general.notifications.title": "Desktop Notifications",
  "general.notifications.desc":
    "Get alerted when AI finishes long reasoning tasks.",
  "general.notifications.enabled": "Desktop notifications enabled",
  "general.notifications.denied":
    "Notification permission was denied in your browser",
  "general.notifications.unsupported":
    "Desktop notifications are not supported in this browser",
  "general.notifications.disabled": "Desktop notifications turned off",
  "general.theme.title": "Appearance",
  "general.theme.desc": "Choose light, dark, or follow your system preference.",
  "general.theme.system": "System",
  "general.theme.light": "Light",
  "general.theme.dark": "Dark",
  "general.sound.title": "Completion Sound",
  "general.sound.desc":
    "Play a short chime when a long response finishes (tab must be audible).",

  // Models
  "models.title": "Model Preferences",
  "models.subtitle": "Enable or disable models to clean up your chat selector.",
  "models.platform": "AiBoT Platform Models",
  "models.platformOptimized": "Platform Optimized",
  "models.external": "External Provider Models",
  "models.externalDesc": "Models unlocked via your custom API configurations.",
  "models.ecosystem": "Ecosystem",
  "models.unlock.title": "Unlock Provider Models",
  "models.unlock.desc":
    "Add your API keys in the API Keys section to automatically reveal models from OpenAI, Anthropic, and more.",
  "models.unlock.link": "API Keys",

  // API Keys
  "apiKeys.title": "API Keys & Secrets",
  "apiKeys.subtitle":
    "Use your own keys to access specialized models or increase limits.",
  "apiKeys.enterKey": "Enter your {provider} secret key.",
  "apiKeys.active": "Active",
  "apiKeys.verify": "Verify & Save",
  "apiKeys.checking": "Checking...",
  "apiKeys.verified": "{provider} key verified and saved!",
  "apiKeys.invalid": "Invalid {provider} key.",
  "apiKeys.storage.title": "Stored Locally in This Browser",
  "apiKeys.storage.desc":
    "Your API keys stay on this device in local storage. They are sent only to the matching provider when you chat — never to AiBoT servers for storage.",

  // Local LLM
  "localLlm.title": "Local LLM (Ollama)",
  "localLlm.subtitle":
    "Access open-weights model families directly on your own local device.",
  "localLlm.endpoint": "Ollama Server Endpoint",
  "localLlm.hint":
    "Ensure Ollama is running on your machine. On macOS/Windows, make sure the Ollama application is active in the menu bar.",
  "localLlm.autoDetect": "Auto Detect",
  "localLlm.scanning": "Scanning Device...",
  "localLlm.refresh": "Refresh Scan",
  "localLlm.discovered": "Discovered Local Models ({count})",
  "localLlm.empty.title": "No Local Models Detected",
  "localLlm.empty.desc":
    "Make sure Ollama is active on your device. Click Auto Detect to scan your local setup and immediately populate available local models.",
  "localLlm.privacy.title": "100% Privacy & Zero Limits",
  "localLlm.privacy.desc":
    "Local execution is handled direct-to-device. Your prompts and code sessions never leave your local machine, and you enjoy zero API usage fees or latency thresholds.",
  "localLlm.status.connected": "Connected",
  "localLlm.status.disconnected": "Not connected",
  "localLlm.status.unknown": "Not scanned yet",
  "localLlm.scan.success":
    "Success! Detected and auto-enabled {count} local Ollama models.",
  "localLlm.scan.empty":
    "Connected to Ollama, but no models were found. Try pulling a model first (e.g. `ollama run llama3`).",
  "localLlm.scan.loopback":
    "Success! Connected to local Ollama via 127.0.0.1 loopback.",
  "localLlm.scan.fail":
    "Could not connect to Ollama. Production secure connections require CORS setup. Read troubleshooting steps below.",
  "localLlm.diagnostics.title": "Local Connection Diagnostics",
  "localLlm.diagnostics.desc":
    "Deployed secure websites (HTTPS) are blocked from accessing local API endpoints (http://localhost:11434) unless Cross-Origin Resource Sharing (CORS) is explicitly enabled on your machine.",
  "localLlm.diagnostics.os": "Select Operating System",
  "localLlm.diagnostics.hide": "Hide Diagnostics",
  "localLlm.diagnostics.retry": "Retry Connection Scan",
  "localLlm.copied": "Command copied!",

  // About
  "about.tagline": "Autonomous Orchestration",
  "about.version": "Version {version}",
  "about.edition": "Community Core",
  "about.developer": "The Developer",
  "about.developer.bio":
    "A visionary software architect and AI engineer focused on pushing the boundaries of autonomous coding and high-performance intelligent systems.",
  "about.stack": "Technical Stack",
  "about.foundation": "Architectural Foundation",
  "about.feature.orchestration.title": "Intelligent Model Orchestration",
  "about.feature.orchestration.desc":
    "State-of-the-art routing engine that dynamically switches between frontier LLMs based on task complexity and performance metrics.",
  "about.feature.coding.title": "Autonomous Coding Environment",
  "about.feature.coding.desc":
    "Real-time web prototyping and functional application generation from natural language, powered by specialized reasoning models and a custom execution context.",
  "about.feature.research.title": "Research-Grade Document Intelligence",
  "about.feature.research.desc":
    "Deep synthesis and multi-format data extraction capable of processing massive datasets for comprehensive, cross-referenced research insights.",

  // Notifications
  "notify.complete.title": "AiBoT finished responding",
  "notify.complete.body": "Your long reasoning task is ready.",
  "notify.thinking.title": "Deep reasoning complete",
  "notify.thinking.body": "AiBoT finished thinking and has an answer ready.",

  // Nav / sidebar
  "nav.search.placeholder": "Search chats...",
  "nav.newChat": "New Chat",
  "nav.agentMode": "Agent Mode",
  "nav.agent.summarizer": "Summarizer",
  "nav.agent.coder": "Coder",
  "nav.agent.coach": "Coach",
  "nav.madeBy": "Made by Suryanshu Nabheet",
  "nav.toggleSidebar": "Toggle Sidebar",
  "nav.chatDeleted": "Chat deleted",
  "nav.titleUpdated": "Title updated",

  // Header / mode switcher
  "header.settings": "Settings",
  "header.architecture": "Architecture",
  "header.directChat": "Direct Chat",
  "header.arenaMode": "Arena Mode",
  "header.appSettings": "App Settings",

  // Command palette (⌘K)
  "command.title": "Command Palette",
  "command.description": "Search chats and run quick actions",
  "command.placeholder": "What do you need?",
  "command.empty": "No actions found.",
  "command.group.actions": "Create",
  "command.group.navigate": "Navigate",
  "command.group.system": "System",
  "command.group.history": "Recent chats",
  "command.newChat": "New Chat",
  "command.layout.direct": "Switch to Direct Chat",
  "command.layout.arena": "Switch to Arena Mode",
  "command.theme.light": "Switch to Light Mode",
  "command.theme.dark": "Switch to Dark Mode",
  "command.footer.hint": "↑↓ navigate · ↵ select · esc close",

  // Chat
  "chat.welcome.greeting": "What can I help you with today?",
  "chat.defaultTitle": "New Chat",
  "chat.message.copy": "Copy message",
  "chat.message.downloadPdf": "Download as PDF",
  "chat.thinking.label": "Thinking",
  "chat.thinking.inProgress": "Thinking…",
  "chat.status.thinking": "AiBoT is thinking...",
  "chat.status.generating": "AiBoT is generating...",
  "chat.status.connecting": "Thinking…",
  "chat.status.reasoningQuery": "Reasoning about the query...",
  "chat.status.analyzing": "Analyzing context...",
  "chat.status.synthesizing": "Synthesizing insights...",
  "chat.status.crafting": "Crafting the response...",
  "chat.status.writing": "Writing the answer...",
  "chat.status.polishing": "Polishing the output...",

  // Composer
  "composer.placeholder": "Message AiBoT...",
  "composer.placeholder.listening": "Listening...",
  "composer.placeholder.arena": "Message both models...",
  "composer.attach": "Attach files",
  "composer.voice": "Voice input",
  "composer.thinking": "Thinking mode",

  "shortcut.toggleSidebar": "Toggle sidebar (⌘B)",
  "shortcut.toggleModel": "Search models (⌘/)",
  "composer.enhance": "Enhance prompt",
  "composer.send": "Send message",
  "composer.stop": "Stop generating",

  // Model selector
  "model.select": "Select model",
  "model.search": "Search models...",
  "model.empty": "No model found.",
  "model.platform": "Platform Models",
  "model.external": "External Models",
  "model.thinkingPower": "Thinking mode",
  "model.thinkingHint":
    "Extra time to process and structure the answer before replying.",
  "model.thinkingMenu": "Options",
  "model.thinkingShort": "Think",
  "model.thinkingOffShort": "Fast",

  // Toasts
  "toast.pdf.success": "PDF downloaded successfully!",
  "toast.pdf.fail": "Failed to generate PDF",
  "toast.speech.unsupported":
    "Speech recognition is not supported in this browser.",
  "toast.speech.listening": "Listening...",
  "toast.enhance.empty": "Please type something to enhance first.",
  "toast.enhance.fail": "Failed to enhance prompt. Please try again.",
  "toast.enhance.success": "Prompt enhanced!",
  "toast.enhance.none": "No enhancement received. Please try again.",
  "toast.file.extracted": "Extracted text from {name}",
  "toast.file.readFail": "Failed to read {name}",
  "toast.file.extractFail":
    "Could not extract text from {name}. Try the Summarizer feature.",
  "toast.clipboard": "Copied to clipboard",

  // Errors
  "errors.connectionInterrupted":
    "**Connection Error:** The stream was interrupted. Please try again.",
  "errors.network": "**Network Error**: {message}",
  "errors.http": "**Error {status}**: {detail}",
  "errors.noApiKey":
    "No API key available. Add a provider key in Settings or configure OPENROUTER_API_KEY.",
  "errors.chat.title.rateLimit": "Rate limit",
  "errors.chat.title.byokKeyRequired": "API key required",
  "errors.chat.title.byokInvalidKey": "Invalid API key",
  "errors.chat.title.invalidModel": "Model unavailable",
  "errors.chat.title.platformUnavailable": "Temporarily unavailable",
  "errors.chat.title.validation": "Couldn't send",
  "errors.chat.title.upstream": "Provider error",
  "errors.chat.title.ollama": "Ollama unreachable",
  "errors.chat.title.network": "Connection lost",
  "errors.chat.title.generic": "Something went wrong",
  "errors.chat.body.rateLimit":
    "Too many requests—wait a moment, then try again or switch models.",
  "errors.chat.body.byokKeyRequired":
    "Add your provider API key in Settings to use this model.",
  "errors.chat.body.byokInvalidKey":
    "Your API key was rejected. Update it in Settings and try again.",
  "errors.chat.body.invalidModel":
    "This model isn't available on your provider. Choose another model.",
  "errors.chat.body.platformUnavailable":
    "This hosted model isn't available right now. Try another model or check back later.",
  "errors.chat.body.validation":
    "This message couldn't be sent. Try a different model or a new chat.",
  "errors.chat.body.upstream":
    "The model provider had an issue. Try again shortly or switch models.",
  "errors.chat.body.ollama":
    "Couldn't reach Ollama—confirm it's running and your URL in Settings is correct.",
  "errors.chat.body.network":
    "The connection dropped before the reply finished. Send again when you're back online.",
  "errors.chat.body.generic": "Something went wrong. Please try again.",
  "errors.chat.action.settings": "Open API Keys",
  "errors.chat.alternatives": "Try another model",

  // Voice
  "voice.clickToSpeak": "Click to speak",
  "voice.listening": "Listening...",
  "voice.speaking": "Speaking...",
  "voice.ready": "AI Ready",
  "voice.aria.start": "Start voice input",
  "voice.aria.stop": "Stop voice input",

  // Agents — summarizer
  "agent.summarizer.title": "Document Summarizer",
  "agent.summarizer.subtitle":
    "Upload documents for research-grade synthesis and insights.",
  "agent.summarizer.dropHint": "Drop files here or click to upload",
  "agent.summarizer.start": "Start Analysis",
  "agent.summarizer.processing": "Processing document...",

  // Agents — coder
  "agent.coder.title": "AI Coder",
  "agent.coder.placeholder":
    "Describe the app or component you want to build...",
  "agent.coder.tab.code": "Code",
  "agent.coder.tab.preview": "Preview",
  "agent.coder.edit": "Edit",
  "agent.coder.save": "Save",
  "agent.coder.export": "Export",
  "agent.coder.reset": "Reset",
  "agent.coder.disclaimer":
    "Generated code runs in your browser preview. Review before shipping.",

  // Agents — coach
  "agent.coach.title": "AI Coach",
  "agent.coach.transcript": "Transcript",
  "agent.coach.toggleTranscript": "Toggle transcript",

  // Overlay
  "overlay.coder.creating": "AI is Creating",
  "overlay.coder.cancel": "Cancel Generation",

  // 404
  "notFound.title": "Lost in the digital void",
  "notFound.body": "This page does not exist or has been moved.",
  "notFound.home": "Back Home",
  "notFound.chat": "Start Chat",
} as const;

export type TranslationKey = keyof typeof en;
export type EnDictionary = Record<TranslationKey, string>;
