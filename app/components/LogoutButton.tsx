"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      router.push("/");
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        disabled={isLoading}
        className="theme-action-button theme-action-button-secondary rounded-2xl px-4 py-2.5 disabled:opacity-70"
      >
        {isLoading ? "Logging out..." : "Logout"}
      </button>
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Log out?"
        message="You will need to sign in again to access your portal."
        confirmLabel="Logout"
        tone="warning"
        isLoading={isLoading}
        onConfirm={async () => {
          await handleLogout();
          setIsConfirmOpen(false);
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}
