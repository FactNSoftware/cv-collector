"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

type NavigationLoadingContextValue = {
  showLoading: (title?: string, message?: string) => void;
  hideLoading: () => void;
};

const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(null);

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
  const [isNavigating, setIsNavigating] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);

  const hideLoading = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (settleTimeoutRef.current) {
      window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }

    settleTimeoutRef.current = window.setTimeout(() => {
      setIsNavigating(false);
      setBarVisible(false);
      settleTimeoutRef.current = null;
    }, 220);
  }, []);

  const showLoading: NavigationLoadingContextValue["showLoading"] = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    if (settleTimeoutRef.current) {
      window.clearTimeout(settleTimeoutRef.current);
      settleTimeoutRef.current = null;
    }

    setIsNavigating(true);
    setBarVisible(true);

    timeoutRef.current = window.setTimeout(() => {
      setIsNavigating(false);
      setBarVisible(false);
      timeoutRef.current = null;
    }, 8000);
  }, []);

  useEffect(() => {
    hideLoading();
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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      if (settleTimeoutRef.current) {
        window.clearTimeout(settleTimeoutRef.current);
      }
    };
  }, []);

  return (
    <NavigationLoadingContext.Provider value={value}>
      <div
        className={`transition-[opacity,transform,filter] duration-200 ease-out ${
          isNavigating ? "opacity-[0.985] translate-y-[1px] saturate-[0.985]" : "opacity-100 translate-y-0"
        }`}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-[70] h-20 transition-opacity duration-200 ${
          barVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="absolute inset-x-0 top-0 h-[3px] overflow-hidden bg-transparent">
          <div className="route-transition-bar h-full w-full origin-left bg-[linear-gradient(90deg,var(--color-sidebar-accent),var(--color-brand),var(--color-sidebar-accent-ink))]" />
        </div>
        <div className="absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(0,61,24,0.08),transparent)]" />
      </div>
      <style jsx>{`
        .route-transition-bar {
          animation: route-progress 1s cubic-bezier(0.22, 1, 0.36, 1) infinite;
        }

        @keyframes route-progress {
          0% {
            transform: translateX(-65%) scaleX(0.28);
            opacity: 0.4;
          }
          45% {
            transform: translateX(-5%) scaleX(0.62);
            opacity: 0.95;
          }
          100% {
            transform: translateX(55%) scaleX(0.38);
            opacity: 0.55;
          }
        }
      `}</style>
    </NavigationLoadingContext.Provider>
  );
}
