import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as os from 'os'
import * as tmp from 'tmp'
import * as fs from 'fs/promises';
import { BooleanStateValue, StringStateValue } from './StateHelper'

const IsMacOS = os.platform() === 'darwin'

const PostProcess = new BooleanStateValue('IS_POST_PROCESS')
const ProvisioningProfile = new StringStateValue('PROVISIONING_PROFILE')

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

async function Run()
{
	try {
		let APIKeyPath = core.getInput('api-key-path')
		const APIKeyBase64 = core.getInput('api-key-base64')
		if (APIKeyBase64 !== '') {
			APIKeyPath = tmp.fileSync().name
			await fs.writeFile(APIKeyPath, Buffer.from(APIKeyBase64, 'base64'))
		}

		process.env.MATCH_APP_IDENTIFIER = core.getInput('app-identifier')
		process.env.MATCH_TYPE = core.getInput('type')
		process.env.FASTLANE_TEAM_ID = core.getInput('team-id')
		process.env.MATCH_GIT_URL = core.getInput('git-url')
		process.env.MATCH_PASSWORD = core.getInput('git-passphrase')
		process.env.APP_STORE_CONNECT_API_KEY_PATH = APIKeyPath
		process.env.MATCH_KEYCHAIN_NAME = core.getInput('keychain')
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

		await exec.exec('fastlane', ['match'], options)

		const provisioningProfileUUID = MatchProvisioningProfile(output, process.env.MATCH_APP_IDENTIFIER, 'UUID')
		const provisioningProfileName = MatchProvisioningProfile(output, process.env.MATCH_APP_IDENTIFIER, 'Name')
		const provisioningProfilePath = MatchProvisioningProfile(output, process.env.MATCH_APP_IDENTIFIER, 'Path')

		core.setOutput('provisioning-profile', provisioningProfilePath)
		core.setOutput('provisioning-profile-uuid', provisioningProfileUUID)
		core.setOutput('provisioning-profile-name', provisioningProfileName)

		ProvisioningProfile.Set(provisioningProfilePath)
	} catch (ex: any) {
		core.setFailed(ex.message)
	}
}

async function Cleanup()
{
	try {
		core.info('Remove provisioning profile')
		await io.rmRF(ProvisioningProfile.Get())
	} catch (ex: any) {
		core.setFailed(ex.message)
	}
}

if (!IsMacOS) {
	core.setFailed('Action requires macOS agent.')
} else {
	if (!!PostProcess.Get()) {
		Cleanup()
	} else {
		Run()
	}
	
	PostProcess.Set(true)
}
