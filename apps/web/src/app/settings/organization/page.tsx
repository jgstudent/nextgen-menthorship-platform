"use client";

import { FormEvent, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import type { Organization } from "@/types/domain";

type OrganizationForm = {
  name: string;
  displayName: string;
  supportEmail: string;
  logoUrl: string;
  websiteUrl: string;
  missionSummary: string;
  enabledAddOns: string[];
};

const emptyForm: OrganizationForm = {
  name: "",
  displayName: "",
  supportEmail: "",
  logoUrl: "",
  websiteUrl: "",
  missionSummary: "",
  enabledAddOns: []
};

export default function OrganizationSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = user?.role === "SUPER_ADMIN" || user?.role === "EXECUTIVE";
  const [form, setForm] = useState<OrganizationForm>(emptyForm);

  const { data, isLoading } = useQuery({ queryKey: ["organizations"], queryFn: () => api<Organization[]>("/organizations") });
  const organization = data?.[0];

  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name,
        displayName: organization.displayName ?? "",
        supportEmail: organization.supportEmail ?? "",
        logoUrl: organization.logoUrl ?? "",
        websiteUrl: organization.websiteUrl ?? "",
        missionSummary: organization.missionSummary ?? "",
        enabledAddOns: organization.enabledAddOns ?? []
      });
    }
  }, [organization]);

  const save = useMutation({
    mutationFn: () => api<Organization>(`/organizations/${organization?.id}`, { method: "PATCH", body: JSON.stringify(toPayload(form, user?.role === "SUPER_ADMIN")) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      toast({ title: "Organization profile saved", description: "The live pilot organization settings were updated.", tone: "success" });
    },
    onError: (error) => toast({ title: "Unable to save organization", description: error instanceof Error ? error.message : "Please check the settings and try again.", tone: "error" })
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (organization && canEdit) {
      save.mutate();
    }
  }

  return (
    <>
      <PageHeader title="Organization Profile" description="Pilot-ready identity, support, and mission details for NextGen Haitian Empowerment." />
      <Card className="max-w-4xl p-5">
        {isLoading ? <p className="text-sm text-[var(--text-secondary)]">Loading organization profile...</p> : (
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Legal organization name"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={!canEdit} required /></Field>
              <Field label="Public display name"><Input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} disabled={!canEdit} /></Field>
              <Field label="Support email"><Input type="email" value={form.supportEmail} onChange={(event) => setForm({ ...form, supportEmail: event.target.value })} disabled={!canEdit} /></Field>
              <Field label="Website URL"><Input type="url" value={form.websiteUrl} onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })} disabled={!canEdit} /></Field>
            </div>
            <Field label="Logo placeholder / future image URL"><Input value={form.logoUrl} onChange={(event) => setForm({ ...form, logoUrl: event.target.value })} disabled={user?.role !== "SUPER_ADMIN"} placeholder="https://..." /></Field>
            <Field label="Mission summary"><Textarea value={form.missionSummary} onChange={(event) => setForm({ ...form, missionSummary: event.target.value })} disabled={!canEdit} /></Field>
            <fieldset className="rounded-lg border border-[var(--border)] p-4"><legend className="px-1 text-sm font-semibold">Optional add-ons</legend><label className="mt-2 flex items-start gap-3"><input type="checkbox" className="mt-1 h-4 w-4" checked={form.enabledAddOns.includes("MENTORSHIP")} onChange={(event) => setForm({ ...form, enabledAddOns: event.target.checked ? Array.from(new Set([...form.enabledAddOns, "MENTORSHIP"])) : form.enabledAddOns.filter((item) => item !== "MENTORSHIP") })} disabled={user?.role !== "SUPER_ADMIN"} /><span><span className="block text-sm font-semibold">Mentorship & Tutoring</span><span className="block text-sm text-[var(--text-secondary)]">Programs, public applications, participant review, and matching. Navigation is shown only when this add-on is enabled.</span></span></label>{user?.role !== "SUPER_ADMIN" ? <p className="mt-2 text-xs text-[var(--text-secondary)]">A Super Admin manages commercial add-on access.</p> : null}</fieldset>
            <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
              <p className="text-sm text-[var(--text-secondary)]">Logo upload storage is prepared as a URL field for now. Only Super Admin can change the logo.</p>
              <Button type="submit" disabled={!canEdit || save.isPending || !organization}>{save.isPending ? "Saving..." : "Save Profile"}</Button>
            </div>
          </form>
        )}
      </Card>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-[var(--text-primary)]">{label}<span className="mt-1 block">{children}</span></label>;
}

function toPayload(form: OrganizationForm, includeAddOns: boolean) {
  return {
    name: form.name,
    displayName: form.displayName || undefined,
    supportEmail: form.supportEmail || undefined,
    logoUrl: form.logoUrl || undefined,
    websiteUrl: form.websiteUrl || undefined,
    missionSummary: form.missionSummary || undefined,
    ...(includeAddOns ? { enabledAddOns: form.enabledAddOns } : {})
  };
}
