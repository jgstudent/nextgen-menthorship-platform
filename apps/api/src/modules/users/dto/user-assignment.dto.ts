import { UserRole } from "@prisma/client";
import { IsEnum, IsString } from "class-validator";

export class WorkspaceAssignmentDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

export class ProgramAssignmentDto {
  @IsString()
  programId!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}

export class ProjectAssignmentDto {
  @IsString()
  projectId!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
