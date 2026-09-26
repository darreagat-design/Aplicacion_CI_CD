import { describe, expect, it } from "vitest";
import {
  InsufficientStockError,
  ValidationError,
} from "../../src/application/errors.js";
import { InventoryService } from "../../src/application/inventory.service.js";
import type { NewProduct, Product } from "../../src/domain/product.js";
import type {
  ProductRepository,
  WithdrawStockResult,
} from "../../src/repositories/product.repository.js";

class InMemoryProductRepository implements ProductRepository {
  private readonly products = new Map<string, Product>();
  private nextId = 1;

  async create(product: NewProduct): Promise<Product> {
    const created: Product = {
      id: this.nextId,
      sku: product.sku,
      name: product.name,
      stock: product.stock,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    this.nextId += 1;
    this.products.set(created.sku, created);
    return created;
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.products.get(sku) ?? null;
  }

  async withdrawStock(
    sku: string,
    quantity: number,
  ): Promise<WithdrawStockResult> {
    const product = this.products.get(sku);

    if (!product) {
      return { status: "not_found" };
    }

    if (product.stock < quantity) {
      return { status: "insufficient_stock" };
    }

    const updated = { ...product, stock: product.stock - quantity };
    this.products.set(sku, updated);
    return { status: "updated", product: updated };
  }
}

function createService(): InventoryService {
  return new InventoryService(new InMemoryProductRepository());
}

describe("InventoryService", () => {
  it("registers a product with valid stock", async () => {
    // Arrange
    const service = createService();

    // Act
    const product = await service.registerProduct({
      sku: "PROD-001",
      name: "Teclado",
      stock: 10,
    });

    // Assert
    expect(product).toMatchObject({
      id: 1,
      sku: "PROD-001",
      name: "Teclado",
      stock: 10,
    });
  });

  it("allows registering a product with stock equal to 0", async () => {
    // Arrange
    const service = createService();

    // Act
    const product = await service.registerProduct({
      sku: "PROD-001",
      name: "Teclado",
      stock: 0,
    });

    // Assert
    expect(product.stock).toBe(0);
  });

  it("rejects negative initial stock", async () => {
    // Arrange
    const service = createService();

    // Act
    const result = service.registerProduct({
      sku: "PROD-001",
      name: "Teclado",
      stock: -1,
    });

    // Assert
    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow(
      "Stock must be greater than or equal to 0",
    );
  });

  it("rejects empty SKU", async () => {
    // Arrange
    const service = createService();

    // Act
    const result = service.registerProduct({
      sku: "   ",
      name: "Teclado",
      stock: 10,
    });

    // Assert
    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("SKU is required");
  });

  it("withdraws stock correctly", async () => {
    // Arrange
    const service = createService();
    await service.registerProduct({
      sku: "PROD-001",
      name: "Teclado",
      stock: 10,
    });

    // Act
    const product = await service.decreaseStock("PROD-001", 3);

    // Assert
    expect(product.stock).toBe(7);
  });

  it("allows withdrawing exactly all available stock and leaves it at 0", async () => {
    // Arrange
    const service = createService();
    await service.registerProduct({
      sku: "PROD-001",
      name: "Teclado",
      stock: 10,
    });

    // Act
    const product = await service.decreaseStock("PROD-001", 10);

    // Assert
    expect(product.stock).toBe(0);
  });

  it("rejects withdrawing more than available stock", async () => {
    // Arrange
    const service = createService();
    await service.registerProduct({
      sku: "PROD-001",
      name: "Teclado",
      stock: 10,
    });

    // Act
    const result = service.decreaseStock("PROD-001", 11);

    // Assert
    await expect(result).rejects.toThrow(InsufficientStockError);
    await expect(result).rejects.toThrow("Insufficient stock");
  });

  it("rejects withdrawing quantity equal to 0", async () => {
    // Arrange
    const service = createService();
    await service.registerProduct({
      sku: "PROD-001",
      name: "Teclado",
      stock: 10,
    });

    // Act
    const result = service.decreaseStock("PROD-001", 0);

    // Assert
    await expect(result).rejects.toThrow(ValidationError);
    await expect(result).rejects.toThrow("Quantity must be greater than 0");
  });
});
