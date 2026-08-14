import { useEffect } from "react";

const FOCUSABLE_SELECTOR = [
  "input:not([type=hidden]):not([disabled]):not([readonly])",
  "textarea:not([disabled]):not([readonly])",
  "[contenteditable=true]",
  "button[role=combobox]:not([disabled])",
].join(",");

function isVisible(el: HTMLElement) {
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

/**
 * Makes Enter behave like Tab in text inputs, so protocols can be typed
 * quickly on a desktop keyboard. Textareas keep their newline behaviour.
 */
export function useEnterAsTab() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.defaultPrevented) return;

      const target = e.target as HTMLElement | null;
      if (!target) return;
      // The remarks grid handles its own navigation.
      if (target.closest("[data-enter-nav=self]")) return;

      const isInput = target instanceof HTMLInputElement;
      if (!isInput) return;
      if (["checkbox", "radio", "button", "submit", "file"].includes(target.type)) return;

      const root = target.closest("[role=dialog]") ?? document;
      const all = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (el) => el.tabIndex !== -1 && isVisible(el) && !el.closest("[data-enter-nav=self]"),
      );
      const idx = all.indexOf(target);
      if (idx === -1) return;

      e.preventDefault();
      const next = all[idx + 1];
      if (next) {
        next.focus();
        if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) next.select();
      } else {
        target.blur();
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}
