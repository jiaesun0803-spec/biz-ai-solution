import { eq, like, or, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, companies, reports, InsertCompany, InsertReport, DbCompany, DbReport, notices, DbNotice, InsertNotice } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    // 관리자(ownerOpenId)는 자동으로 admin + approved 설정
    const isOwner = user.openId === ENV.ownerOpenId;

    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (isOwner) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    // 관리자는 자동 승인, 일반 사용자는 신규 가입 시 pending
    if (isOwner) {
      values.status = "approved";
      updateSet.status = "approved";
    }
    // 기존 사용자가 다시 로그인할 때는 status를 변경하지 않음 (updateSet에 status 미포함)

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── 사용자 관리 (관리자 전용) ───

/** 전체 사용자 목록 조회 */
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(sql`${users.createdAt} DESC`);
}

/** 특정 상태의 사용자 목록 조회 */
export async function getUsersByStatus(status: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.status, status)).orderBy(sql`${users.createdAt} DESC`);
}

/** 사용자 승인 상태 변경 */
export async function updateUserStatus(userId: number, status: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ status }).where(eq(users.id, userId));
}

/** 사용자 역할 변경 */
export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

/** 사용자 삭제 */
export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, userId));
}

/** 사용자 개인 OpenAI API 키 저장 (null이면 삭제) */
export async function updateUserApiKey(userId: number, apiKey: string | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ openaiApiKey: apiKey }).where(eq(users.id, userId));
}

/** 사용자 개인 OpenAI API 키 조회 */
export async function getUserApiKey(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ openaiApiKey: users.openaiApiKey }).from(users).where(eq(users.id, userId)).limit(1);
  return result[0]?.openaiApiKey ?? null;
}

/** 사용자 개인 Gemini API 키 저장 (null이면 삭제) */
export async function updateUserGeminiApiKey(userId: number, apiKey: string | null): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ geminiApiKey: apiKey }).where(eq(users.id, userId));
}

/** 사용자 개인 Gemini API 키 조회 */
export async function getUserGeminiApiKey(userId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({ geminiApiKey: users.geminiApiKey }).from(users).where(eq(users.id, userId)).limit(1);
  return result[0]?.geminiApiKey ?? null;
}

// ─── 업체 관리 ───────────────────────────────────────────────────────────────────
/** 특정 사용자의 업체 목록 조회 */
export async function getCompaniesByUserId(userId: number): Promise<DbCompany[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(companies).where(eq(companies.userId, userId)).orderBy(desc(companies.createdAt));
}

/** 업체 단건 조회 */
export async function getCompanyById(id: number, userId: number): Promise<DbCompany | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  const company = result[0];
  if (!company || company.userId !== userId) return undefined;
  return company;
}

/** 업체 등록 */
export async function createCompany(data: InsertCompany): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(companies).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

/** 업체 수정 */
export async function updateCompanyDb(id: number, userId: number, data: Partial<InsertCompany>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(companies).set(data).where(eq(companies.id, id));
}

/** 업체 삭제 */
export async function deleteCompanyDb(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // 관련 보고서도 함께 삭제
  await db.delete(reports).where(eq(reports.companyId, id));
  await db.delete(companies).where(eq(companies.id, id));
}

// ─── 보고서 관리 ─────────────────────────────────────────────────────────────────
/** 특정 사용자의 보고서 목록 조회 */
export async function getReportsByUserId(userId: number): Promise<DbReport[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt));
}

/** 특정 업체의 보고서 목록 조회 */
export async function getReportsByCompanyId(companyId: number, userId: number): Promise<DbReport[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports)
    .where(eq(reports.companyId, companyId))
    .orderBy(desc(reports.createdAt));
}

/** 보고서 단건 조회 */
export async function getReportById(id: number, userId: number): Promise<DbReport | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reports)
    .where(eq(reports.id, id))
    .limit(1);
  const report = result[0];
  if (!report || report.userId !== userId) return undefined;
  return report;
}

/** 보고서 저장 */
export async function createReport(data: InsertReport): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reports).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

/** 보고서 수정 */
export async function updateReportDb(id: number, userId: number, data: Partial<InsertReport>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reports).set(data).where(eq(reports.id, id));
}

/** 보고서 삭제 */
export async function deleteReportDb(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reports).where(eq(reports.id, id));
}

// ─── 공문/공지사항 DB 헬퍼 ─────────────────────────────────────────────────────

/** 전체 공문/공지 목록 (최신순) */
export async function getNotices(type?: "document" | "notice"): Promise<DbNotice[]> {
  const db = await getDb();
  if (!db) return [];
  if (type) {
    return db.select().from(notices).where(eq(notices.type, type)).orderBy(desc(notices.createdAt));
  }
  return db.select().from(notices).orderBy(desc(notices.createdAt));
}

/** 공문/공지 단건 조회 */
export async function getNoticeById(id: number): Promise<DbNotice | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(notices).where(eq(notices.id, id)).limit(1);
  return result[0];
}

/** 공문/공지 생성 (관리자 전용) */
export async function createNotice(data: InsertNotice): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notices).values(data);
  return (result as any)[0]?.insertId ?? (result as any).insertId;
}

/** 공문/공지 수정 (관리자 전용) */
export async function updateNotice(id: number, data: Partial<InsertNotice>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notices).set(data).where(eq(notices.id, id));
}

/** 공문/공지 삭제 (관리자 전용) */
export async function deleteNotice(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(notices).where(eq(notices.id, id));
}
