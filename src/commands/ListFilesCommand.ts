import { Client } from 'basic-ftp'
import { Command } from 'commander'
import { savedInstanceName } from '../lib/defaultInstanceId'
import { ensureLoggedIn } from '../lib/ensureLoggedIn'
import { getClient, getInstanceBySubdomainCnameOrId } from '../lib/getClient'

export const listFiles = async (
  instanceName: string,
  path: string = 'pb_public'
) => {
  if (!instanceName) {
    throw new Error(
      `No instance name provided and none was found in package.json or pockethost.json. Use 'phio link <instance>'`
    )
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

    const remotePath = `${instanceName}/${path}`
    console.log(`Listing contents of ${remotePath}:\n`)

    const files = await ftpClient.list(remotePath)

    if (files.length === 0) {
      console.log('(empty directory)')
    } else {
      files.forEach((file) => {
        const type = file.isDirectory ? 'DIR ' : 'FILE'
        const size = file.isDirectory ? '' : `(${formatBytes(file.size)})`
        const date = file.modifiedAt
          ? file.modifiedAt.toISOString().split('T')[0]
          : ''
        console.log(
          `${type}  ${file.name.padEnd(40)} ${size.padEnd(12)} ${date}`
        )
      })
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to list files: ${error.message}`)
    }
    throw error
  } finally {
    ftpClient.close()
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export const ListFilesCommand = () => {
  return new Command('lsfiles')
    .argument('[instanceName]', 'Instance name', savedInstanceName())
    .argument('[path]', 'Path to list (relative to instance root)', 'pb_public')
    .description('List files in instance directory')
    .action(listFiles)
}
