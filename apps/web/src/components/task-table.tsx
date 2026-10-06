"use client";

import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Archive, Paperclip } from "lucide-react";
import type { Task } from "@/types/domain";
import { Button } from "./ui/button";
import { PriorityBadge, StatusBadge } from "./status-badge";

const helper = createColumnHelper<Task>();

const baseColumns = [
  helper.accessor("title", { header: "Task" }),
  helper.accessor("status", { header: "Status", cell: (info) => <StatusBadge status={info.getValue()} /> }),
  helper.accessor("priority", { header: "Priority", cell: (info) => <PriorityBadge priority={info.getValue()} /> }),
  helper.accessor((row) => row.assignee?.firstName ?? "Unassigned", { id: "assignee", header: "Owner" }),
  helper.accessor((row) => row.files?.length ?? 0, {
    id: "files",
    header: "Files",
    cell: (info) => (
      <span className="inline-flex items-center gap-1 text-sm text-[#64748B]">
        <Paperclip className="h-4 w-4" /> {info.getValue()}
      </span>
    )
  }),
  helper.accessor("dueDate", { header: "Due Date", cell: (info) => (info.getValue() ? new Date(info.getValue() as string).toLocaleDateString() : "No date") })
];

export function TaskTable({ tasks, canArchive = false, onArchive }: { tasks: Task[]; canArchive?: boolean; onArchive?: (task: Task) => void }) {
  const columns = canArchive && onArchive
    ? [
        ...baseColumns,
        helper.display({
          id: "actions",
          header: "Action",
          cell: ({ row }) => (
            <Button type="button" className="h-8 border border-[#CBD5E1] bg-white px-2 text-xs text-[#64748B] shadow-none hover:bg-[#F8FAFC]" onClick={() => onArchive(row.original)}>
              <Archive className="h-3.5 w-3.5" /> Archive
            </Button>
          )
        })
      ]
    : baseColumns;
  const table = useReactTable({ data: tasks, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-panel">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#0B1220] text-xs uppercase text-white">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-4 py-3 font-semibold">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-slate-100">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="text-[#1E293B] transition hover:bg-blue-50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
