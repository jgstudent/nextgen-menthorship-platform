import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

const placeholders = [
  { title: "Member Directory", description: "View staff, project leads, volunteers, and read-only collaborators." },
  { title: "Workspace Roles", description: "Review role assignments by workspace as access controls mature." },
  { title: "Invitations", description: "Invite flow and onboarding status will be added in a later Phase 1 refinement." }
];

export default function MembersPage() {
  return (
    <>
      <PageHeader title="Members" description="Manage the people who collaborate across NextGen workspaces and projects." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {placeholders.map((item) => (
          <Card key={item.title} className="border-t-4 border-t-[#D4A017] p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
            <h3 className="font-semibold text-[#0B1220]">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">{item.description}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
