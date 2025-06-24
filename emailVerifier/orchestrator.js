import { logError } from './logger.js';
import { checkSyntax } from './syntaxChecker.js';
import { hasValidMx } from './dnsChecker.js';
import { checkDisposable } from './disposableChecker.js';
import { verifySmtp } from './smtpVerifier.js';
import { detectCatchAll } from './catchAllDetector.js';
import { isRoleAccount } from './roleChecker.js';

/**
 * Orchestrates full email verification.
 * @param {string} email
 * @returns {Promise<Object>}
 */
export async function verifyEmail(email) {
  const result = {
    email,
    syntaxValid: false,
    mxValid: false,
    disposable: false,
    roleAccount: false,
    smtp: {},
    catchAll: null,
    errors: [],
  };

  try {
    // 1. Syntax check
    result.syntaxValid = checkSyntax(email);
    if (!result.syntaxValid) {
      const msg = 'Invalid email syntax';
      result.errors.push(msg);
      await logError(email, msg);
      return result;
    }

    // 1.5 Role account check
    result.roleAccount = await isRoleAccount(email);
    if (result.roleAccount) {
      const msg = 'Role-based email address (e.g. info, support) skipped';
      result.errors.push(msg);
      await logError(email, msg);
      return result;
    }

    // 2. MX check
    const mx = await hasValidMx(email);
    result.mxValid = mx;
    if (!mx) {
      const msg = 'No valid MX record for domain (cannot route email)';
      result.errors.push(msg);
      await logError(email, msg);
      return result;
    }

    // 3. Disposable check
    result.disposable = checkDisposable(email);
    if (result.disposable) {
      const msg = 'Disposable email address skipped';
      result.errors.push(msg);
      await logError(email, msg);
      return result;
    }

    // 4. SMTP check (can we actually deliver to this email?)
    const smtpResult = await verifySmtp(email);
    result.smtp = smtpResult;
    if (!smtpResult.success) {
      // Differentiate between connection errors and mailbox rejections
      let msg;
      if (!smtpResult.host) {
        msg = `SMTP connection failed: ${smtpResult.response || smtpResult.code || 'Unknown error'}`;
      } else {
        msg = `SMTP verification failed for mailbox: ${smtpResult.response || smtpResult.code || 'Unknown error'}`;
      }
      result.errors.push(msg);
      await logError(email, msg);
      // If we still have a host, we can try catch-all detection
      // (not returning early)
    }

    // Add a sleep delay between SMTP check and Catch-all detection
    const randomDelay = Math.floor(Math.random() * 30000) + 10000

    function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    await sleep(randomDelay)

    // 5. Catch-all detection (only if we have a host)
    if (smtpResult.host) {
      try {
        result.catchAll = await detectCatchAll(email);
      } catch (err) {
        const msg = 'Catch-all detection error: ' + (err.message || String(err));
        result.errors.push(msg);
        await logError(email, msg);
      }
    } else {
      const msg = 'Cannot perform catch-all check: MX or SMTP host unavailable';
      result.errors.push(msg);
      await logError(email, msg);
    }

  } catch (err) {
    // Unhandled errors
    const msg = err.message || String(err);
    result.errors.push(msg);
    await logError(email, msg);
  }

  return result;
}