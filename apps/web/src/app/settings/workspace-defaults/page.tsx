"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function WorkspaceDefaultsPage() {
  return (
    <>
      <PageHeader title="Workspace Defaults" description="Review the defaults that will guide new pilot workspaces and operational records." />
      <Card className="max-w-2xl p-5">
        <div className="space-y-4">
          <Select defaultValue="NOT_STARTED" disabled>
            <option value="NOT_STARTED">Default task status: Not Started</option>
          </Select>
          <Select defaultValue="PLANNING" disabled>
            <option value="PLANNING">Default project status: Planning</option>
          </Select>
          <Select defaultValue="MEDIUM" disabled>
            <option value="MEDIUM">Default priority: Medium</option>
          </Select>
          <Input defaultValue="NextGen Operations" disabled aria-label="Optional default workspace name" />
          <div className="rounded-md border border-[#D4A017]/40 bg-[#D4A017]/10 p-3 text-sm text-[var(--text-secondary)]">
            These defaults are visible for pilot readiness. Persistent workspace-default configuration is coming soon, so save is intentionally disabled.
          </div>
          <Button type="button" disabled>Save Defaults Coming Soon</Button>
        </div>
      </Card>
    </>
  );
}
