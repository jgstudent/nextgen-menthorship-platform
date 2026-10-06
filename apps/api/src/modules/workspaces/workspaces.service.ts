import { Injectable } from "@nestjs/common";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateWorkspaceDto } from "./dto/create-workspace.dto";

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService
  ) {}

  create(dto: CreateWorkspaceDto) {
    return this.prisma.workspace.create({ data: dto });
  }

  findAll(user: AuthenticatedUser) {
    return this.prisma.workspace.findMany({
      where: this.access.workspaceWhere(user),
      orderBy: { name: "asc" },
      include: {
        organization: true,
        _count: { select: { projects: true, members: true } }
      }
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    await this.access.assertWorkspaceAccess(id, user);
    return this.prisma.workspace.findUniqueOrThrow({
      where: { id },
      include: {
        organization: true,
        projects: { include: { boards: true } },
        members: { include: { user: { select: publicUserSelect } } }
      }
    });
  }
}
