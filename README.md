# Inventory CICD

Proyecto academico base para un sistema sencillo de inventario con Node.js, TypeScript, Express y PostgreSQL.

## Stack

- Node.js
- TypeScript
- Express
- PostgreSQL
- pg
- dotenv
- tsx
- Vitest y Testcontainers para etapas posteriores

## Configuracion inicial

1. Copiar el archivo de variables de entorno:

```bash
cp .env.example .env
```

2. Levantar PostgreSQL de desarrollo:

```bash
docker compose up -d
```

3. Ejecutar la migracion base:

```bash
npm run migrate
```

4. Iniciar el servidor en modo desarrollo:

```bash
npm run dev
```

## Scripts

- `npm run dev`: ejecuta el servidor con `tsx` en modo watch.
- `npm start`: ejecuta `src/server.ts`.
- `npm run migrate`: ejecuta las migraciones SQL.
- `npm run typecheck`: valida TypeScript sin emitir archivos.
- `npm run test:unit`: ejecutara pruebas unitarias cuando existan.
- `npm run test:integration`: ejecutara pruebas de integracion cuando existan.
- `npm test`: ejecutara pruebas unitarias y luego integracion.

## Estado actual

Esta etapa solo deja la estructura inicial del proyecto, dependencias, configuracion, PostgreSQL de desarrollo y migracion base. La logica completa, endpoints, pruebas, Testcontainers y GitHub Actions se agregaran despues.
