import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BoardsService } from "./boards.service";
import { CreateBoardDto } from "./dto/create-board.dto";
import { CreateBoardColumnDto } from "./dto/create-board-column.dto";
import { CreateBoardGroupDto } from "./dto/create-board-group.dto";

@Controller("boards")
@UseGuards(JwtAuthGuard, RolesGuard)
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query("projectId") projectId?: string) {
    return this.boards.findAll(user, projectId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.boards.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER)
  create(@Body() dto: CreateBoardDto, @CurrentUser() user: AuthenticatedUser) {
    return this.boards.create(dto, user);
  }

  @Post(":id/groups")
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER)
  createGroup(@Param("id") boardId: string, @Body() dto: CreateBoardGroupDto, @CurrentUser() user: AuthenticatedUser) {
    return this.boards.createGroup(boardId, dto, user);
  }

  @Post(":id/columns")
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER)
  createColumn(@Param("id") boardId: string, @Body() dto: CreateBoardColumnDto, @CurrentUser() user: AuthenticatedUser) {
    return this.boards.createColumn(boardId, dto, user);
  }
}
