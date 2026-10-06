import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";

import { loadBootstrapEnvironment, verifyBootstrapAdmin } from "./bootstrap-admin";

const { email: adminEmail, password: adminPassword } = loadBootstrapEnvironment();
const prisma = new PrismaClient();



async function main() {
  if (adminPassword.length < 16) {
    throw new Error("ADMIN_PASSWORD must be at least 16 characters.");
  }

  const password = await argon2.hash(adminPassword);

  const org = await prisma.organization.upsert({
    where: { slug: "nextgen-haitian-empowerment" },
    update: {
      name: "NextGen Haitian Empowerment, Inc.",
      displayName: "NextGen Haitian Empowerment",
      supportEmail: adminEmail,
      websiteUrl: "https://nextgenhaitian.org"
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
    update: {
      firstName: "NextGen",
      lastName: "Admin",
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isActive: true,
      password
    },
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

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: operations.id, userId: admin.id } },
    update: { role: UserRole.SUPER_ADMIN },
    create: { workspaceId: operations.id, userId: admin.id, role: UserRole.SUPER_ADMIN }
  });

  console.log(`Reset ${adminEmail} as an active SUPER_ADMIN.`);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

