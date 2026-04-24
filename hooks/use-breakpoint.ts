"use client";

import { useEffect, useState } from "react";

const breakpoints = {
    xxs: 320,
    xs: 600,
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    "2xl": 1536,
} as const;

type Breakpoint = keyof typeof breakpoints;

export function useBreakpoint(breakpoint: Breakpoint): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        const query = window.matchMedia(`(min-width: ${breakpoints[breakpoint]}px)`);
        setMatches(query.matches);

        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        query.addEventListener("change", handler);
        return () => query.removeEventListener("change", handler);
    }, [breakpoint]);

    return matches;
}
