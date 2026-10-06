"use client";

import { DndContext } from "@dnd-kit/core";
import { Task, BoardGroup } from "@/types/domain";
import { Card } from "./ui/card";
import { PriorityBadge, StatusBadge } from "./status-badge";

export function KanbanBoard({ groups, tasks }: { groups: BoardGroup[]; tasks: Task[] }) {
  return (
    <DndContext>
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map((group) => (
          <section key={group.id} className="min-h-96 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-[#0B1220]">{group.name}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#64748B] ring-1 ring-[#E2E8F0]">{tasks.filter((task) => task.groupId === group.id).length}</span>
            </div>
            <div className="space-y-3">
              {tasks
                .filter((task) => task.groupId === group.id)
                .map((task) => (
                  <Card key={task.id} className="p-4 transition hover:-translate-y-0.5 hover:border-[#1D4ED8] hover:shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="font-semibold text-[#0B1220]">{task.title}</h4>
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#64748B]">{task.description ?? "No description yet."}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <StatusBadge status={task.status} />
                      <span className="text-xs font-medium text-[#64748B]">{task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned"}</span>
                    </div>
                  </Card>
                ))}
            </div>
          </section>
        ))}
      </div>
    </DndContext>
  );
}
