import { useEffect, useState, useRef } from "react";
import { WebContainer } from "@webcontainer/api";

let webContainerInstance: WebContainer | null = null;

export const useWebContainer = () => {
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Singleton pattern to avoid booting multiple instances
    if (webContainerInstance) {
      setWebContainer(webContainerInstance);
      setIsLoading(false);
      return;
    }

    const boot = async () => {
      try {
        setIsLoading(true);
        webContainerInstance = await WebContainer.boot();
        setWebContainer(webContainerInstance);
      } catch (e: any) {
        console.error("Failed to boot WebContainer:", e);
        if (
          e.message &&
          (e.message.includes("origins") ||
            e.message.includes("SharedArrayBuffer"))
        ) {
          setError(
            "System Error: Browser improperly configured. Please DISABLE 'Allow CORS' extension or try Incognito mode."
          );
        } else {
          setError(e.message || "Failed to boot WebContainer");
        }
      } finally {
        setIsLoading(false);
      }
    };

    boot();
  }, []);

  return { webContainer, isLoading, error };
};
