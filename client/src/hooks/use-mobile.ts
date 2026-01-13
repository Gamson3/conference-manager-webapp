import { useEffect, useState } from "react";

const DEFAULT_BREAKPOINT_PX = 768;

export function useIsMobile(breakpointPx: number = DEFAULT_BREAKPOINT_PX) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);

    const update = () => setIsMobile(mediaQuery.matches);
    update();

    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [breakpointPx]);

  return isMobile;
}
