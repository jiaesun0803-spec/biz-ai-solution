import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL 환경변수가 필요합니다.");
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error("ADMIN_EMAIL, ADMIN_PASSWORD 환경변수가 필요합니다.");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// 기존 관리자 계정 확인
const [existing] = await connection.execute(
  "SELECT id, email, role FROM users WHERE email = ?",
  [ADMIN_EMAIL]
);

if (existing.length > 0) {
  console.log(`기존 계정 발견: ${ADMIN_EMAIL} (role: ${existing[0].role})`);
  // 비밀번호 업데이트
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await connection.execute(
    "UPDATE users SET passwordHash = ?, role = 'admin', status = 'approved', loginMethod = 'email' WHERE email = ?",
    [passwordHash, ADMIN_EMAIL]
  );
  console.log(`✅ 관리자 계정 업데이트 완료: ${ADMIN_EMAIL}`);
} else {
  // 새 관리자 계정 생성
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const openId = `local:${ADMIN_EMAIL}`;
  await connection.execute(
    "INSERT INTO users (openId, email, name, loginMethod, passwordHash, role, status, lastSignedIn) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
    [openId, ADMIN_EMAIL, "관리자", "email", passwordHash, "admin", "approved"]
  );
  console.log(`✅ 관리자 계정 생성 완료: ${ADMIN_EMAIL}`);
}

await connection.end();
