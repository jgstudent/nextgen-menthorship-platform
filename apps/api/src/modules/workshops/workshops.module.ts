import { Module } from "@nestjs/common";
import { AccessModule } from "../../common/access/access.module";
import { PrismaModule } from "../prisma/prisma.module";
import { WorkshopsController } from "./workshops.controller";
import { WorkshopsService } from "./workshops.service";

@Module({
  imports: [PrismaModule, AccessModule],
  controllers: [WorkshopsController],
  providers: [WorkshopsService]
})
export class WorkshopsModule {}
