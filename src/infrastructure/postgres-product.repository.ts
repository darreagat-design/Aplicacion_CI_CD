import type { Pool, PoolClient } from "pg";
import type { NewProduct, Product } from "../domain/product.js";
import type {
  ProductRepository,
  WithdrawStockResult,
} from "../repositories/product.repository.js";

type ProductRow = {
  id: number;
  sku: string;
  name: string;
  stock: number;
  created_at: Date;
};

export class PostgresProductRepository implements ProductRepository {
  constructor(private readonly pool: Pool) {}

  async create(product: NewProduct): Promise<Product> {
    const result = await this.pool.query<ProductRow>(
      `INSERT INTO products (sku, name, stock)
       VALUES ($1, $2, $3)
       RETURNING id, sku, name, stock, created_at`,
      [product.sku, product.name, product.stock],
    );

    return mapProductRow(result.rows[0]);
  }

  async findBySku(sku: string): Promise<Product | null> {
    const result = await this.pool.query<ProductRow>(
      `SELECT id, sku, name, stock, created_at
       FROM products
       WHERE sku = $1`,
      [sku],
    );

    const row = result.rows[0];
    return row ? mapProductRow(row) : null;
  }

  async withdrawStock(
    sku: string,
    quantity: number,
  ): Promise<WithdrawStockResult> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const product = await findProductBySkuForUpdate(client, sku);
      if (!product) {
        await client.query("ROLLBACK");
        return { status: "not_found" };
      }

      if (product.stock < quantity) {
        await client.query("ROLLBACK");
        return { status: "insufficient_stock" };
      }

      const updatedStock = product.stock - quantity;
      const result = await client.query<ProductRow>(
        `UPDATE products
         SET stock = $2
         WHERE sku = $1
         RETURNING id, sku, name, stock, created_at`,
        [sku, updatedStock],
      );

      await client.query("COMMIT");
      return { status: "updated", product: mapProductRow(result.rows[0]) };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

async function findProductBySkuForUpdate(
  client: PoolClient,
  sku: string,
): Promise<Product | null> {
  const result = await client.query<ProductRow>(
    `SELECT id, sku, name, stock, created_at
     FROM products
     WHERE sku = $1
     FOR UPDATE`,
    [sku],
  );

  const row = result.rows[0];
  return row ? mapProductRow(row) : null;
}

function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    stock: row.stock,
    createdAt: row.created_at,
  };
}
