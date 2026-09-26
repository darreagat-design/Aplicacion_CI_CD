export type Product = {
  id: number;
  sku: string;
  name: string;
  stock: number;
  createdAt: Date;
};

export type NewProduct = {
  sku: string;
  name: string;
  stock: number;
};
