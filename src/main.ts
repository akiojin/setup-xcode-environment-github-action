import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as tmp from 'tmp'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Keychain, KeychainFile } from '@akiojin/keychain'

const IsMacOS = process.platform.toLowerCase() === 'darwin'

function Escape(text: string)
{
  return text.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')
}

function MatchProvisioningProfile(text: string, name: string, type: string): string
{
  const pattern = `^.*Profile ${Escape(type)}.*sigh_${Escape(name)}.*$`
  const match = text.match(new RegExp(pattern,'gm'))

  if (match === null) {
    throw new Error(`Not found provisioning profile. Match Pattern="${pattern}"`)
  }

  return match.join('\n').split('|')[3].trim()
}

async function DoFastlaneSigning()
{
  process.env.MATCH_APP_IDENTIFIER = core.getInput('app-identifier')
  process.env.MATCH_TYPE = core.getInput('type').toLowerCase()
  process.env.FASTLANE_TEAM_ID = core.getInput('team-id')
  process.env.MATCH_GIT_URL = core.getInput('git-url')
  process.env.MATCH_PASSWORD = core.getInput('git-passphrase')
  process.env.MATCH_GIT_BRANCH = core.getInput('git-branch')
  process.env.MATCH_KEYCHAIN_NAME = core.getInput('keychain') ?
    core.getInput('keychain') : Keychain.GetDefaultLoginKeychainPath()
  process.env.MATCH_KEYCHAIN_PASSWORD = core.getInput('keychain-password')
  process.env.MATCH_READONLY = 'true'

  let output: string = ''
  const options: exec.ExecOptions = {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString()
      }
    }
  }

  core.startGroup('Run fastlane "match"')
  await exec.exec('fastlane', ['match'], options)
  core.endGroup()

  const UUID = MatchProvisioningProfile(output, process.env.MATCH_APP_IDENTIFIER, 'UUID')
  const name = MatchProvisioningProfile(output, process.env.MATCH_APP_IDENTIFIER, 'Name')
  const path = MatchProvisioningProfile(output, process.env.MATCH_APP_IDENTIFIER, 'Path')

  core.setOutput('provisioning-profile', path)
  core.setOutput('provisioning-profile-uuid', UUID)
  core.setOutput('provisioning-profile-name', name)

  core.exportVariable('PROVISIONING_PROFILE', path)
  core.exportVariable('PROVISIONING_PROFILE_UUID', UUID)
  core.exportVariable('PROVISIONING_PROFILE_NAME', name)

  core.info(`UUID: ${UUID}`)
  core.info(`Name: ${name}`)
  core.info(`Path: ${path}`)
}

async function DoSelfSigning()
{
  core.startGroup('Run Self signing')

  const provisioning = tmp.tmpNameSync()
  await fs.writeFile(provisioning, Buffer.from(core.getInput('provisioning-profile-base64'), 'base64'))

  const installed = `${process.env.HOME}/Library/MobileDevice/Provisioning Profiles/${path.basename(provisioning)}.mobileprovision`
  await io.mv(provisioning, installed)

  core.setOutput('provisioning-profile', installed)

  const certificate = tmp.tmpNameSync() + '.p12'
  await fs.writeFile(certificate, Buffer.from(core.getInput('p12-base64'), 'base64'))

  var keychain = await KeychainFile.Open(core.getInput('keychain'), core.getInput('keychain-password'))
  await keychain.ImportCertificateFromFile(certificate, core.getInput('p12-password'))

  core.endGroup()
}

async function Run()
{
  try {
    if (!!core.getInput('p12-base64')) {
      await DoSelfSigning()
    } else {
      await DoFastlaneSigning()
    }
  } catch (ex: any) {
    core.setFailed(ex.message)
  }
}

if (!IsMacOS) {
  core.setFailed('Action requires macOS agent.')
} else {
  Run()
}
