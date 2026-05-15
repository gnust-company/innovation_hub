"""Company email allowlist policy."""
from typing import Iterable

from app.core.config import get_settings


def normalize_email_domains(domains: Iterable[str]) -> list[str]:
    """Normalize allowed email suffixes to lowercase @domain values."""
    normalized = []
    for domain in domains:
        value = domain.strip().lower()
        if not value:
            continue
        if not value.startswith("@"):
            value = f"@{value}"
        normalized.append(value)
    return normalized


def get_allowed_email_domains() -> list[str]:
    """Return configured allowed company email suffixes."""
    return normalize_email_domains(get_settings().allowed_email_domains)


def is_allowed_company_email(email: str | None) -> bool:
    """Check whether an email belongs to a configured company domain."""
    if not email:
        return False
    allowed_domains = get_allowed_email_domains()
    if not allowed_domains:
        return False
    normalized_email = email.strip().lower()
    return any(normalized_email.endswith(domain) for domain in allowed_domains)


def allowed_email_domains_message() -> str:
    """Human readable validation message for company email policy."""
    allowed_domains = get_allowed_email_domains()
    if not allowed_domains:
        return "Company email domain is not configured"
    return "Email must use an allowed company domain: " + ", ".join(
        allowed_domains
    )
