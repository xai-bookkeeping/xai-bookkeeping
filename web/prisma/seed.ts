import { PrismaClient } from "@prisma/client";

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
      clerkUserId: "seed_admin",
      companyName: "XAI Books",
      country: "AE",
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
      clerkUserId: "seed_demo",
      companyName: "Lumen Interiors LLC",
      country: "AE",
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
