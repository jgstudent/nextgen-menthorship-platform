import { Badge } from "@/components/ui/badge";
import type { Priority, TaskStatus } from "@/types/domain";

export function StatusBadge({ status }: { status: TaskStatus | string }) {
  const tone = status === "COMPLETED" || status === "APPROVED" ? "green" : status === "BLOCKED" ? "red" : status === "IN_PROGRESS" ? "blue" : status === "WAITING" ? "gold" : "gray";
  return <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const tone = priority === "CRITICAL" ? "red" : priority === "HIGH" ? "gold" : priority === "MEDIUM" ? "blue" : "gray";
  return <Badge tone={tone}>{priority}</Badge>;
}
