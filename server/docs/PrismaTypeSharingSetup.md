# 📄 Prisma Client + Frontend Type Sharing Setup
  Our project uses a custom Prisma client output directory and a type sharing pipeline between the backend and frontend.

## 🎯 Objective

To share `Prisma`-generated types (e.g., `User`, `Conference`) with the frontend (`client/`) by copying type declarations from the backend (`server/`), while ensuring compatibility with future Prisma versions.

---

## 📁 Project Structure Overview

```

conference-manager-webapp/
├── client/
│   └── src/types/prismaTypes.d.ts   ← Receives copied Prisma types
├── server/
│   ├── prisma/
│   │   └── schema.prisma            ← Prisma schema definition
│   └── node\_modules/@prisma/client/ ← Prisma Client output (default)

````

---

## ⚙️ Prisma Schema Configuration (`server/prisma/schema.prisma`)

Update your `generator` block to explicitly set the output path to avoid deprecation warnings:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/@prisma/client"
}
````

---

## 📦 `package.json` Scripts (`server/package.json`)

Add the following scripts to manage generation and type syncing:

```json
"scripts": {
  "prisma:generate": "prisma generate",
  "postprisma:generate": "shx cp -r node_modules/.prisma/client/index.d.ts ../client/src/types/prismaTypes.d.ts"
}
```
✅NB: Make sure shx is installed as a dev dependency:
      npm install --save-dev shx

* `prisma:generate`: Runs Prisma Client generation.
* `postprisma:generate`: Copies the type declarations into the frontend folder.

---

## ✅ Usage Workflow

1. **Run Prisma generation:**

   ```
   npm run prisma:generate
   ```

2. **What happens:**

   * Prisma Client is generated into `node_modules/@prisma/client`
   * `index.d.ts` from `.prisma/client/` is copied to `client/src/types/prismaTypes.d.ts`

3. **Frontend (`index.d.ts`) imports types like so:**

   ```
   import {
     User,
     Conference,
     Presentation,
     // etc.
   } from "./prismaTypes";
   ```

**In other words:**

  Make schema changes in schema.prisma.
  
    Run npm run prisma:generate in the server/ directory.

    This will:

    Generate the Prisma Client in server/src/generated/prisma

    Copy relevant type definitions to client/src/types/prismaTypes.d.ts

    Use shared types in both backend (via imports) and frontend (via global typings).
---

## 🚀 Notes

* This approach avoids coupling the frontend to backend-specific paths.
* Prisma types are available in the frontend without bundling backend logic.
* The setup is future-proofed for Prisma 7.0+.

