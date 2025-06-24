import { verifySmtp } from './smtpVerifier.js';

const generateRandomEmail = (domain) => {
  const prefix = Math.random().toString(36).substring(2, 12);
  return `${prefix}@${domain}`;
};

const cache = new Map();

export async function detectCatchAll(originalEmail, host) {
  const domain = originalEmail.split('@')[1];
  if (cache.has(domain)) return cache.get(domain);

  const randomEmail = generateRandomEmail(domain);
  const result = await verifySmtp(randomEmail);
  const isCatchAll = result.success;
  cache.set(domain, isCatchAll);
  return isCatchAll;
}
