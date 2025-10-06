# phio: the pockethost.io CLI

**Auth**

```bash
bunx phio login
bunx phio logout
bunx phio whoami
```

**List instances**

```bash
bunx phio list
```

**Watch and push local changes instantly**

```bash
bunx phio dev [instance]
```

**Deploy to remote**

```bash
bunx phio deploy [instance]
```

**Tail logs**

```bash
bunx phio logs [instance]
```

**List remote files**

```bash
bunx phio lsfiles [instance] [path]

# List pb_public directory (default)
bunx phio lsfiles

# List a specific directory
bunx phio lsfiles my-instance pb_hooks

# Output example:
# Connecting to FTP server...
# Listing contents of my-instance/pb_public:
#
# DIR   assets                                              2025-01-06
# FILE  index.html                               (464 B)   2025-01-06
# FILE  vite.svg                                 (1.46 KB) 2025-01-06
```

**Sync local directory to remote**

Features:
- Scans local directory and remote pb_public
- Shows preview of changes (NEW, UPDATE, DELETE)
- Requires confirmation unless --yes flag is used
- Uploads all local files
- Optionally deletes remote files with --delete flag

Preview output:
- Shows files to upload (NEW/UPDATE) with sizes
- Shows files to delete (if --delete is used)
- Limits preview to 20 files, shows count if more
- Confirms before making changes
-
```bash
bunx phio sync-public [instance] [options]

# Options:
#   -l, --local-dir <path>   Local directory to sync (default: "./pb_public")
#   -r, --remote-dir <path>  Remote directory (default: "pb_public")
#   -y, --yes                Skip confirmation prompt
#   --delete                 Delete remote files not in local directory

# Examples:
bunx phio sync-public                              # Sync ./pb_public to pb_public
bunx phio sync-public -l ./dist                    # Sync ./dist to pb_public
bunx phio sync-public -l ./dist -r pb_public       # Explicit local and remote
bunx phio sync-public -l ./hooks -r pb_hooks       # Sync hooks directory
bunx phio sync-public --yes --delete               # Auto-confirm and delete extra files

# bunx phio sync-public -l ./dist
# Connecting to FTP server...
# Scanning remote directory...
# Scanning local directory...

# 📋 Preview of changes:

# 📤 Files to upload (3):
#   UPDATE  index.html (1.09 MB)
#   UPDATE  vite.svg (1.46 KB)
#   NEW     test.md (0 B)

# ? Proceed with syncing 3 uploads and 0 deletions? (y/N) Yes

# 📤 Uploading files...
#   ✓ index.html
#   ✓ vite.svg
#   ✓ test.md

# ✅ Sync complete!
```


## Configuration

Use `pockethost` in your `package.json` to save your instance name so you don't need to keep typing it:

```json
// package.json
{
  "pockethost": {
    "instanceName": "all-your-base"
  }
}
```

-or-

Use `pockethost.json` to save your instance name so you don't need to keep typing it.

```json
{
  "instanceName": "all-your-base"
}
```

## Environment Variables

The following environment variables can be used to override any saved configuration:

- `PHIO_USERNAME` - Override saved username
- `PHIO_PASSWORD` - Override saved password
- `PHIO_INSTANCE_NAME` - Override saved instance name

Environment variables take precedence over configuration in package.json or pockethost.json.
