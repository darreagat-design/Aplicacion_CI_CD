import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";
import { runMigrations } from "../../src/db/migrate.js";
import { PostgresProductRepository } from "../../src/infrastructure/postgres-product.repository.js";

const { Pool } = pg;

let container: StartedPostgreSqlContainer | undefined;
let pool: pg.Pool | undefined;

describe("PostgresProductRepository", () => {
  beforeAll(async () => {
    container = await new PostgreSqlContainer("postgres:16-alpine").start();

    pool = new Pool({
      connectionString: container.getConnectionUri(),
    });

    await runMigrations(pool);
  }, 120_000);

  beforeEach(async () => {
    await pool?.query("TRUNCATE TABLE products RESTART IDENTITY");
  });

  afterAll(async () => {
    await pool?.end();
    await container?.stop();
  });

  it("stores and retrieves a product using PostgreSQL", async () => {
    // Arrange
    const repository = new PostgresProductRepository(getPool());

    // Act
    await repository.create({
      sku: "PROD-001",
      name: "Teclado",
      stock: 10,
    });
    const product = await repository.findBySku("PROD-001");

    // Assert
    expect(product).not.toBeNull();
    expect(product).toMatchObject({
      sku: "PROD-001",
      name: "Teclado",
      stock: 10,
    });
  });

  it("rejects duplicate SKU using the database unique constraint", async () => {
    // Arrange
    const repository = new PostgresProductRepository(getPool());
    await repository.create({
      sku: "PROD-001",
      name: "Teclado",
      stock: 10,
    });

    // Act
    const result = repository.create({
      sku: "PROD-001",
      name: "Teclado duplicado",
      stock: 5,
    });

    // Assert
    await expect(result).rejects.toMatchObject({
      code: "23505",
    });
  });
});

function getPool(): pg.Pool {
  if (!pool) {
    throw new Error("PostgreSQL pool was not initialized");
  }

  return pool;
}
