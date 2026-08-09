import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Staging Data Audit ---');

  // 1. Level Configurations
  const levels = await prisma.levelConfiguration.findMany({
    select: { id: true, name: true, slug: true, level_order: true, joining_amount: true, upgrade_amount: true, version: true }
  });
  console.log('LevelConfigurations:', JSON.stringify(levels, null, 2));

  // 2. Daily Cappings
  const cappings = await prisma.dailyCapping.findMany({
    take: 10
  });
  console.log(`DailyCappings (sample):`, cappings.length, 'rows found');
  
  // 3. Duplicate checks for DailyCapping before constraint change
  const duplicates = await prisma.$queryRaw`
    SELECT user_id, business_date, COUNT(*)
    FROM daily_cappings
    GROUP BY user_id, business_date
    HAVING COUNT(*) > 1
  `;
  console.log('Duplicate DailyCappings:', JSON.stringify(duplicates, null, 2));

  // 4. Users with NULL level
  const nullUsers = await prisma.user.count({
    where: { current_level_id: null }
  });
  console.log('Users with current_level_id = NULL:', nullUsers);
  
  // 5. Total active users
  const activeUsers = await prisma.user.count({
    where: { status: 'ACTIVE' }
  });
  console.log('Total ACTIVE users:', activeUsers);

}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
