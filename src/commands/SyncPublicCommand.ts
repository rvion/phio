import { confirm } from '@inquirer/prompts'
import { Client } from 'basic-ftp'
import { Command } from 'commander'
import { existsSync, statSync } from 'fs'
import { globby } from 'globby'
import { join } from 'path'
import { savedInstanceName } from '../lib/defaultInstanceId'
import { ensureLoggedIn } from '../lib/ensureLoggedIn'
import { getClient, getInstanceBySubdomainCnameOrId } from '../lib/getClient'

type FileInfo = {
  path: string
  size: number
  isDirectory: boolean
}

export const syncPublic = async (
  instanceName: string,
  options: { yes: boolean; delete: boolean; localDir: string; remoteDir: string }
) => {
  const { localDir, remoteDir } = options
  if (!instanceName) {
    throw new Error(
      `No instance name provided and none was found in package.json or pockethost.json. Use 'phio link <instance>'`
    )
  }

  if (!existsSync(localDir)) {
    throw new Error(`Local directory '${localDir}' does not exist`)
  }

  if (!statSync(localDir).isDirectory()) {
    throw new Error(`'${localDir}' is not a directory`)
  }

  await ensureLoggedIn()
  const pbClient = await getClient()

  // Verify instance exists
  try {
    await getInstanceBySubdomainCnameOrId(instanceName)
  } catch (error) {
    throw new Error(`Instance ${instanceName} not found`)
  }

  const ftpClient = new Client()
  ftpClient.ftp.verbose = false

  try {
    console.log(`Connecting to FTP server...`)
    await ftpClient.access({
      host: 'ftp.pockethost.io',
      user: '__auth__',
      password: pbClient.authStore.exportToCookie(),
      secure: false,
    })

    const remotePath = `${instanceName}/${remoteDir}`

    // Get remote files
    console.log(`Scanning remote directory...`)
    const remoteFiles = await getRemoteFiles(ftpClient, remotePath)
    const remoteFileSet = new Set(remoteFiles.map((f) => f.path))

    // Get local files
    console.log(`Scanning local directory...`)
    const localFiles = await getLocalFiles(localDir)
    const localFileSet = new Set(localFiles.map((f) => f.path))

    // Calculate changes
    const toUpload = localFiles.filter((f) => !f.isDirectory)
    const toDelete = options.delete
      ? remoteFiles.filter((f) => !localFileSet.has(f.path) && !f.isDirectory)
      : []

    // Show preview
    console.log(`\n📋 Preview of changes:\n`)

    if (toUpload.length > 0) {
      console.log(`📤 Files to upload (${toUpload.length}):`)
      toUpload.slice(0, 20).forEach((f) => {
        const status = remoteFileSet.has(f.path) ? 'UPDATE' : 'NEW   '
        console.log(`  ${status}  ${f.path} (${formatBytes(f.size)})`)
      })
      if (toUpload.length > 20) {
        console.log(`  ... and ${toUpload.length - 20} more files`)
      }
      console.log()
    }

    if (toDelete.length > 0) {
      console.log(`🗑️  Files to delete (${toDelete.length}):`)
      toDelete.slice(0, 20).forEach((f) => {
        console.log(`  DELETE  ${f.path}`)
      })
      if (toDelete.length > 20) {
        console.log(`  ... and ${toDelete.length - 20} more files`)
      }
      console.log()
    }

    if (toUpload.length === 0 && toDelete.length === 0) {
      console.log(`✨ No changes detected - remote and local are in sync!`)
      return
    }

    // Confirm
    if (!options.yes) {
      const confirmed = await confirm({
        message: `Proceed with syncing ${toUpload.length} uploads and ${toDelete.length} deletions?`,
        default: false,
      })

      if (!confirmed) {
        console.log(`❌ Sync cancelled`)
        return
      }
    }

    // Upload files
    if (toUpload.length > 0) {
      console.log(`\n📤 Uploading files...`)
      for (const file of toUpload) {
        const localPath = join(localDir, file.path)
        const remoteFilePath = `${instanceName}/${remoteDir}/${file.path}`
        await ftpClient.uploadFrom(localPath, remoteFilePath)
        console.log(`  ✓ ${file.path}`)
      }
    }

    // Delete files
    if (toDelete.length > 0) {
      console.log(`\n🗑️  Deleting remote files...`)
      for (const file of toDelete) {
        const remoteFilePath = `${instanceName}/${remoteDir}/${file.path}`
        await ftpClient.remove(remoteFilePath)
        console.log(`  ✓ ${file.path}`)
      }
    }

    console.log(`\n✅ Sync complete!`)
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to sync: ${error.message}`)
    }
    throw error
  } finally {
    ftpClient.close()
  }
}

async function getRemoteFiles(
  ftpClient: Client,
  remotePath: string
): Promise<FileInfo[]> {
  const files: FileInfo[] = []

  async function scan(path: string, prefix: string = '') {
    try {
      const list = await ftpClient.list(path)
      for (const item of list) {
        const relativePath = prefix ? `${prefix}/${item.name}` : item.name
        if (item.isDirectory) {
          files.push({
            path: relativePath,
            size: 0,
            isDirectory: true,
          })
          await scan(`${path}/${item.name}`, relativePath)
        } else {
          files.push({
            path: relativePath,
            size: item.size,
            isDirectory: false,
          })
        }
      }
    } catch (error) {
      // Directory might not exist, that's ok
    }
  }

  await scan(remotePath)
  return files
}

async function getLocalFiles(localDir: string): Promise<FileInfo[]> {
  const files: FileInfo[] = []
  const paths = await globby('**/*', {
    cwd: localDir,
    dot: true,
    followSymbolicLinks: false,
  })

  for (const path of paths) {
    const fullPath = join(localDir, path)
    const stat = statSync(fullPath)
    files.push({
      path,
      size: stat.size,
      isDirectory: stat.isDirectory(),
    })
  }

  return files
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export const SyncPublicCommand = () => {
  return new Command('sync-public')
    .argument('[instanceName]', 'Instance name', savedInstanceName())
    .description('Sync local directory with remote directory')
    .option('-l, --local-dir <path>', 'Local directory to sync', './pb_public')
    .option(
      '-r, --remote-dir <path>',
      'Remote directory (relative to instance root)',
      'pb_public'
    )
    .option('-y, --yes', 'Skip confirmation prompt', false)
    .option('--delete', 'Delete remote files that do not exist locally', false)
    .action(syncPublic)
}
