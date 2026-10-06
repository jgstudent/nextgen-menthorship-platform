import { UserRole, UserStatus } from "@prisma/client";
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from "class-validator";
import { ProgramAssignmentDto, ProjectAssignmentDto, WorkspaceAssignmentDto } from "./user-assignment.dto";

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  temporaryPassword?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workspaceIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  programIds?: string[];

  @IsArray()
  @IsOptional()
  workspaceAssignments?: WorkspaceAssignmentDto[];

  @IsArray()
  @IsOptional()
  programAssignments?: ProgramAssignmentDto[];

  @IsArray()
  @IsOptional()
  projectAssignments?: ProjectAssignmentDto[];
}
