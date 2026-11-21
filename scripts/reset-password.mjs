// Emergency password reset, run on the laptop only:
//   npm run reset-password -- "YourNewPassword123"
// Also logs out every device that was signed in.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password || password.length < 10) {
  console.error('Usage: npm run reset-password -- "NewPassword (min 10 chars)"');
  process.exit(1);
}

const db = new PrismaClient();
const user = await db.user.findFirst();
if (!user) {
  console.error("No account yet. Open the Hub to set it up.");
} else {
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(password, 12),
      sessionVersion: { increment: 1 },
      failedAttempts: 0,
      lockedUntil: null,
    },
  });
  console.log(`Password reset for ${user.name}. All devices have been signed out.`);
}
await db.$disconnect();
