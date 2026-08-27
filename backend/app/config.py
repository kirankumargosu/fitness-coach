import os

# Whoever this name matches (case-insensitive) becomes — and stays — the
# app's one admin, who can view/edit everyone's data. Everyone else
# defaults to "member" (their own data only). Set via env var so it's
# configurable per-deployment without a code change.
ADMIN_USER = os.getenv("ADMIN_USER", "Admin")  # default to "Admin" if not set