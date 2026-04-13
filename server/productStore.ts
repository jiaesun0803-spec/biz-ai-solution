/**
 * 정책자금 상품 데이터 저장소
 * 
 * 파일 기반 JSON 영속화로 상품 데이터를 관리합니다.
 * 서버 시작 시 기본 상품 데이터를 로드하고,
 * 관리자가 추가/수정/삭제한 상품은 JSON 파일에 저장됩니다.
 */

import * as fs from "fs";
import * as path from "path";
import { ALL_FUNDING_PRODUCTS, type FundingProduct } from "./fundingProducts.js";

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

// 메모리 캐시
let productsCache: FundingProduct[] | null = null;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * 상품 목록 로드 (파일이 없으면 기본 데이터 사용)
 */
export function loadProducts(): FundingProduct[] {
  if (productsCache) return productsCache;

  ensureDataDir();

  if (fs.existsSync(PRODUCTS_FILE)) {
    try {
      const raw = fs.readFileSync(PRODUCTS_FILE, "utf-8");
      productsCache = JSON.parse(raw) as FundingProduct[];
      return productsCache;
    } catch {
      // 파일 손상 시 기본 데이터로 폴백
    }
  }

  // 기본 데이터로 초기화
  productsCache = [...ALL_FUNDING_PRODUCTS];
  saveProducts(productsCache);
  return productsCache;
}

/**
 * 상품 목록 저장
 */
function saveProducts(products: FundingProduct[]): void {
  ensureDataDir();
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf-8");
  productsCache = products;
}

/**
 * 전체 상품 목록 조회
 */
export function getAllManagedProducts(): FundingProduct[] {
  return loadProducts();
}

/**
 * 단일 상품 조회
 */
export function getProductById(id: string): FundingProduct | undefined {
  return loadProducts().find((p) => p.id === id);
}

/**
 * 상품 추가
 */
export function addProduct(product: Omit<FundingProduct, "id">): FundingProduct {
  const products = loadProducts();
  const newProduct: FundingProduct = {
    ...product,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  products.push(newProduct);
  saveProducts(products);
  return newProduct;
}

/**
 * 상품 수정
 */
export function updateProduct(id: string, updates: Partial<Omit<FundingProduct, "id">>): FundingProduct | null {
  const products = loadProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  products[index] = { ...products[index], ...updates, id };
  saveProducts(products);
  return products[index];
}

/**
 * 상품 삭제
 */
export function deleteProduct(id: string): boolean {
  const products = loadProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return false;

  products.splice(index, 1);
  saveProducts(products);
  return true;
}

/**
 * 기본 상품 데이터로 초기화
 */
export function resetToDefaults(): FundingProduct[] {
  const defaults = [...ALL_FUNDING_PRODUCTS];
  saveProducts(defaults);
  return defaults;
}

/**
 * 기관명으로 상품 조회 (관리 데이터 기반)
 */
export function getManagedProductsByInstitution(institutionName: string): FundingProduct[] {
  const products = loadProducts();
  const name = institutionName.trim();

  if (name.includes("또는") || name.includes("/")) {
    const parts = name.split(/또는|\//).map((p) => p.trim());
    const results: FundingProduct[] = [];
    for (const part of parts) {
      results.push(...products.filter((p) => p.institutionName.includes(part)));
    }
    return results;
  }

  return products.filter((p) => p.institutionName.includes(name));
}

/**
 * 신용취약자금 상품 조회 (관리 데이터 기반)
 */
export function getManagedVulnerableProducts(): FundingProduct[] {
  return loadProducts().filter((p) => p.tags.includes("신용취약"));
}

/**
 * 추천 기관 목록에 대해 관리 데이터 기반으로 상품 매핑
 */
export function mapManagedProductsToRecommendations(
  recommendations: Array<{ rank: number; name: string; eligible: boolean }>,
  isVulnerableCredit: boolean,
): Array<{
  rank: number;
  institutionName: string;
  products: FundingProduct[];
}> {
  const result = recommendations.map((rec) => ({
    rank: rec.rank,
    institutionName: rec.name,
    products: rec.eligible ? getManagedProductsByInstitution(rec.name) : [],
  }));

  if (isVulnerableCredit) {
    const vulnerableProducts = getManagedVulnerableProducts();
    const sojingongEntry = result.find((r) => r.institutionName.includes("소진공"));
    if (sojingongEntry) {
      for (const vp of vulnerableProducts) {
        if (!sojingongEntry.products.find((p) => p.id === vp.id)) {
          sojingongEntry.products.push(vp);
        }
      }
    }
  }

  return result;
}
