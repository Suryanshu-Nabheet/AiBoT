import { useEffect, useState, useRef } from "react";
import { WebContainer } from "@webcontainer/api";

let webContainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

export const useWebContainer = () => {
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (webContainerInstance) {
      setWebContainer(webContainerInstance);
      setIsLoading(false);
      return;
    }

    if (!bootPromise) {
      bootPromise = WebContainer.boot();
    }

    const handleBoot = async () => {
      try {
        const instance = await bootPromise;
        webContainerInstance = instance;
        setWebContainer(instance);
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

    handleBoot();
  }, []);

  return { webContainer, isLoading, error };
};
