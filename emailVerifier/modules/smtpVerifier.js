import dns from 'dns/promises';
import { SMTPClient } from 'smtp-client';
import { retry } from '../utils/retry.js';

export async function verifySmtp(email) {
  const domain = email.split('@')[1];
  let host = null;

  try {
    // Retry the MX lookup
    const addresses = await retry(() => dns.resolveMx(domain), 2, 1000);
    const sorted = addresses.sort((a, b) => a.priority - b.priority);
    host = sorted[0].exchange; // Always set host if MX records found

    // Optionally, you could wrap the SMTP connection/commands in retry too, but
    // be careful—some mail servers may rate-limit or greylist you if they see quick retries.
    // For many real-world uses, retrying DNS, but making SMTP only once, is a safe approach.

    const client = new SMTPClient({ host, port: 25 });

    await client.connect();
    await client.greet({ hostname: 'localhost' });
    const randomFrom = `verif_${Math.random().toString(36).substring(2,6)}@mydomain.com`;
    await client.mail({ from: randomFrom });
    const { code, message } = await client.rcpt({ to: email });
    await client.quit();

    return {
      success: code >= 200 && code < 300,
      code,
      response: message,
      host
    };
  } catch (err) {
    return {
      success: false,
      code: err.code || null,
      response: err.message || '',
      host // host still provided if available
    };
  }
}