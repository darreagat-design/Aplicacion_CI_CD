import type { NewProduct, Product } from "../domain/product.js";

export type WithdrawStockResult =
  | { status: "updated"; product: Product }
  | { status: "not_found" }
  | { status: "insufficient_stock" };

export interface ProductRepository {
  create(product: NewProduct): Promise<Product>;
  findBySku(sku: string): Promise<Product | null>;
  withdrawStock(sku: string, quantity: number): Promise<WithdrawStockResult>;
}
