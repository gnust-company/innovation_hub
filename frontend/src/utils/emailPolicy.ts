const DEFAULT_ALLOWED_EMAIL_DOMAINS = '@company.com';

export function getAllowedEmailDomains(): string[] {
  const raw = import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS || DEFAULT_ALLOWED_EMAIL_DOMAINS;
  return raw
    .split(',')
    .map((domain: string) => domain.trim().toLowerCase())
    .filter(Boolean)
    .map((domain: string) => (domain.startsWith('@') ? domain : `@${domain}`));
}

export function isAllowedCompanyEmail(email?: string): boolean {
  if (!email) return true;
  const normalizedEmail = email.trim().toLowerCase();
  const allowedDomains = getAllowedEmailDomains();
  return allowedDomains.length > 0
    && allowedDomains.some((domain) => normalizedEmail.endsWith(domain));
}

export function allowedEmailDomainsMessage(): string {
  return `Email must use an allowed company domain: ${getAllowedEmailDomains().join(', ')}`;
}
