import isEmail from 'validator/lib/isEmail.js';

export function checkSyntax(email) {
  // Returns true if the email is valid according to the validator library
  return isEmail(email);
}