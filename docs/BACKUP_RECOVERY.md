# WildNews backup and recovery

This runbook covers the logical database backups used while the WildNews Supabase project remains on the Free plan. Supabase-managed daily backups should replace this workflow after the project moves to a paid production plan.

## What is backed up

The `Backup Supabase database` GitHub Actions workflow runs every day at 03:30 UTC and may also be started manually. It creates:

- PostgreSQL roles required by the logical export.
- The application database schema.
- Application data, including stories, sources, editorial workflow state, taxonomy, schedules and settings.
- A checksum manifest and generation record.

Migration history is not exported separately because this project was initially migrated through the Supabase SQL editor and does not have a `supabase_migrations` tracking schema. The ordered SQL files in `supabase/migrations` remain the migration source of truth.

The files are packed into one archive, encrypted with AES-256-CBC using PBKDF2, verified by decrypting and reading the archive, and uploaded as a GitHub Actions artifact. Only the encrypted archive is uploaded. Artifacts are retained for 30 days.

The workflow does not commit production data to Git. The artifact remains unreadable without the encryption passphrase, including if the repository is public or repository access is later broadened.

## Required GitHub Actions secrets

Configure these repository secrets under **Settings → Secrets and variables → Actions**:

| Name | Purpose |
| --- | --- |
| `SUPABASE_DB_URL` | Session-pooler database connection string for the production Supabase project, with the password placeholder and its preceding colon removed. For example: `postgresql://postgres.project-ref@pooler-host:5432/postgres`. |
| `SUPABASE_DB_PASSWORD` | Production Supabase database password. The workflow safely URL-encodes it and combines it with the database address only inside the temporary runner. |
| `BACKUP_ENCRYPTION_PASSPHRASE` | A unique, randomly generated passphrase of at least 32 characters. Store a second copy in WildTeam's password manager because GitHub cannot reveal it later. |

Never place either value in source control, issue text, workflow logs or documentation.

## What is not backed up

A logical database export does not contain the bytes stored in Supabase Storage. WildNews currently uses Storage for admin avatars; those files must be recreated or copied separately if the project is lost. Remote Unsplash editorial images are referenced by URL and are not Supabase Storage objects.

The workflow also does not preserve external-service configuration or secret values held by Vercel, Supabase Vault, OpenAI, Unsplash, Brevo, Google or UptimeRobot. Their names and responsibilities are documented in `docs/ARCHITECTURE.md`, while actual values must remain in the appropriate service and secure organisational password storage.

## Confirming backups

1. Open the repository's **Actions** tab.
2. Open **Backup Supabase database**.
3. Confirm the latest scheduled run is green.
4. Confirm it contains an artifact named `wildnews-database-<UTC timestamp>`.
5. At least quarterly, download the latest artifact and perform the archive-integrity check below.

A failed backup must be investigated before the next scheduled run. GitHub sends workflow-failure notifications according to each repository member's notification settings.

## Inspecting a downloaded backup

Do this only on a trusted computer. The commands below decrypt a copy without changing Supabase.

```bash
export BACKUP_FILE="/absolute/path/to/wildnews-database-YYYYMMDDTHHMMSSZ.tar.gz.enc"
export RESTORE_DIR="/absolute/path/to/an-empty-temporary-folder"
export BACKUP_ENCRYPTION_PASSPHRASE="retrieve-this-from-the-password-manager"

openssl enc \
  -d \
  -aes-256-cbc \
  -pbkdf2 \
  -iter 200000 \
  -in "$BACKUP_FILE" \
  -out "$RESTORE_DIR/wildnews-database.tar.gz" \
  -pass env:BACKUP_ENCRYPTION_PASSPHRASE

tar -xzf "$RESTORE_DIR/wildnews-database.tar.gz" -C "$RESTORE_DIR"
cd "$RESTORE_DIR"
sha256sum --check SHA256SUMS
```

Delete the decrypted files securely when the inspection is complete. Do not upload or commit them.

## Restoring after data loss

Restoration can overwrite or conflict with live production data. Do not restore directly into the production project without first confirming the exact incident, backup timestamp and recovery target.

The safe recovery sequence is:

1. Pause WildNews automation and publishing.
2. Download and decrypt the chosen artifact.
3. Create a separate Supabase recovery project.
4. Follow Supabase's current **Backup and Restore using the CLI** procedure to restore roles, schema and data into that recovery project.
5. Verify row counts, admin authentication, public stories, scheduled work and automation configuration.
6. Copy only the required recovered records into production, or plan a controlled project cutover if full replacement is necessary.
7. Restore external configuration, Vault secrets and Storage objects separately.
8. Re-enable automation only after the health endpoint and an end-to-end editorial workflow pass.

Always use the current Supabase restore documentation. Managed schemas and platform behaviour can change, and restoring into a new project is safer than testing recovery against production.

