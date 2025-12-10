"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebContainer } from "@webcontainer/api";
import "@xterm/xterm/css/xterm.css";

interface TerminalComponentProps {
  onCommand?: (command: string) => void;
  webContainer?: WebContainer | null;
  commandToRun?: string | null;
}

export default function TerminalComponent({
  onCommand,
  webContainer,
  commandToRun,
}: TerminalComponentProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const shellWriterRef = useRef<WritableStreamDefaultWriter<string> | null>(
    null
  );
  const commandRef = useRef("");

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize Terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      theme: {
        background: "#1e1e1e",
        foreground: "#ffffff",
        cursor: "#ffffff",
        selectionBackground: "#5da5d533",
        black: "#1e1e1e",
        red: "#f44336",
        green: "#4caf50",
        yellow: "#ffeb3b",
        blue: "#2196f3",
        magenta: "#e91e63",
        cyan: "#00bcd4",
        white: "#ffffff",
        brightBlack: "#808080",
        brightRed: "#f44336",
        brightGreen: "#4caf50",
        brightYellow: "#ffeb3b",
        brightBlue: "#2196f3",
        brightMagenta: "#e91e63",
        brightCyan: "#00bcd4",
        brightWhite: "#ffffff",
      },
      convertEol: true, // Convert \n to \r\n
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Safe fit helper
    const safeFit = () => {
      if (!term.element || !xtermRef.current) return;
      if (term.element.clientWidth > 0 && term.element.clientHeight > 0) {
        try {
          fitAddon.fit();
        } catch (e) {
          console.debug("Fit error silenced", e);
        }
      }
    };

    term.open(terminalRef.current);
    safeFit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln("\x1b[1;36mInitializing System...\x1b[0m");

    // Handle Resize
    const handleResize = () => {
      safeFit();
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  // WebContainer Integration
  useEffect(() => {
    if (!xtermRef.current || !webContainer) return;

    const term = xtermRef.current;
    term.reset();
    term.writeln("\x1b[1;32mWebContainer Booted.\x1b[0m Starting shell...");

    let shellProcess: any = null;

    const startShell = async () => {
      try {
        shellProcess = await webContainer.spawn("jsh", {
          terminal: {
            cols: term.cols,
            rows: term.rows,
          },
        });

        const inputWriter = shellProcess.input.getWriter();
        shellWriterRef.current = inputWriter;

        // Pipe events
        const dataDisposable = term.onData((data) => {
          inputWriter.write(data);
        });

        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              term.write(data);
            },
          })
        );

        // Handle Resize for Process
        const resizeObserver = new ResizeObserver(() => {
          if (fitAddonRef.current) {
            try {
              fitAddonRef.current.fit();
              if (shellProcess) {
                shellProcess.resize({
                  cols: term.cols,
                  rows: term.rows,
                });
              }
            } catch {}
          }
        });
        if (terminalRef.current) {
          resizeObserver.observe(terminalRef.current);
        }

        return () => {
          dataDisposable.dispose();
          resizeObserver.disconnect();
          if (shellProcess) {
            shellProcess.kill();
          }
        };
      } catch (e) {
        term.writeln(`\r\n\x1b[31mShell failed to start: ${e}\x1b[0m`);
      }
    };

    // Start
    const cleanupPromise = startShell();

    return () => {
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [webContainer]); // Re-run when webContainer becomes available

  // Programmatic Command Execution
  useEffect(() => {
    if (commandToRun && shellWriterRef.current) {
      shellWriterRef.current.write(commandToRun + "\r");
    }
  }, [commandToRun]);

  // Ensure fit on re-renders/layout changes
  useEffect(() => {
    // We can't access strict 'safeFit' from here easily without refactoring,
    // but we can check refs carefully.
    const observer = new ResizeObserver(() => {
      if (xtermRef.current && fitAddonRef.current && terminalRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch {}
      }
    });

    if (terminalRef.current) {
      observer.observe(terminalRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={terminalRef}
      className="w-full h-full overflow-hidden bg-[#1e1e1e]"
      style={{ paddingLeft: "10px", paddingRight: "10px" }} // Padding for aesthetics
    />
  );
}
