import { BoardManagement } from "@/components/board-management";
import { PageHeader } from "@/components/layout/page-header";

export default function BoardsPage() {
  return (
    <>
      <PageHeader title="Boards" description="Create boards, organize task groups, and move work across a clean Kanban view." />
      <BoardManagement />
    </>
  );
}
