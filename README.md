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

**Show FTP Files**

```sh
# bunx phio lsfiles [options] [instanceName] [path]
#   - path: Path to list (relative to instance root) (default: "pb_public")

bunx phio lsfiles
# Connecting to FTP server...
# Listing contents of <your-instance>/pb_public:

# DIR   assets
# FILE  index.html                               (464 B)
# FILE  vite.svg                                 (1.46 KB)
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
