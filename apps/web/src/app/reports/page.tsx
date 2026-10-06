import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

const placeholders = [
  { title: "Project Health", description: "Track active projects, overdue tasks, and completion trends." },
  { title: "Workspace Activity", description: "Summarize task movement and collaboration activity by program area." },
  { title: "Volunteer Capacity", description: "Review assigned work and upcoming needs for nonprofit coordination." }
];

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="A future home for lightweight operational reporting and project visibility." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {placeholders.map((item) => (
          <Card key={item.title} className="border-t-4 border-t-[#1D4ED8] p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
            <h3 className="font-semibold text-[#0B1220]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">{item.description}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
