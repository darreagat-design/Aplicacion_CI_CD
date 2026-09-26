import express, { type NextFunction, type Request, type Response } from "express";
import {
  ConflictError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "./application/errors.js";
import { InventoryService } from "./application/inventory.service.js";
import { pool } from "./db/pool.js";
import { PostgresProductRepository } from "./infrastructure/postgres-product.repository.js";

export const app = express();
const inventoryService = new InventoryService(new PostgresProductRepository(pool));

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post(
  "/products",
  asyncHandler(async (req, res) => {
    const product = await inventoryService.registerProduct(req.body);
    res.status(201).json(product);
  }),
);

app.get(
  "/products/:sku",
  asyncHandler(async (req, res) => {
    const product = await inventoryService.findProductBySku(String(req.params.sku));

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.status(200).json(product);
  }),
);

app.post(
  "/products/:sku/withdraw",
  asyncHandler(async (req, res) => {
    const product = await inventoryService.decreaseStock(
      String(req.params.sku),
      req.body.quantity,
    );

    res.status(200).json(product);
  }),
);

app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof ValidationError || err instanceof InsufficientStockError) {
      res.status(400).json({ error: err.message });
      return;
    }

    if (err instanceof NotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }

    if (err instanceof ConflictError) {
      res.status(409).json({ error: err.message });
      return;
    }

    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  },
);

function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
