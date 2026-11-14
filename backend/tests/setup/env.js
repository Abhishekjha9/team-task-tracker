// Runs before every test file. DB tests use a separate database so dev data is never touched.
require('dotenv').config({ quiet: true });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const base = process.env.DB_NAME || 'task_tracker';
// Idempotent: globalSetup and setupFiles share process.env when running in band.
process.env.DB_NAME = process.env.TEST_DB_NAME || (base.endsWith('_test') ? base : `${base}_test`);
