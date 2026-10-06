import { MeetingManagement } from "@/components/meetings/meeting-management";
import { PageHeader } from "@/components/layout/page-header";

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" description="A monthly view of shared meetings and upcoming schedule commitments." />
      <MeetingManagement calendar />
    </>
  );
}
