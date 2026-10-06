import { Injectable } from "@nestjs/common";
import { AccessService } from "../../common/access/access.service";
import { publicUserSelect } from "../../common/selects/public-user.select";
import { AuthenticatedUser } from "../../common/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCommentDto } from "./dto/create-comment.dto";

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService
  ) {}

  async create(user: AuthenticatedUser, dto: CreateCommentDto) {
    await this.access.assertTaskAccess(dto.itemId, user);
    return this.prisma.comment.create({
      data: { ...dto, authorId: user.sub },
      include: { author: { select: publicUserSelect }, files: true }
    });
  }

  async findByTask(itemId: string, user: AuthenticatedUser) {
    await this.access.assertTaskAccess(itemId, user);
    return this.prisma.comment.findMany({
      where: { itemId },
      include: { author: { select: publicUserSelect }, files: true },
      orderBy: { createdAt: "asc" }
    });
  }
}
