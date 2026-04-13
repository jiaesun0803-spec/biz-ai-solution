import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** 계정 승인 상태: pending(대기), approved(승인), rejected(거절) */
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /** 사용자 개인 OpenAI API 키 (선택) */
  openaiApiKey: varchar("openaiApiKey", { length: 256 }),
  /** 사용자 개인 Google Gemini API 키 (선택) */
  geminiApiKey: varchar("geminiApiKey", { length: 256 }),
  /** 자체 인증용 비밀번호 해시 (bcrypt) */
  passwordHash: varchar("passwordHash", { length: 256 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── 업체(companies) 테이블 ───────────────────────────────────────────────────
export const companies = mysqlTable("companies", {
  id: int("id").autoincrement().primaryKey(),
  /** 소유자 (컨설턴트 userId) */
  userId: int("userId").notNull(),
  // 1. 기업 현황
  name: varchar("name", { length: 255 }).notNull(),
  businessType: varchar("businessType", { length: 64 }),
  businessNumber: varchar("businessNumber", { length: 32 }),
  corporateNumber: varchar("corporateNumber", { length: 32 }),
  establishedDate: varchar("establishedDate", { length: 32 }),
  businessPhone: varchar("businessPhone", { length: 32 }),
  employeeCount: varchar("employeeCount", { length: 32 }),
  industry: varchar("industry", { length: 128 }),
  officeOwnership: varchar("officeOwnership", { length: 16 }),
  businessAddress: text("businessAddress"),
  deposit: varchar("deposit", { length: 32 }),
  monthlyRent: varchar("monthlyRent", { length: 32 }),
  hasAdditionalBranch: varchar("hasAdditionalBranch", { length: 8 }),
  additionalBranchNumber: varchar("additionalBranchNumber", { length: 64 }),
  // 2. 대표자 정보
  representativeName: varchar("representativeName", { length: 128 }),
  birthDate: varchar("birthDate", { length: 32 }),
  contactNumber: varchar("contactNumber", { length: 32 }),
  telecom: varchar("telecom", { length: 32 }),
  homeAddress: text("homeAddress"),
  homeOwnership: varchar("homeOwnership", { length: 16 }),
  education: varchar("education", { length: 64 }),
  major: varchar("major", { length: 128 }),
  career1: text("career1"),
  career2: text("career2"),
  // 3. 신용정보
  hasFinancialDelinquency: varchar("hasFinancialDelinquency", { length: 8 }),
  hasTaxDelinquency: varchar("hasTaxDelinquency", { length: 8 }),
  kcbScore: varchar("kcbScore", { length: 16 }),
  niceScore: varchar("niceScore", { length: 16 }),
  // 4. 매출현황
  hasExportSales: varchar("hasExportSales", { length: 8 }),
  hasPlannedExport: varchar("hasPlannedExport", { length: 8 }),
  currentYearSales: varchar("currentYearSales", { length: 32 }),
  year25Sales: varchar("year25Sales", { length: 32 }),
  year24Sales: varchar("year24Sales", { length: 32 }),
  year23Sales: varchar("year23Sales", { length: 32 }),
  currentYearExport: varchar("currentYearExport", { length: 32 }),
  year25Export: varchar("year25Export", { length: 32 }),
  year24Export: varchar("year24Export", { length: 32 }),
  year23Export: varchar("year23Export", { length: 32 }),
  // 5. 부채현황
  jungJinGong: varchar("jungJinGong", { length: 32 }),
  soJinGong: varchar("soJinGong", { length: 32 }),
  sinbo: varchar("sinbo", { length: 32 }),
  gibo: varchar("gibo", { length: 32 }),
  jaedan: varchar("jaedan", { length: 32 }),
  companyCollateral: varchar("companyCollateral", { length: 32 }),
  ceoCredit: varchar("ceoCredit", { length: 32 }),
  ceoCollateral: varchar("ceoCollateral", { length: 32 }),
  // 6. 보유 인증 (JSON 문자열로 저장)
  certifications: text("certifications"),
  // 7. 특허 및 정부지원
  hasPatent: varchar("hasPatent", { length: 8 }),
  patentCount: varchar("patentCount", { length: 16 }),
  patentDetails: text("patentDetails"),
  hasGovSupport: varchar("hasGovSupport", { length: 8 }),
  govSupportCount: varchar("govSupportCount", { length: 16 }),
  govSupportDetails: text("govSupportDetails"),
  // 8. 비즈니스 상세
  coreItem: text("coreItem"),
  salesRoute: text("salesRoute"),
  competitiveness: text("competitiveness"),
  marketStatus: text("marketStatus"),
  processDetail: text("processDetail"),
  targetCustomer: text("targetCustomer"),
  revenueModel: text("revenueModel"),
  futurePlan: text("futurePlan"),
  // 9. 자금 계획
  requiredFunding: varchar("requiredFunding", { length: 32 }),
  /** 운전자금 여부 (yes/no) */
  fundingTypeOperating: varchar("fundingTypeOperating", { length: 8 }),
  /** 시설자금 여부 (yes/no) */
  fundingTypeFacility: varchar("fundingTypeFacility", { length: 8 }),
  fundingPlanDetail: text("fundingPlanDetail"),
  // 10. 컨설턴트 메모
  memo: text("memo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbCompany = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// ─── 보고서(reports) 테이블 ──────────────────────────────────────────────────
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  companyId: int("companyId").notNull(),
  companyName: varchar("companyName", { length: 255 }).notNull(),
  type: varchar("type", { length: 32 }).notNull(), // diagnosis | business_plan | funding_match
  title: varchar("title", { length: 512 }).notNull(),
  sectionsJson: text("sectionsJson").notNull(),       // JSON 직렬화
  matchingSummaryJson: text("matchingSummaryJson"),   // JSON 직렬화 (nullable)
  companySummaryJson: text("companySummaryJson"),     // JSON 직렬화 (nullable)
  status: varchar("status", { length: 16 }).notNull().default("completed"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbReport = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;

// ─── 공문/공지사항(notices) 테이블 ──────────────────────────────────────────────
export const notices = mysqlTable("notices", {
  id: int("id").autoincrement().primaryKey(),
  /** 공문(document) 또는 공지(notice) */
  type: mysqlEnum("type", ["document", "notice"]).notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  content: text("content"),
  /** 첨부파일 URL (S3) */
  attachmentUrl: text("attachmentUrl"),
  /** 첨부파일 원본 파일명 */
  attachmentName: varchar("attachmentName", { length: 255 }),
  /** 작성자 userId */
  createdBy: int("createdBy").notNull(),
  /** 작성자 이름 (캐시) */
  createdByName: varchar("createdByName", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DbNotice = typeof notices.$inferSelect;
export type InsertNotice = typeof notices.$inferInsert;
