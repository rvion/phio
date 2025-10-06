# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`phio` is a CLI tool for managing PocketHost instances. It provides commands to authenticate, deploy code, watch for changes, and tail logs from PocketHost instances.

## Development Commands

- **Run CLI in dev mode**: `npm run dev` or `tsx ./src/cli.ts`
- **Test CLI command**: `bunx phio <command>` (after building)
- **Format code**: Uses Prettier with organize-imports plugin (config in package.json)

## Architecture

### Entry Point & Command Structure

- **Entry**: `src/cli.ts` - Uses Commander.js to register all commands
- **Commands**: Each command in `src/commands/` exports a factory function that returns a Commander Command instance
- All commands follow the pattern: `export const XCommand = () => new Command('name')...`

### Authentication Flow

1. **Environment variables** (highest priority): `PHIO_USERNAME`, `PHIO_PASSWORD`, `PHIO_INSTANCE_NAME`
2. **Saved config** (fallback): Stored in `~/.config/phio/config.json` (or `PHIO_HOME` if set)
3. Config stores: `email` and `pb_auth` (PocketBase auth cookie)
4. `getClient()` in `src/lib/getClient.ts` manages a singleton PocketBase client instance
5. `ensureLoggedIn()` prompts for login if needed

### Instance Configuration Resolution

The CLI looks for instance names in this order:
1. Environment variable: `PHIO_INSTANCE_NAME`
2. `package.json` under `pockethost.instanceName`
3. `pockethost.json` under `instanceName`
4. Command-line argument if provided

This is handled by `savedInstanceName()` in `src/lib/defaultInstanceId.ts`.

### Deploy/Dev Architecture

- **DevCommand**: Uses `chokidar` to watch files and FTP deploy on changes
  - Debounces uploads (200ms) and uses Bottleneck for concurrency control (maxConcurrent: 1)
  - File matching uses `multimatch` with include/exclude patterns
  - Default includes: `pb_*`, `package.json`, `bun.lockb`, `patches`
  - Default excludes: `pb_data` and its contents

- **DeployCommand**: One-time deploy using the same `deployMyCode()` function
  - FTP server: `ftp.pockethost.io`
  - Username: `__auth__` (special auth marker)
  - Password: PocketBase auth cookie

- **FTP Deploy**: Uses `@samkirkland/ftp-deploy` from a forked GitHub repo (benallfree/ftp-deploy#132389e)

### Logs Streaming

- **LogsCommand**: Streams logs using Server-Sent Events (SSE) via `@sentool/fetch-event-source`
- Fetches from: `https://{instanceName}.pockethost.io/logs`
- Implements automatic reconnection with exponential backoff (100ms initial)
- Returns `[Promise, Unsubscribe]` tuple for clean shutdown
- Handles `SIGINT`, `SIGTERM`, `SIGHUP` for graceful termination

### Utilities

- **Task runner** (`src/lib/Task.ts`): Runs async tasks with `ora` spinners for visual feedback
- **Constants** (`src/lib/constants.ts`): Centralized environment variable access and path resolution
- **Config** (`src/lib/config.ts`): JSON file-based config storage using `fs-extra`

## TypeScript Configuration

- Uses `moduleResolution: "bundler"` (optimized for Bun/modern bundlers)
- `skipLibCheck: true` is set to avoid lib errors with the simplified tsconfig
- Runtime: Designed to run with `tsx` or `bun`

## PocketBase Integration

- API URL: `https://pockethost-central.pockethost.io` (configurable via `PHIO_MOTHERSHIP_URL`)
- Collections used:
  - `users`: Authentication
  - `instances`: Instance management (fields in `src/lib/InstanceFields.ts`)
- Authentication persisted via PocketBase auth cookie

## Key Dependencies

- `commander`: CLI framework
- `pocketbase`: PocketBase SDK
- `@inquirer/prompts`: Interactive prompts
- `chokidar`: File watching
- `ora`: Progress spinners
- `bottleneck`: Rate limiting
- `multimatch`: Glob pattern matching
- Custom SSE implementation via submodule: `@sentool/fetch-event-source`
