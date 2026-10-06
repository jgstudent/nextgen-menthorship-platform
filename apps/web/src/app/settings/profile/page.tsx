"use client";

import { FormEvent, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";
import { roleLabel } from "@/lib/permissions";
import type { User } from "@/types/domain";

export default function ProfileSettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setAvatarUrl(user.avatarUrl ?? "");
    }
  }, [user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await api<User>("/auth/me", { method: "PATCH", body: JSON.stringify({ firstName, lastName, avatarUrl: avatarUrl || undefined }) });
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Profile updated", description: "Your profile information was saved.", tone: "success" });
    } catch (error) {
      toast({ title: "Unable to save profile", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="User Profile" description="Update your visible profile details for the collaboration hub." />
      <Card className="max-w-2xl p-5">
        {user ? (
          <form className="space-y-4" onSubmit={submit}>
            <div className="flex items-center gap-4">
              <Avatar user={{ ...user, avatarUrl }} />
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{user.email}</p>
                <Badge tone="blue">{roleLabel(user.role)}</Badge>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="First name" required />
              <Input value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Last name" required />
            </div>
            <Input value={user.email} readOnly aria-label="Email" />
            <Input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="Avatar/photo URL placeholder" />
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Profile"}</Button>
          </form>
        ) : null}
      </Card>
    </>
  );
}
