"use client";

import { FormEvent, useState } from "react";
import type { AdminAccount } from "../../lib/admin-access";
import { ConfirmDialog } from "./ConfirmDialog";
import { LoadingOverlay } from "./LoadingOverlay";
import { PortalShell } from "./PortalShell";
import { useToast } from "./ToastProvider";

type AdminSettingsPortalProps = {
  sessionEmail: string;
  initialAdmins: AdminAccount[];
};

export function AdminSettingsPortal({
  sessionEmail,
  initialAdmins,
}: AdminSettingsPortalProps) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [adminEmail, setAdminEmail] = useState("");
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [editedEmail, setEditedEmail] = useState("");
  const [busyAdminEmail, setBusyAdminEmail] = useState<string | null>(null);
  const [pendingDeleteAdminEmail, setPendingDeleteAdminEmail] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleCreateAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingAdmin(true);

    try {
      const response = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to create admin." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to create admin.", "error");
        return;
      }

      setAdmins((current) => [payload.item as AdminAccount, ...current]);
      setAdminEmail("");
      showToast(payload.message || "Admin account created successfully.");
    } catch {
      showToast("Something went wrong while creating the admin.", "error");
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const startEditingAdmin = (email: string) => {
    setEditingEmail(email);
    setEditedEmail(email);
  };

  const cancelEditingAdmin = () => {
    setEditingEmail(null);
    setEditedEmail("");
  };

  const handleUpdateAdmin = async (currentEmail: string) => {
    setBusyAdminEmail(currentEmail);

    try {
      const response = await fetch(`/api/admin/admins/${encodeURIComponent(currentEmail)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: editedEmail }),
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to update admin." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to update admin.", "error");
        return;
      }

      setAdmins((current) => current.map((item) => (
        item.email === currentEmail ? payload.item as AdminAccount : item
      )));
      cancelEditingAdmin();
      showToast(payload.message || "Admin account updated successfully.");
    } catch {
      showToast("Something went wrong while updating the admin.", "error");
    } finally {
      setBusyAdminEmail(null);
    }
  };

  const handleDeleteAdmin = async (email: string) => {
    if (email === sessionEmail) {
      showToast("You cannot delete your own admin account.", "warning");
      return;
    }

    setBusyAdminEmail(email);

    try {
      const response = await fetch(`/api/admin/admins/${encodeURIComponent(email)}`, {
        method: "DELETE",
      });

      const payload = await response
        .json()
        .catch(() => ({ message: "Failed to delete admin." }));

      if (!response.ok) {
        showToast(payload.message || "Failed to delete admin.", "error");
        return;
      }

      setAdmins((current) => current.filter((item) => item.email !== email));
      if (editingEmail === email) {
        cancelEditingAdmin();
      }
      showToast(payload.message || "Admin account deleted successfully.");
    } catch {
      showToast("Something went wrong while deleting the admin.", "error");
    } finally {
      setBusyAdminEmail(null);
    }
  };

  return (
    <PortalShell
      portal="admin"
      sessionEmail={sessionEmail}
      eyebrow="Settings"
      title="Admin access settings"
      subtitle="Manage who can access the admin portal."
      primaryActionHref="/admin/jobs/new"
      primaryActionLabel="Create Job"
    >
      {(isCreatingAdmin || Boolean(busyAdminEmail)) && (
        <LoadingOverlay
          title={isCreatingAdmin ? "Adding admin" : "Updating admin access"}
          message={isCreatingAdmin
            ? "Saving the new admin account."
            : "Applying admin access changes."}
        />
      )}
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-semibold text-[var(--color-ink)]">Add another admin</h2>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Existing admins can grant admin access directly from this page.
          </p>
          <form className="mt-5 grid gap-3" onSubmit={handleCreateAdmin}>
            <input
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              placeholder="admin@example.com"
              className="h-12 rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[rgba(212,138,57,0.16)]"
            />
            <button
              type="submit"
              disabled={isCreatingAdmin}
              className="h-12 rounded-2xl bg-[var(--color-sidebar-accent)] px-4 text-sm font-medium text-[var(--color-sidebar-accent-ink)] disabled:opacity-70"
            >
              {isCreatingAdmin ? "Adding..." : "Add Admin"}
            </button>
          </form>
        </section>

        <section className="rounded-[28px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-soft)]">
          <h2 className="text-xl font-semibold text-[var(--color-ink)]">Current admins</h2>
          <div className="mt-5 space-y-3">
            {admins.map((admin) => (
              <div key={admin.email} className="rounded-[24px] border border-[var(--color-border)] bg-white p-4">
                {editingEmail === admin.email ? (
                  <div className="space-y-3">
                    <input
                      value={editedEmail}
                      onChange={(event) => setEditedEmail(event.target.value)}
                      placeholder="admin@example.com"
                      className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand)] focus:ring-4 focus:ring-[rgba(165,235,46,0.16)]"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateAdmin(admin.email)}
                        disabled={busyAdminEmail === admin.email}
                        className="theme-btn-primary rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-70"
                      >
                        {busyAdminEmail === admin.email ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditingAdmin}
                        disabled={busyAdminEmail === admin.email}
                        className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] disabled:opacity-70"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-medium text-[var(--color-ink)]">{admin.email}</div>
                    <div className="mt-1 text-xs text-[var(--color-muted)]">
                      Added by {admin.createdBy} on {new Date(admin.createdAt).toLocaleString()}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEditingAdmin(admin.email)}
                        disabled={busyAdminEmail === admin.email}
                        className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] disabled:opacity-70"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteAdminEmail(admin.email)}
                        disabled={busyAdminEmail === admin.email || admin.email === sessionEmail}
                        className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyAdminEmail === admin.email ? "Deleting..." : admin.email === sessionEmail ? "Cannot Delete Self" : "Delete"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteAdminEmail)}
        title="Delete admin account?"
        message="This removes admin access for the selected account."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!pendingDeleteAdminEmail) {
            return;
          }
          await handleDeleteAdmin(pendingDeleteAdminEmail);
          setPendingDeleteAdminEmail(null);
        }}
        onCancel={() => setPendingDeleteAdminEmail(null)}
      />
    </PortalShell>
  );
}
