"""Structured application logging configuration.

Provides a single ``configure_logging`` entry point that sets up readable,
structured console logging for the application. No sensitive information
(passwords, JWTs, secrets) should ever be passed to the logger.
"""

import logging
import sys

from app.core.config import get_settings

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging() -> None:
    """Configure the root logger for structured console output."""
    settings = get_settings()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(fmt=LOG_FORMAT, datefmt=DATE_FORMAT))

    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL.upper())

    # Avoid duplicate handlers if configure_logging is called more than once
    # (e.g. during tests or module reloads).
    root_logger.handlers.clear()
    root_logger.addHandler(handler)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger configured under the application root logger."""
    return logging.getLogger(name)
