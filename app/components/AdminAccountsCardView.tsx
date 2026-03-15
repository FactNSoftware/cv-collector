"use client";

import type { AdminAccount } from "../../lib/admin-access";

type AdminAccountsCardViewProps = {
  items: AdminAccount[];
  sessionEmail: string;
  editingEmail: string | null;
  editedEmail: string;
  busyAdminEmail: string | null;
  onEditedEmailChange: (value: string) => void;
  onStartEdit: (email: string) => void;
  onCancelEdit: () => void;
  onSave: (email: string) => void;
  onDelete: (email: string) => void;
};

export function AdminAccountsCardView({
  items,
  sessionEmail,
  editingEmail,
  editedEmail,
  busyAdminEmail,
  onEditedEmailChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: AdminAccountsCardViewProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-[var(--color-border)] bg-white/70 p-6 text-sm text-[var(--color-muted)]">
        No admins match the current search.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((admin) => (
        <div key={admin.email} className="rounded-[24px] border border-[var(--color-border)] bg-white p-4">
          {editingEmail === admin.email ? (
            <div className="space-y-3">
              <input
                value={editedEmail}
                onChange={(event) => onEditedEmailChange(event.target.value)}
                placeholder="admin@example.com"
                className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm outline-none focus:border-[var(--color-brand)]"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onSave(admin.email)}
                  disabled={busyAdminEmail === admin.email}
                  className="theme-btn-primary rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-70"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={onCancelEdit}
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
                  onClick={() => onStartEdit(admin.email)}
                  disabled={busyAdminEmail === admin.email}
                  className="rounded-2xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] disabled:opacity-70"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(admin.email)}
                  disabled={busyAdminEmail === admin.email || admin.email === sessionEmail}
                  className="rounded-2xl border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {admin.email === sessionEmail ? "Cannot Delete Self" : "Delete"}
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
