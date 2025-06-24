export async function retry(fn, attempts = 2, delayMs = Math.floor(Math.random() * 30000) + 10000) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) await new Promise(res => setTimeout(res, delayMs));
    }
  }
  throw lastError;
}
