export function isPopulatedObject(obj: unknown): obj is Record<string, unknown>
{
	return !!(
		obj &&
		typeof obj === 'object' &&
		!Array.isArray(obj) &&
		Object.keys(obj).length > 0
	);
}

export function removeUndefined<T = unknown | unknown[]>(inputData: T, depth = 0): Array<Partial<T>> | Partial<T> | null
{
	if(typeof inputData === 'undefined')
	{
		// normalise to null
		return null;
	}

	// array handling
	if(Array.isArray(inputData))
	{
		return inputData.map(
			(item) => removeUndefined(item, depth + 1)
		) as Partial<T>[];
	}

	// non-object handling
	if(!isPopulatedObject(inputData))
	{
		return inputData;
	}

	const data = { ...inputData } as Record<string, unknown>;

	Object.keys(data).forEach((key) =>
	{
		if(typeof data[key] === 'undefined')
		{
			delete data[key];
		}
	});

	return data as Partial<T>;
}


export function getCurrentSecond(): number
{
	return parseInt(`${Date.now()}`.slice(0, 10), 10);
}