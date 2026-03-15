"use client";
/* eslint-disable react-hooks/incompatible-library */

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

type AdminDataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  isLoading?: boolean;
  emptyMessage: string;
  pageIndex: number;
  canPreviousPage: boolean;
  canNextPage: boolean;
  onPreviousPage: () => void | Promise<void>;
  onNextPage: () => void | Promise<void>;
  onRowClick?: (row: TData) => void;
};

export function AdminDataTable<TData>({
  data,
  columns,
  isLoading = false,
  emptyMessage,
  pageIndex,
  canPreviousPage,
  canNextPage,
  onPreviousPage,
  onNextPage,
  onRowClick,
}: AdminDataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="overflow-hidden rounded-[24px] border border-[var(--color-border-strong)] bg-white shadow-[var(--shadow-soft)]">
      <div className="overflow-x-auto">
        <Table className="table-fixed">
          <TableHeader className="bg-[var(--color-panel)]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading && data.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-12">
                  <div className="flex flex-col items-center justify-center gap-3 text-[var(--color-muted)]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading data</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={onRowClick ? "cursor-pointer" : ""}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={`${cell.column.id === "actions" ? "w-[84px] whitespace-nowrap text-right" : "align-top"} `}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-[var(--color-muted)]"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-4 py-3">
        <div className="text-sm text-[var(--color-muted)]">
          Page {pageIndex + 1}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void onPreviousPage()}
            disabled={!canPreviousPage || isLoading}
            className="inline-flex items-center rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => void onNextPage()}
            disabled={!canNextPage || isLoading}
            className="inline-flex items-center rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm font-medium text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
