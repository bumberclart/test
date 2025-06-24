import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const logDir = path.resolve('./logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}
const logPath = path.join(logDir, 'errors.log');

/**
 * Logs an error related to an email address to a file asynchronously.
 * Falls back to console logging if file logging fails.
 */
export async function logError(email, message) {
  const entry = `[${new Date().toISOString()}] [${email}] ${message}\n`;
  console.log(entry)

  try {
    await fs.appendFile(logPath, entry, { encoding: 'utf8' });
  } catch (err) {
    console.error('[Logger fallback] Could not write to error log:', err.message);
    console.error('[Original error]', entry.trim());
    // Optionally, rethrow or alert elsewhere
  }
}