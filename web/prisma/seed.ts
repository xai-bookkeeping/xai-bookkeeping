import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const admin = await db.user.upsert({
    where: { email: "admin@xaibooks.ae" },
    update: {},
    create: {
      email: "admin@xaibooks.ae",
      firstName: "XAI",
      lastName: "Admin",
      companyName: "XAI Books",
      country: "AE",
      passwordHash: await bcrypt.hash("Admin@12345!", 12),
      emailVerified: true,
      emailVerifiedAt: new Date(),
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const demo = await db.user.upsert({
    where: { email: "demo@xaibooks.ae" },
    update: {},
    create: {
      email: "demo@xaibooks.ae",
      firstName: "Demo",
      lastName: "User",
      companyName: "Lumen Interiors LLC",
      country: "AE",
      passwordHash: await bcrypt.hash("Demo@12345!", 12),
      emailVerified: true,
      emailVerifiedAt: new Date(),
      role: "ACCOUNTANT",
      status: "ACTIVE",
    },
  });

  console.log(`Admin user: ${admin.email}`);
  console.log(`Demo user:  ${demo.email}`);
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
