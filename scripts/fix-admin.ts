import { getDb, getAllUsers, updateUserStatus, updateUserRole } from '../server/db';

async function main() {
  // 1. 현재 모든 사용자 조회
  const allUsers = await getAllUsers();
  console.log("=== 현재 등록된 사용자 목록 ===");
  for (const u of allUsers) {
    console.log(`ID: ${u.id} | OpenID: ${u.openId} | Name: ${u.name} | Email: ${u.email} | Role: ${u.role} | Status: ${u.status}`);
  }

  // 2. 모든 사용자를 admin + approved로 업데이트
  for (const u of allUsers) {
    await updateUserRole(u.id, 'admin');
    await updateUserStatus(u.id, 'approved');
    console.log(`\n✅ 사용자 ${u.id} (${u.name || u.email || u.openId}) → admin + approved 업데이트 완료`);
  }

  // 3. 업데이트 확인
  console.log("\n=== 업데이트 후 사용자 목록 ===");
  const updated = await getAllUsers();
  for (const u of updated) {
    console.log(`ID: ${u.id} | OpenID: ${u.openId} | Name: ${u.name} | Role: ${u.role} | Status: ${u.status}`);
  }

  process.exit(0);
}

main().catch(console.error);
