"""Custom exception hierarchy for Walker.

Always chain with ``raise ... from e`` when wrapping a lower-level error.
"""

from __future__ import annotations


class WalkerError(Exception):
    """Base exception for all Walker errors."""


class NotFoundError(WalkerError):
    """Raised when a requested resource does not exist."""


class ValidationError(WalkerError):
    """Raised when input violates a domain rule."""


class CatalogImportError(WalkerError):
    """Raised when importing the T&E Code catalog fails."""
