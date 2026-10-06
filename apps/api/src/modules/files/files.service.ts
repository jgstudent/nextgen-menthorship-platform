import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, UserRole } from "@prisma/client";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { UploadFileDto } from "./dto/upload-file.dto";
import { sanitizeFileName, validateUpload } from "./file-validation";
import { MinioStorageService } from "./minio-storage.service";
import { UploadedFile } from "./uploaded-file.type";

@Injectable()
export class FilesService {
  private readonly bucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioStorageService,
    config: ConfigService
  ) {
    this.bucket = config.get<string>("MINIO_BUCKET") ?? "nextgen-files";
  }

  async upload(file: UploadedFile | undefined, dto: UploadFileDto, user: AuthenticatedUser) {
    validateUpload(file);
    await this.validateLinks(dto, user);

    const originalName = sanitizeFileName(file.originalname);
    const storedName = `${Date.now()}-${cryptoRandom()}-${originalName}`;
    const objectKey = `${user.sub}/${storedName}`;

    await this.storage.ensureBucket(this.bucket);
    await this.storage.putObject(this.bucket, objectKey, file.buffer, file.mimetype, { "original-name": originalName });

    const uploaded = await this.prisma.file.create({
      data: {
        originalName,
        storedName,
        mimeType: file.mimetype,
        size: file.size,
        bucket: this.bucket,
        objectKey,
        url: `/api/files/${objectKey}`,
        uploadedById: user.sub,
        taskId: dto.taskId,
        projectId: dto.projectId,
        commentId: dto.commentId
      },
      include: { uploadedBy: { select: publicUserSelect } }
    });
    await this.audit(user, "FILE_UPLOADED", uploaded.id, { taskId: dto.taskId, projectId: dto.projectId, commentId: dto.commentId, size: uploaded.size, mimeType: uploaded.mimeType });
    return uploaded;
  }

  async attachToTask(taskId: string, file: UploadedFile | undefined, user: AuthenticatedUser) {
    return this.upload(file, { taskId }, user);
  }

  async findAll(user: AuthenticatedUser) {
    return this.prisma.file.findMany({
      where: await this.accessibleFileWhere(user),
      include: { uploadedBy: { select: publicUserSelect } },
      orderBy: { createdAt: "desc" }
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const file = await this.prisma.file.findFirst({
      where: { id, ...(await this.accessibleFileWhere(user)) },
      include: { uploadedBy: { select: publicUserSelect } }
    });
    if (!file) {
      throw new NotFoundException("File not found.");
    }

    const downloadUrl = this.storage.presignedGetObject(this.bucket, file.objectKey, 60 * 5);
    await this.audit(user, "FILE_VIEWED", file.id, { objectKey: file.objectKey, size: file.size, mimeType: file.mimeType });
    return { ...file, downloadUrl };
  }

  async remove(id: string, user: AuthenticatedUser) {
    const file = await this.prisma.file.findFirst({ where: { id, ...(await this.accessibleFileWhere(user)) } });
    if (!file) {
      throw new NotFoundException("File not found.");
    }

    await this.storage.removeObject(file.bucket, file.objectKey).catch(() => undefined);
    await this.audit(user, "FILE_DELETED", file.id, { objectKey: file.objectKey, size: file.size, mimeType: file.mimeType });
    return this.prisma.file.delete({ where: { id } });
  }

  async findByTask(taskId: string, user: AuthenticatedUser) {
    await this.assertTaskAccess(taskId, user);
    return this.prisma.file.findMany({
      where: { taskId },
      include: { uploadedBy: { select: publicUserSelect } },
      orderBy: { createdAt: "desc" }
    });
  }

  private async validateLinks(dto: UploadFileDto, user: AuthenticatedUser) {
    if (!dto.taskId && !dto.projectId && !dto.commentId) {
      return;
    }

    if (dto.taskId) {
      await this.assertTaskAccess(dto.taskId, user);
    }

    if (dto.projectId) {
      await this.assertProjectAccess(dto.projectId, user);
    }

    if (dto.commentId) {
      const comment = await this.prisma.comment.findUnique({
        where: { id: dto.commentId },
        select: { itemId: true }
      });
      if (!comment) {
        throw new NotFoundException("Comment not found.");
      }
      await this.assertTaskAccess(comment.itemId, user);
    }
  }

  private async accessibleFileWhere(user: AuthenticatedUser) {
    if (isGlobalAdmin(user.role)) {
      return {};
    }

    if (user.role === UserRole.BENEFICIARY) {
      return {
        OR: [
          { uploadedById: user.sub },
          { task: { assigneeId: user.sub } },
          { comment: { item: { assigneeId: user.sub } } }
        ]
      };
    }

    if (user.role === UserRole.SPONSOR_VIEWER) {
      return { uploadedById: user.sub };
    }

    const workspaceIds = await this.userWorkspaceIds(user.sub);
    return {
      OR: [
        { uploadedById: user.sub },
        { task: { board: { workspaceId: { in: workspaceIds } } } },
        { project: { workspaceId: { in: workspaceIds } } },
        { comment: { item: { board: { workspaceId: { in: workspaceIds } } } } }
      ]
    };
  }

  private async assertTaskAccess(taskId: string, user: AuthenticatedUser) {
    const task = await this.prisma.item.findUnique({
      where: { id: taskId },
      select: { assigneeId: true, board: { select: { workspaceId: true } } }
    });
    if (!task) {
      throw new NotFoundException("Task not found.");
    }

    if (user.role === UserRole.BENEFICIARY && task.assigneeId === user.sub) {
      return;
    }

    await this.assertWorkspaceAccess(task.board.workspaceId, user);
  }

  private async assertProjectAccess(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } });
    if (!project) {
      throw new NotFoundException("Project not found.");
    }

    await this.assertWorkspaceAccess(project.workspaceId, user);
  }

  private async assertWorkspaceAccess(workspaceId: string, user: AuthenticatedUser) {
    if (isGlobalAdmin(user.role)) {
      return;
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.sub } }
    });

    if (!member) {
      throw new ForbiddenException("You do not have access to this file.");
    }
  }

  private async userWorkspaceIds(userId: string) {
    const memberships = await this.prisma.workspaceMember.findMany({ where: { userId }, select: { workspaceId: true } });
    return memberships.map((membership) => membership.workspaceId);
  }

  private audit(user: AuthenticatedUser, action: string, entityId: string, metadata: Record<string, unknown>) {
    return this.prisma.organizationAuditLog.create({
      data: {
        actorId: user.sub,
        action,
        entityType: "File",
        entityId,
        metadata: cleanJson(metadata)
      }
    });
  }
}

function isGlobalAdmin(role: UserRole) {
  return role === UserRole.SUPER_ADMIN || role === UserRole.EXECUTIVE;
}

function cryptoRandom() {
  return Math.random().toString(36).slice(2, 10);
}

function cleanJson(metadata: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined)) as Prisma.InputJsonValue;
}
