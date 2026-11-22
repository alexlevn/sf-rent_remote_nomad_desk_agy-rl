import * as path from 'node:path';
import * as dotenv from 'dotenv';

const repoRoot = path.resolve(__dirname, '../../..');

// Load .env.local first (matching Next.js precedence) before DB pool initialization
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(repoRoot, 'web/.env.local') });
dotenv.config({ path: path.resolve(repoRoot, '.env') });
dotenv.config();
