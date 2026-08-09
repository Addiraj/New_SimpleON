import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const levels = await prisma.levelConfiguration.findMany({ orderBy: { level_order: 'asc' } });
  console.log("LEVELS:", levels);
  const users = await prisma.user.findMany({ take: 2, include: { current_level: true } });
  console.log("USERS:", users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
