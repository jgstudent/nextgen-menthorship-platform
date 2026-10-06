"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, FileText, ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { api, uploadFormData } from "@/lib/api";
import { fileKind, formatFileSize } from "@/lib/files";
import { canUploadFiles } from "@/lib/permissions";
import type { FileAttachment } from "@/types/domain";
import { useAuth } from "./auth/auth-provider";
import { Button } from "./ui/button";
import { useToast } from "./ui/toast";

const allowedExtensions = ["pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg", "txt", "csv"];
const maxFileSize = 25 * 1024 * 1024;

export function FileAttachments({ taskId }: { taskId: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const mayUpload = canUploadFiles(user?.role);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const filesQuery = useQuery({
    queryKey: ["task-files", taskId],
    queryFn: () => api<FileAttachment[]>(`/tasks/${taskId}/files`),
    enabled: Boolean(taskId)
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["task-files", taskId] }),
      queryClient.invalidateQueries({ queryKey: ["boards"] }),
      queryClient.invalidateQueries({ queryKey: ["board"] }),
      queryClient.invalidateQueries({ queryKey: ["tasks"] })
    ]);
  };

  const upload = useMutation({
    mutationFn: async (file: File) => {
      validateClientFile(file);
      const form = new FormData();
      form.append("file", file);
      return uploadFormData<FileAttachment>(`/tasks/${taskId}/files`, form, setProgress);
    },
    onSuccess: async () => {
      setProgress(null);
      toast({ title: "File attached", description: "The file was uploaded to this task." });
      await invalidate();
    },
    onError: (error) => {
      setProgress(null);
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Please try another file.", tone: "error" });
    }
  });

  const remove = useMutation({
    mutationFn: (fileId: string) => api<FileAttachment>(`/files/${fileId}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast({ title: "Attachment removed" });
      await invalidate();
    },
    onError: () => toast({ title: "Could not remove attachment", description: "Please try again.", tone: "error" })
  });

  async function openFile(fileId: string) {
    try {
      const file = await api<FileAttachment>(`/files/${fileId}`);
      if (file.downloadUrl) {
        window.open(file.downloadUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      toast({ title: "Could not open file", description: "Please try again.", tone: "error" });
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) {
      upload.mutate(file);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  const files = filesQuery.data ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#0B1220]">Attachments</h3>
        {mayUpload ? (
          <Button type="button" className="h-9 px-3" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        ) : null}
      </div>

      {mayUpload ? (
        <>
          <input ref={inputRef} type="file" className="hidden" accept={allowedExtensions.map((extension) => `.${extension}`).join(",")} onChange={(event: ChangeEvent<HTMLInputElement>) => handleFiles(event.target.files)} />

          <div
            className={`rounded-lg border border-dashed p-5 text-center transition ${dragging ? "border-[#10B981] bg-[#D1FAE5]" : "border-[#CBD5E1] bg-[#F8FAFC]"}`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <Paperclip className="mx-auto h-5 w-5 text-[#1D4ED8]" />
            <p className="mt-2 text-sm font-medium text-[#1E293B]">Drop a file here or use upload</p>
            <p className="mt-1 text-xs text-[#64748B]">PDF, DOCX, XLSX, PPTX, PNG, JPG, TXT, CSV up to 25 MB</p>
            {progress !== null ? (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-[#1D4ED8]" style={{ width: `${progress}%` }} />
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {filesQuery.isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : files.length ? (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="rounded-md bg-[#DBEAFE] p-2 text-[#1D4ED8]">{iconForFile(file.originalName)}</span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#1E293B]">{file.originalName}</p>
                  <p className="text-xs text-[#64748B]">
                    {fileKind(file.originalName)} · {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" className="h-8 w-8 bg-white p-0 text-[#1E293B] ring-1 ring-[#E2E8F0] hover:bg-[#F8FAFC]" onClick={() => openFile(file.id)} aria-label="Open file">
                  <Download className="h-4 w-4" />
                </Button>
                {mayUpload ? (
                  <Button type="button" className="h-8 w-8 bg-white p-0 text-red-600 ring-1 ring-[#E2E8F0] hover:bg-red-50" onClick={() => remove.mutate(file.id)} disabled={remove.isPending} aria-label="Delete file">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-[#E2E8F0] bg-white p-4 text-sm text-[#64748B]">No files attached yet.</p>
      )}
    </section>
  );
}

function validateClientFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowedExtensions.includes(extension)) {
    throw new Error("This file type is not supported.");
  }
  if (file.size > maxFileSize) {
    throw new Error("File exceeds the 25 MB size limit.");
  }
}

function iconForFile(name: string) {
  const extension = name.split(".").pop()?.toLowerCase();
  if (["png", "jpg", "jpeg"].includes(extension ?? "")) {
    return <ImageIcon className="h-4 w-4" />;
  }
  if (["xlsx", "csv"].includes(extension ?? "")) {
    return <FileSpreadsheet className="h-4 w-4" />;
  }
  return <FileText className="h-4 w-4" />;
}
