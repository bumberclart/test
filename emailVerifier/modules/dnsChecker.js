import dns from 'dns/promises';
import { retry } from './retry.js';

export async function hasValidMx(email) {
  const domain = email.split('@')[1];
  try {
    const records = await retry(() => dns.resolveMx(domain), 2, 1000);
    return records && records.length > 0;
  } catch (err) {
    return false;
  }
}