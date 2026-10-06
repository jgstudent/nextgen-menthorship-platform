import { Module } from "@nestjs/common";
import { MentorshipModule } from "./modules/mentorship/mentorship.module";
import { ConfigModule } from "@nestjs/config";
import { AccessModule } from "./common/access/access.module";
import { ApprovalsModule } from "./modules/approvals/approvals.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BoardsModule } from "./modules/boards/boards.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { FilesModule } from "./modules/files/files.module";
import { GovernanceModule } from "./modules/governance/governance.module";
import { MeetingsModule } from "./modules/meetings/meetings.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { BeneficiariesModule } from "./modules/beneficiaries/beneficiaries.module";
import { ProgramsModule } from "./modules/programs/programs.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { UsersModule } from "./modules/users/users.module";
import { WorkshopsModule } from "./modules/workshops/workshops.module";
import { WorkspacesModule } from "./modules/workspaces/workspaces.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AccessModule,
    AuthModule,
    MentorshipModule,
    UsersModule,
    ApprovalsModule,
    DocumentsModule,
    OrganizationsModule,
    WorkspacesModule,
    ProjectsModule,
    BoardsModule,
    TasksModule,
    CommentsModule,
    FilesModule,
    GovernanceModule,
    MeetingsModule,
    ProgramsModule,
    BeneficiariesModule,
    WorkshopsModule,
    DashboardModule
  ]
})
export class AppModule {}
