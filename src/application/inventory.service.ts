import type { NewProduct, Product } from "../domain/product.js";
import {
  ConflictError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "./errors.js";
import type { ProductRepository } from "../repositories/product.repository.js";

export class InventoryService {
  constructor(private readonly productRepository: ProductRepository) {}

  async registerProduct(input: NewProduct): Promise<Product> {
    const product = validateNewProduct(input);

    try {
      return await this.productRepository.create(product);
    } catch (error) {
      if (isDuplicateSkuError(error)) {
        throw new ConflictError("SKU already exists");
      }

      throw error;
    }
  }

  async findProductBySku(sku: string): Promise<Product | null> {
    const normalizedSku = validateSku(sku);
    return this.productRepository.findBySku(normalizedSku);
  }

  async decreaseStock(sku: string, quantity: number): Promise<Product> {
    const normalizedSku = validateSku(sku);
    const normalizedQuantity = validateWithdrawQuantity(quantity);
    const result = await this.productRepository.withdrawStock(
      normalizedSku,
      normalizedQuantity,
    );

    if (result.status === "not_found") {
      throw new NotFoundError("Product not found");
    }

    if (result.status === "insufficient_stock") {
      throw new InsufficientStockError("Insufficient stock");
    }

    return result.product;
  }
}

function validateNewProduct(input: NewProduct): NewProduct {
  const sku = validateSku(input.sku);
  const name = validateName(input.name);
  const stock = validateInitialStock(input.stock);

  return { sku, name, stock };
}

function validateSku(sku: unknown): string {
  if (typeof sku !== "string" || sku.trim() === "") {
    throw new ValidationError("SKU is required");
  }

  return sku.trim();
}

function validateName(name: unknown): string {
  if (typeof name !== "string" || name.trim() === "") {
    throw new ValidationError("Name is required");
  }

  return name.trim();
}

function validateInitialStock(stock: unknown): number {
  if (typeof stock !== "number" || !Number.isInteger(stock)) {
    throw new ValidationError("Stock must be an integer");
  }

  if (stock < 0) {
    throw new ValidationError("Stock must be greater than or equal to 0");
  }

  return stock;
}

function validateWithdrawQuantity(quantity: unknown): number {
  if (typeof quantity !== "number" || !Number.isInteger(quantity)) {
    throw new ValidationError("Quantity must be an integer");
  }

  if (quantity <= 0) {
    throw new ValidationError("Quantity must be greater than 0");
  }

  return quantity;
}

function isDuplicateSkuError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
