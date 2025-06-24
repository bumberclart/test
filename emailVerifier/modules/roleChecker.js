const commonRoles = [
  'admin', 'info', 'support', 'sales', 'contact', 'help', 'office', 'billing', 'abuse', 'postmaster', 'webmaster', 'noc', 'security', 'legal', 'hr', 'jobs', 'press', 'media'
];

export async function isRoleAccount(email) {
  const localPart = email.split('@')[0].toLowerCase();
  return commonRoles.includes(localPart);
}