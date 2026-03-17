"use client";

import {
  type CSSProperties,
  createContext,
  type ReactNode,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { LoadingOverlay } from "./LoadingOverlay";

type NavigationLoadingContextValue = {
  showLoading: (title?: string, message?: string) => void;
  hideLoading: () => void;
};

const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(null);

const OVERLAY_THEME_VARIABLES = [
  "--color-overlay",
  "--color-border-strong",
  "--shadow-soft",
  "--color-sidebar-accent",
  "--color-sidebar-accent-ink",
  "--color-ink",
  "--color-muted",
  "--color-panel",
] as const;

type OverlayThemeStyle = CSSProperties & Record<(typeof OVERLAY_THEME_VARIABLES)[number], string>;

const collectOverlayThemeStyle = (): OverlayThemeStyle | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const scope = document.querySelector<HTMLElement>("[data-tenant-theme]");

  if (!scope) {
    return undefined;
  }

  const computed = window.getComputedStyle(scope);
  const style = {} as OverlayThemeStyle;
  let hasValue = false;

  for (const variableName of OVERLAY_THEME_VARIABLES) {
    const variableValue = computed.getPropertyValue(variableName).trim();

    if (!variableValue) {
      continue;
    }

    style[variableName] = variableValue;
    hasValue = true;
  }

  return hasValue ? style : undefined;
};

export function useNavigationLoading() {
  const value = useContext(NavigationLoadingContext);

  if (!value) {
    throw new Error("useNavigationLoading must be used within NavigationLoadingProvider.");
  }

  return value;
}

export function NavigationLoadingProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [loadingState, setLoadingState] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    title: "Loading",
    message: "Preparing the next screen.",
  });
  const [overlayThemeStyle, setOverlayThemeStyle] = useState<OverlayThemeStyle | undefined>(
    undefined,
  );
  const timeoutRef = useRef<number | null>(null);

  const syncOverlayThemeStyle = useCallback(() => {
    setOverlayThemeStyle(collectOverlayThemeStyle());
  }, []);

  const hideLoading = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setLoadingState((current) => ({ ...current, visible: false }));
  }, []);

  const showLoading = useCallback((
    title = "Loading",
    message = "Preparing the next screen.",
  ) => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    syncOverlayThemeStyle();

    setLoadingState({
      visible: true,
      title,
      message,
    });

    timeoutRef.current = window.setTimeout(() => {
      setLoadingState((current) => ({ ...current, visible: false }));
      timeoutRef.current = null;
    }, 15000);
  }, [syncOverlayThemeStyle]);

  useEffect(() => {
    startTransition(() => {
      hideLoading();
    });
  }, [hideLoading, pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const link = target?.closest("a");

      if (!link) {
        return;
      }

      const href = link.getAttribute("href");

      if (
        !href
        || href.startsWith("#")
        || href.startsWith("/api/")
        || link.target === "_blank"
        || link.hasAttribute("download")
        || link.getAttribute("data-skip-nav-loading") === "true"
      ) {
        return;
      }

      const url = new URL(link.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (url.origin !== currentUrl.origin) {
        return;
      }

      if (
        url.pathname.startsWith("/api/")
        || (url.pathname === currentUrl.pathname && url.search === currentUrl.search)
      ) {
        return;
      }

      showLoading();
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [showLoading]);

  const value = useMemo(() => ({
    showLoading,
    hideLoading,
  }), [hideLoading, showLoading]);

  return (
    <NavigationLoadingContext.Provider value={value}>
      {children}
      {loadingState.visible && (
        <LoadingOverlay
          title={loadingState.title}
          message={loadingState.message}
          themeVars={overlayThemeStyle}
        />
      )}
    </NavigationLoadingContext.Provider>
  );
}
