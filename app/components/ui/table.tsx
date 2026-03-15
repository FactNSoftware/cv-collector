"use client";

import * as React from "react";

type TableProps = React.TableHTMLAttributes<HTMLTableElement>;
type TableSectionProps = React.HTMLAttributes<HTMLTableSectionElement>;
type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>;
type TableCellProps = React.TdHTMLAttributes<HTMLTableCellElement>;
type TableHeadProps = React.ThHTMLAttributes<HTMLTableCellElement>;

export const Table = React.forwardRef<HTMLTableElement, TableProps>(function Table(
  { className = "", ...props },
  ref,
) {
  return <table ref={ref} className={`w-full caption-bottom text-sm ${className}`.trim()} {...props} />;
});

export const TableHeader = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(function TableHeader(
  { className = "", ...props },
  ref,
) {
  return <thead ref={ref} className={`[&_tr]:border-b [&_tr]:border-[var(--color-border)] ${className}`.trim()} {...props} />;
});

export const TableBody = React.forwardRef<HTMLTableSectionElement, TableSectionProps>(function TableBody(
  { className = "", ...props },
  ref,
) {
  return <tbody ref={ref} className={`[&_tr:last-child]:border-0 ${className}`.trim()} {...props} />;
});

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(function TableRow(
  { className = "", ...props },
  ref,
) {
  return (
    <tr
      ref={ref}
      className={`border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-panel)]/35 ${className}`.trim()}
      {...props}
    />
  );
});

export const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(function TableHead(
  { className = "", ...props },
  ref,
) {
  return (
    <th
      ref={ref}
      className={`h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)] ${className}`.trim()}
      {...props}
    />
  );
});

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(function TableCell(
  { className = "", ...props },
  ref,
) {
    return (
      <td
        ref={ref}
        className={`px-4 py-4 align-middle text-sm text-[var(--color-ink)] ${className}`.trim()}
        {...props}
      />
    );
});
