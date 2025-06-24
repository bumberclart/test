import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { verifyEmail } from './orchestrator.js';
import pLimit from 'p-limit';
import { Command } from 'commander';
import { checkSyntax } from './modules/syntaxChecker.js'; // For email validation

const program = new Command();
program
  .option('-i, --input <path>', 'CSV input file with emails', 'input.csv')
  .option('-o, --output <path>', 'CSV output file', 'output.csv')
  .option('-c, --concurrency <number>', 'Number of concurrent verifications')
  .option('-d, --delay <ms>', 'Delay (in ms) between requests')
  .option('-e, --email-column <name>', 'Column name for email address')
  .parse(process.argv);

/*
Example usage:
node verifyFromCsv.js -i input.csv -o results.csv -c 5 -d 500 -e email 
 */

const options = program.opts();
const concurrency_limit = 1
const limit = options.concurrency? pLimit(parseInt(options.concurrency, 10)): pLimit(concurrency_limit);
const randomDelay = Math.floor(Math.random() * 30000) + 10000
const DELAY_MS = options.delay ? parseInt(options.delay, 10) : randomDelay;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractEmail(record, columnName) {
  // Try user-specified column (case-insensitive)
  const columns = Object.keys(record);
  let emailValue;

  // Case-insensitive match for specified column
  const matchedCol = columns.find(
    col => col.trim().toLowerCase() === columnName.trim().toLowerCase()
  );
  if (matchedCol && record[matchedCol]) {
    emailValue = record[Col];
  } else {
    // Fallbacks to common names
    const fallbacks = ['email', 'Email', 'e-mail', 'E-mail'];
    for (const alt of fallbacks) {
      if (columns.includes(alt) && record[alt]) {
        emailValue = record[alt];
        break;
      }
    }
    // Last fallback – scan all values for a valid email using checkSyntax
    if (!emailValue) {
      emailValue = Object.values(record).find(
        val => typeof val === 'string' && checkSyntax(val.trim())
      );
      if (emailValue) {
        console.warn('[WARN] Could not find specified email column. Extracted using validator:', emailValue);
      }
    }
  }
  return emailValue;
}

async function main() {
  const inputPath = path.resolve(options.input);
  const outputPath = path.resolve(options.output);
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);
  const parser = parse({ columns: true });
  const stringifier = stringify({ header: true });

  parser.on('data', async (record) => {
    parser.pause();

    const email = extractEmail(record, options.emailColumn);

    // Validate the extracted email is syntactically valid
    if (!email || !checkSyntax(email)) {
      console.error(`[ERROR] Could not extract valid email from record:`, JSON.stringify(record));
      stringifier.write({
        ...record,
        email: email || 'N/A',
        syntaxValid: false,
        mxValid: false,
        disposable: false,
        success: false,
        smtpCode: '',
        smtpResponse: 'No valid email extracted',
        catchAll: '',
        errors: 'Invalid or missing email column'
      });
      parser.resume();
      return;
    }

    // Add the delay before the verification
    await sleep(DELAY_MS);

    const result = await limit(() => verifyEmail(email));
    stringifier.write({
      ...record,
      email: result.email,
      // syntaxValid: result.syntaxValid,
      // mxValid: result.mxValid,
      disposable: result.disposable,
      roleAccount: result.roleAccount,
      success: result.smtp.success,
      smtpCode: result.smtp.code,
      smtpResponse: result.smtp.response,
      catchAll: result.catchAll,
      errors: result.errors.join('; ')
    });

    parser.resume();
  });

  parser.on('end', () => {
    stringifier.end();
    console.log('Verification complete. Results saved to', outputPath);
  });

  input.pipe(parser);
  stringifier.pipe(output);
}

main().catch(err => {
  console.error('Error in verifier:', err);
});