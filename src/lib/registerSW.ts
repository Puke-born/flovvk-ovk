// Guarded service worker registration. Only registers in published production
// builds. In dev, Lovable preview, iframes, or with ?sw=off, any existing
// matching registration is removed instead.
//
// When a new version of the app is available, the registered updater is
// stashed on `window.__updateSW` and a `pwa:need-refresh` CustomEvent is
// dispatched so UI code can prompt the user to reload.

const SW_URL = "/sw.js";

declare global {
  interface Window {
    __updateSW?: (reloadPage?: boolean) => Promise<void>;
  }
}

function isBlockedHost(hostname: string): boolean {
  if (hostname.startsWith("id-preview--") || hostname.startsWith("preview--")) return true;
  if (hostname === "lovableproject.com" || hostname.endsWith(".lovableproject.com")) return true;
  if (hostname === "lovableproject-dev.com" || hostname.endsWith(".lovableproject-dev.com")) return true;
  if (hostname === "beta.lovable.dev" || hostname.endsWith(".beta.lovable.dev")) return true;
  return false;
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      regs
        .filter((r) => {
          const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
          return url.endsWith(SW_URL);
        })
        .map((r) => r.unregister()),
    );
  } catch {
    /* ignore */
  }
}

export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const url = new URL(window.location.href);
  const killSwitch = url.searchParams.get("sw") === "off";
  const inIframe = window.self !== window.top;
  const blockedHost = isBlockedHost(window.location.hostname);
  const isProd = import.meta.env.PROD;

  if (!isProd || inIframe || blockedHost || killSwitch) {
    void unregisterMatching();
    return;
  }

  // Dynamically import the virtual module so dev builds don't choke on it.
  void import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        onNeedRefresh() {
          window.__updateSW = updateSW;
          window.dispatchEvent(new CustomEvent("pwa:need-refresh"));
        },
        onRegisteredSW(_swUrl, registration) {
          // Check for updates every 60 minutes while the app stays open.
          if (registration) {
            setInterval(
              () => {
                registration.update().catch(() => {});
              },
              60 * 60 * 1000,
            );
          }
        },
      });
    })
    .catch(() => {
      /* ignore */
    });
}
