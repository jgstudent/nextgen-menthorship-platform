import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";

export default function BeneficiaryProgramsPage() {
  return (
    <>
      <PageHeader title="My Programs" description="Your assigned programs, progress, workshops, and resources appear here." />
      <Card className="border-dashed p-8 text-center">
        <h3 className="font-semibold text-[var(--text-primary)]">Program assignments</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          Program details are available through your beneficiary portal and scoped to your personal access.
        </p>
      </Card>
    </>
  );
}
