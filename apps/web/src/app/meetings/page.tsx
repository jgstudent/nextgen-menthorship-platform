import { MeetingManagement } from "@/components/meetings/meeting-management";
import { PageHeader } from "@/components/layout/page-header";

export default function MeetingsPage() {
  return (
    <>
      <PageHeader title="Meetings" description="Schedule meetings, track attendees, capture notes, and turn action items into tasks." />
      <MeetingManagement />
    </>
  );
}
