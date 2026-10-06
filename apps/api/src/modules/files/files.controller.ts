import { Body, Controller, Delete, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UploadFileDto } from "./dto/upload-file.dto";
import { MAX_FILE_SIZE_BYTES } from "./file-validation";
import { FilesService } from "./files.service";
import { UploadedFile as UploadedFileType } from "./uploaded-file.type";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("files/upload")
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VOLUNTEER)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  upload(@UploadedFile() file: UploadedFileType | undefined, @Body() dto: UploadFileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.files.upload(file, dto, user);
  }

  @Get("files")
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.files.findAll(user);
  }

  @Get("files/:id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.files.findOne(id, user);
  }

  @Delete("files/:id")
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VOLUNTEER)
  remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.files.remove(id, user);
  }

  @Get("tasks/:taskId/files")
  findByTask(@Param("taskId") taskId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.files.findByTask(taskId, user);
  }

  @Post("tasks/:taskId/files")
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_MEMBER, UserRole.VOLUNTEER)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_FILE_SIZE_BYTES } }))
  attachToTask(@Param("taskId") taskId: string, @UploadedFile() file: UploadedFileType | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.files.attachToTask(taskId, file, user);
  }
}
