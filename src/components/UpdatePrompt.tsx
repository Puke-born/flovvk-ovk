import { useEffect } from "react";
import { toast } from "sonner";

export function UpdatePrompt() {
  useEffect(() => {
    const handler = () => {
      toast("En ny version är tillgänglig", {
        description: "Ladda om för att uppdatera appen.",
        duration: Infinity,
        action: {
          label: "Ladda om",
          onClick: () => {
            const update = window.__updateSW;
            if (update) {
              void update(true);
            } else {
              window.location.reload();
            }
          },
        },
      });
    };
    window.addEventListener("pwa:need-refresh", handler);
    return () => window.removeEventListener("pwa:need-refresh", handler);
  }, []);

  return null;
}
