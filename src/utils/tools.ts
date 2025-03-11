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

	const data = structuredClone(inputData) as Record<string, unknown>;

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

export function dotPick(obj: Record<string, unknown>, path: string)
{
	if(!path || typeof path !== 'string') return undefined;

	path = path.replaceAll('[', '.');
	path = path.replaceAll(']', '.');
	path = path.replaceAll('..', '.');

	if(path.substring(path.length - 1, path.length) === '.')
	{
		path = path.substring(0, path.length - 1);
	}

	const arr = path.split('.');
	let res: unknown = obj;

	do
	{
		const nextKey = arr.shift();

		if(nextKey)
		{
			res = (res as Record<string, unknown>)?.[nextKey];
		}
		else
		{
			break;
		}
	}
	while(arr.length && isPopulatedObject(res));

	return res;
}

export function reduceIntoAssociativeArray(
	source: unknown[],
	key: string,
	deleteKey = false
): Record<string, unknown> | undefined
{
	if(Array.isArray(source))
	{
		return source.reduce((agg: Record<string, unknown>, item) =>
		{
			if(isPopulatedObject(item) && typeof item[key] === 'string')
			{
				const clonedItem = { ...item };

				if(deleteKey)
				{
					delete clonedItem[key];
				}

				agg[item[key]] = clonedItem;
			}

			return agg;
		}, {});
	}

	return undefined;
}
