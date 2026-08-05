import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Scanning for broken active users (ACTIVE status but no matrix cycle)...');
  
  const brokenUsers = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      matrix_cycles: {
        none: {}
      }
    }
  });

  console.log(`Found ${brokenUsers.length} broken users.`);

  if (brokenUsers.length === 0) {
    console.log('No broken users found. Exiting.');
    process.exit(0);
  }

  for (const user of brokenUsers) {
    if (user.role === 'ADMIN') {
      console.log(`Skipping ADMIN user: ${user.wallet_address}`);
      continue;
    }

    console.log(`Resetting user: ${user.wallet_address} (ID: ${user.id})`);
    
    // 1. Reset user status to PENDING
    await prisma.user.update({
      where: { id: user.id },
      data: {
        status: 'PENDING',
        current_level_id: null,
      }
    });

    // 2. Delete any broken UserLevel records just in case
    await prisma.userLevel.deleteMany({
      where: { user_id: user.id }
    });

    // 3. Delete any broken PaymentIntents
    await prisma.paymentIntent.deleteMany({
      where: { user_id: user.id }
    });

    // 4. Delete ledger entries from "demo_join" to refund their 10 Demo USDT
    await prisma.walletLedger.deleteMany({
      where: { 
        user_id: user.id,
        source_type: 'BOOSTER_PLAN',
        source_id: 'demo_join'
      }
    });

    console.log(`User ${user.wallet_address} has been fully reset to PENDING.`);
  }

  console.log('Reset complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
