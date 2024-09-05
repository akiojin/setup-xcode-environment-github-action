import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as tmp from 'tmp'
import * as fs from 'fs/promises'
import { Keychain, KeychainFile } from '@akiojin/keychain'
import { ArgumentBuilder } from '@akiojin/argument-builder'

const IsMacOS = process.platform.toLowerCase() === 'darwin'

function Escape(text: string) {
  return text.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')
}

function MatchProvisioningProfile(text: string, name: string, type: string): string
{
  const pattern = `^.*Profile ${Escape(type)}.*sigh_${Escape(name)}.*$`
  const match = text.match(new RegExp(pattern, 'm'))

  if (match === null) {
    throw new Error('Not found provisioning profile.')
  }

  return match.join('\n').split('|')[3].trim()
}

function MatchCertificate(text: string): string
{
  const pattern = `^.*Certificate Name.*$`
  const match = text.match(new RegExp(pattern, 'm'))

  if (match === null) {
    throw new Error('Not found Certificate.')
  }

  return match.join('\n').split('|')[3].trim()
}

async function DoFastlaneSigning()
{
  const keychain = core.getInput('keychain') ? core.getInput('keychain') : Keychain.GetDefaultLoginKeychainPath()

  Keychain.UnlockKeychain(keychain, core.getInput('keychain-password'))

  process.env.MATCH_APP_IDENTIFIER = core.getInput('app-identifier')
  process.env.MATCH_TYPE = core.getInput('type').toLowerCase()
  process.env.FASTLANE_TEAM_ID = core.getInput('team-id')
  process.env.MATCH_GIT_URL = core.getInput('git-url')
  process.env.MATCH_PASSWORD = core.getInput('git-passphrase')
  process.env.MATCH_GIT_BRANCH = core.getInput('git-branch')
  process.env.MATCH_KEYCHAIN_NAME = keychain
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

  const APPLE_PROV_PROFILE_UUID = MatchProvisioningProfile(output, process.env.MATCH_APP_IDENTIFIER, 'UUID')
  const APPLE_PROV_PROFILE_NAME = MatchProvisioningProfile(output, process.env.MATCH_APP_IDENTIFIER, 'Name')
  const APPLE_PROV_PROFILE_PATH = MatchProvisioningProfile(output, process.env.MATCH_APP_IDENTIFIER, 'Path')
  const APPLE_CERTIFICATE_SIGNING_IDENTITY = MatchCertificate(output)

  // Old
  core.setOutput('provisioning-profile', APPLE_PROV_PROFILE_PATH)
  core.setOutput('provisioning-profile-uuid', APPLE_PROV_PROFILE_UUID)
  core.setOutput('provisioning-profile-name', APPLE_PROV_PROFILE_NAME)

  core.exportVariable('PROVISIONING_PROFILE', APPLE_PROV_PROFILE_PATH)
  core.exportVariable('PROVISIONING_PROFILE_UUID', APPLE_PROV_PROFILE_UUID)
  core.exportVariable('PROVISIONING_PROFILE_NAME', APPLE_PROV_PROFILE_NAME)

  // New
  core.setOutput('apple-prov-profile', APPLE_PROV_PROFILE_PATH)
  core.setOutput('apple-prov-profile-uuid', APPLE_PROV_PROFILE_UUID)
  core.setOutput('apple-prov-profile-name', APPLE_PROV_PROFILE_NAME)
  core.setOutput('apple-certificate-signing-identity', APPLE_CERTIFICATE_SIGNING_IDENTITY)

  core.exportVariable('APPLE_PROV_PROFILE', APPLE_PROV_PROFILE_PATH)
  core.exportVariable('APPLE_PROV_PROFILE_UUID', APPLE_PROV_PROFILE_UUID)
  core.exportVariable('APPLE_PROV_PROFILE_NAME', APPLE_PROV_PROFILE_NAME)
  core.exportVariable('APPLE_CERTIFICATE_SIGNING_IDENTITY', APPLE_CERTIFICATE_SIGNING_IDENTITY)

  core.info(`Provisioning Profile UUID: ${APPLE_PROV_PROFILE_UUID}`)
  core.info(`Provisioning Profile Name: ${APPLE_PROV_PROFILE_NAME}`)
  core.info(`Provisioning Profile Path: ${APPLE_PROV_PROFILE_PATH}`)
  core.info(`Certificate Name: ${APPLE_CERTIFICATE_SIGNING_IDENTITY}`)
}

async function CreateDecodeProvisioningProfile(filename: string): Promise<string>
{
  const builder = new ArgumentBuilder()
    .Append('cmd')
    .Append('-D')
    .Append('-i', filename)

  let decoded = ''
  const options: exec.ExecOptions = {
    listeners: {
      stdout: (data: Buffer) => {
        decoded += data.toString()
      }
    }
  }

  await exec.exec('security', builder.Build(), options)

  const provisioning = tmp.tmpNameSync()
  await fs.writeFile(provisioning, decoded)

  return provisioning
}

async function GetProvisioningProfileParam(provisioning: string, name: string): Promise<string>
{
  const builder = new ArgumentBuilder()
    .Append('-c')
    .Append(`Print :${name}`)
    .Append(provisioning)

    let result = ''
    const options: exec.ExecOptions = {
    listeners: {
      stdout: (data: Buffer) => {
        result += data.toString()
      }
    }
  }

  await exec.exec('/usr/libexec/PlistBuddy', builder.Build(), options)

  return result;
}

async function GetUUID(filename: string): Promise<string>
{
  return await GetProvisioningProfileParam(filename, 'UUID')
}

async function GetName(filename: string): Promise<string>
{
  return await GetProvisioningProfileParam(filename, 'Name')
}

async function DoSelfSigning()
{
  core.startGroup('Run Self signing')

  const original = tmp.tmpNameSync()
  await fs.writeFile(original, Buffer.from(core.getInput('provisioning-profile-base64'), 'base64'))
  const provisioning = await CreateDecodeProvisioningProfile(original)

  const APPLE_PROV_PROFILE_UUID = await GetUUID(provisioning)
  const APPLE_PROV_PROFILE_NAME = await GetName(provisioning)

  const installed = `${process.env.HOME}/Library/MobileDevice/Provisioning Profiles/${APPLE_PROV_PROFILE_UUID}.provision`
  await io.mv(original, installed)

  core.setOutput('apple-prov-profile', installed)
  core.setOutput('apple-prov-profile-uuid', APPLE_PROV_PROFILE_UUID)
  core.setOutput('apple-prov-profile-name', APPLE_PROV_PROFILE_NAME)

  core.exportVariable('APPLE_PROV_PROFILE', installed)
  core.exportVariable('APPLE_PROV_PROFILE_UUID', APPLE_PROV_PROFILE_UUID)
  core.exportVariable('APPLE_PROV_PROFILE_NAME', APPLE_PROV_PROFILE_NAME)

  const certificate = tmp.tmpNameSync() + '.p12'
  await fs.writeFile(certificate, Buffer.from(core.getInput('p12-base64'), 'base64'))

  var keychain = await KeychainFile.Open(core.getInput('keychain'), core.getInput('keychain-password'))
  await keychain.ImportCertificateFromFile(certificate, core.getInput('p12-password'))

  core.endGroup()
}

async function Run()
{
  try {
    if (core.getInput('p12-base64')) {
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
