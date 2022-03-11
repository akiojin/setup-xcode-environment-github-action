import * as coreCommand from '@actions/core/lib/command'

export class StateHelper
{
	static Set(key: string, value: string): void
	{
		coreCommand.issueCommand('save-state', { name: key }, value)
	}

	static Get(key: string): string
	{
		return process.env[`STATE_${key}`] || '';
	}
}

export class StringStateValue
{
	key: string = '';

	constructor(key: string)
	{
		this.key = key
	}

	Set(value: string)
	{
		StateHelper.Set(this.key, value)
	}

	Get(): string
	{
		return StateHelper.Get(this.key)
	}
}

export class BooleanStateValue
{
	key: string = '';

	constructor(key: string)
	{
		this.key = key
	}

	Set(value: Boolean)
	{
		StateHelper.Set(this.key, value.toString())
	}

	Get(): Boolean
	{
		return !!StateHelper.Get(this.key)
	}
}
