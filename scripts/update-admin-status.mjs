import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

async function run() {
  if (!process.env.DATABASE_URL) {
    console.log("No DATABASE_URL set");
    return;
  }
  const db = drizzle(process.env.DATABASE_URL);
  // 기존 admin 사용자를 approved로 업데이트
  await db.execute(sql`UPDATE users SET status = 'approved' WHERE role = 'admin'`);
  console.log("Admin users updated to approved");
  // 확인
  const result = await db.execute(sql`SELECT id, name, email, role, status FROM users LIMIT 10`);
  console.log("Users:", JSON.stringify(result[0], null, 2));
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
