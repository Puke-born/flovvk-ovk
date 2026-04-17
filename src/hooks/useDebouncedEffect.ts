import { useEffect, useRef } from "react";

export function useDebouncedEffect(effect: () => void, deps: unknown[], delay = 400) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(effect, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
