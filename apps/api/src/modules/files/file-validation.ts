import { BadRequestException } from "@nestjs/common";
import { UploadedFile } from "./uploaded-file.type";

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "text/plain",
  "text/csv",
  "application/csv"
]);

const allowedExtensions = new Set(["pdf", "docx", "xlsx", "pptx", "png", "jpg", "jpeg", "txt", "csv"]);

export function validateUpload(file?: UploadedFile): asserts file is UploadedFile {
  if (!file) {
    throw new BadRequestException("A file is required.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestException("File exceeds the 25 MB size limit.");
  }

  const extension = getExtension(file.originalname);
  if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.mimetype)) {
    throw new BadRequestException("Unsupported file type.");
  }
}

export function sanitizeFileName(name: string) {
  const baseName = name.split(/[\\/]/).pop() ?? "file";
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_{2,}/g, "_").slice(0, 120);
}

export function getExtension(name: string) {
  return (name.split(".").pop() ?? "").toLowerCase();
}
