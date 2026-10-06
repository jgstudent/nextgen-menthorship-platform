import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { loadBootstrapEnvironment, verifyBootstrapAdmin } from "./bootstrap-admin";

const { email: adminEmail, password: adminPassword } = loadBootstrapEnvironment();
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) await verifyBootstrapAdmin(existing, adminPassword);

  const password = await argon2.hash(adminPassword);

  const org = await prisma.organization.upsert({
    where: { slug: "nextgen-haitian-empowerment" },
    update: {
      name: "NextGen Haitian Empowerment, Inc.",
      displayName: "NextGen Haitian Empowerment",
      supportEmail: adminEmail,
      websiteUrl: "https://nextgenhaitian.org",
      missionSummary: "Empowering Haitian communities through education, technology, infrastructure, and accountable nonprofit operations."
    },
    create: {
      name: "NextGen Haitian Empowerment, Inc.",
      slug: "nextgen-haitian-empowerment",
      displayName: "NextGen Haitian Empowerment",
      supportEmail: adminEmail,
      websiteUrl: "https://nextgenhaitian.org",
      missionSummary: "Empowering Haitian communities through education, technology, infrastructure, and accountable nonprofit operations."
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      firstName: "NextGen",
      lastName: "Admin",
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      password
    }
  });

  await verifyBootstrapAdmin(admin, adminPassword);

  const operations = await prisma.workspace.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "nextgen-operations" } },
    update: {
      name: "NextGen Operations",
      description: "Baseline operational workspace for live pilot setup."
    },
    create: {
      organizationId: org.id,
      name: "NextGen Operations",
      slug: "nextgen-operations",
      description: "Baseline operational workspace for live pilot setup."
    }
  });

  const executiveGovernance = await prisma.workspace.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: "executive-governance" } },
    update: {
      name: "Executive Governance",
      description: "Restricted board-level governance, policy, approvals, confidential files, and executive signatures."
    },
    create: {
      organizationId: org.id,
      name: "Executive Governance",
      slug: "executive-governance",
      description: "Restricted board-level governance, policy, approvals, confidential files, and executive signatures."
    }
  });

  for (const workspace of [operations, executiveGovernance]) {
    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: admin.id } },
      update: { role: UserRole.SUPER_ADMIN },
      create: { workspaceId: workspace.id, userId: admin.id, role: UserRole.SUPER_ADMIN }
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

