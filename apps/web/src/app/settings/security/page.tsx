"use client";

import { FormEvent, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { api } from "@/lib/api";

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", description: "Confirm the new password and try again.", tone: "error" });
      return;
    }
    setSaving(true);
    try {
      await api("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed", description: "Your account password was updated successfully.", tone: "success" });
    } catch (error) {
      toast({ title: "Unable to change password", description: error instanceof Error ? error.message : "Please try again.", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Security" description="Manage practical account security controls for the live pilot." />
      <Card className="max-w-xl p-5">
        <form className="space-y-4" onSubmit={submit}>
          <Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Current password" required />
          <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="New password" minLength={8} required />
          <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" minLength={8} required />
          <p className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3 text-sm text-[var(--text-secondary)]">Passwords must be at least 8 characters. Email-based reset links are intentionally not enabled yet.</p>
          <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Change Password"}</Button>
        </form>
      </Card>
    </>
  );
}
