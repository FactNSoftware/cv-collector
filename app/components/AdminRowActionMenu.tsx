"use client";

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type ActionItem = {
  label: string;
  icon?: ReactNode;
  href?: string;
  onSelect?: () => void | Promise<void>;
  target?: string;
  rel?: string;
  disabled?: boolean;
  tone?: "default" | "danger";
};

type AdminRowActionMenuProps = {
  items: ActionItem[];
};

export function AdminRowActionMenu({ items }: AdminRowActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; opacity: number }>({
    top: 0,
    left: 0,
    opacity: 0,
  });

  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    const updatePosition = () => {
      const button = buttonRef.current;
      const menu = menuRef.current;

      if (!button || !menu) {
        return;
      }

      const rect = button.getBoundingClientRect();
      const menuWidth = menu.offsetWidth || 224;
      const menuHeight = menu.offsetHeight || 0;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gap = 8;

      let left = rect.right - menuWidth;
      if (left < gap) {
        left = gap;
      }
      if (left + menuWidth > viewportWidth - gap) {
        left = viewportWidth - menuWidth - gap;
      }

      let top = rect.bottom + gap;
      if (top + menuHeight > viewportHeight - gap) {
        top = rect.top - menuHeight - gap;
      }
      if (top < gap) {
        top = gap;
      }

      setMenuStyle({
        top: top + window.scrollY,
        left: left + window.scrollX,
        opacity: 1,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedTrigger = containerRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);

      if (!clickedTrigger && !clickedMenu) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        onClick={() => setIsOpen((current) => !current)}
        className="inline-flex items-center rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink)]"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {isOpen
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
              className="fixed z-[80] min-w-56 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white p-1.5 shadow-[0_24px_64px_rgba(5,39,15,0.18)]"
              style={menuStyle}
            >
              {items.map((item) => {
                const content = (
                  <>
                    {item.icon ? <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">{item.icon}</span> : null}
                    <span>{item.label}</span>
                  </>
                );
                const className = `flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium ${
                  item.tone === "danger" ? "text-rose-700 hover:bg-rose-50" : "text-[var(--color-ink)] hover:bg-[var(--color-panel)]"
                }${item.disabled ? " cursor-not-allowed opacity-50" : ""}`;

                if (item.href) {
                  return (
                    <Link
                      key={item.label}
                      href={item.disabled ? "#" : item.href}
                      target={item.target}
                      rel={item.rel}
                      onClick={() => setIsOpen(false)}
                      className={className}
                    >
                      {content}
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.label}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      if (item.disabled) {
                        return;
                      }
                      void item.onSelect?.();
                      setIsOpen(false);
                    }}
                    className={className}
                  >
                    {content}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
