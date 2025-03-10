import { generateUuid } from "./uuid";

function getInstanceId()
{
	return generateUuid().split('-')[0];
}

export class DebugTools
{
	public instanceId = getInstanceId();
	public instanceType?: string;

	constructor(opts: {
		instanceType?: string;
	})
	{
		this.instanceType = opts.instanceType;
	}

	public getTrace(num = 2): string
	{
		return new Error().stack
			?.split('\n')[num]
			?.split('at ')
			.pop() || '';
	}

	public $log(...msgs: any[])
	{
		console.log('stack:');
		console.log(`LOG: ${this.instanceId}${this.instanceType ? ` (${this.instanceType})` : ''
			}:`, ...msgs);
	}
}
