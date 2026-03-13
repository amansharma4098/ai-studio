"""Security utilities: JWT, password hashing, credential encryption."""
import base64
import hashlib
import json
import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt as _bcrypt
import jwt
from cryptography.fernet import Fernet

# ── Config ────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "fallback-secret-key")
ALGORITHM = "HS256"


# ── Password Hashing (direct bcrypt) ─────────────────────────────
def hash_password(password: str) -> str:
    salt = _bcrypt.gensalt()
    return _bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# ── JWT ───────────────────────────────────────────────────────────
def create_access_token(data: dict) -> str:
    payload = {**data, "exp": datetime.utcnow() + timedelta(hours=24)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return None


# ── Credential Encryption (AES-128 via Fernet) ───────────────────
def _get_fernet() -> Fernet:
    """Derive a 32-byte Fernet key from ENCRYPTION_KEY env var."""
    encryption_key = os.getenv("ENCRYPTION_KEY", "encryptionkey32byteslong_changeit")
    key_bytes = hashlib.sha256(encryption_key.encode()).digest()
    fernet_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(fernet_key)


def encrypt_credentials(data: dict) -> str:
    """Encrypt a dict of credentials to a base64 string."""
    f = _get_fernet()
    return f.encrypt(json.dumps(data).encode()).decode()


def decrypt_credentials(encrypted: str) -> dict:
    """Decrypt credentials back to dict."""
    f = _get_fernet()
    return json.loads(f.decrypt(encrypted.encode()).decode())
