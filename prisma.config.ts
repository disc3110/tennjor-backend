import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://postgres:PpgSotMJjCfPSomkCAPZoYKigZmSTynJ@postgres.railway.internal:5432/railway';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx ./prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
