import * as core from '@actions/core'

class Environement
{
	#key: string = ''

	constructor(key: string)
	{
		this.#key = key
	}

	GetKey(): string
	{
		return this.#key
	}
}

export class StringEnvironment extends Environement
{
	constructor(key: string)
	{
		super(key)
	}

	Set(value: string)
	{
		core.saveState(this.GetKey(), value)
	}

	Get(): string
	{
		return core.getState(this.GetKey())
	}
}

export class BooleanEnvironment extends Environement
{
	constructor(key: string)
	{
		super(key)
	}

	Set(value: Boolean)
	{
		core.saveState(this.GetKey(), value.toString())
	}

	Get(): Boolean
	{
		return !!core.getState(this.GetKey())
	}
}

export class NumberEnvironment extends Environement
{
	constructor(key: string)
	{
		super(key)
	}

	Set(value: number)
	{
		core.saveState(this.GetKey(), value.toString())
	}

	Get(): number
	{
		return +core.getState(this.GetKey())
	}
}
