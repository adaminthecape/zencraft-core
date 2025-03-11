export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export function getAppBasePath()
{
	return undefined;
}

export function openInBrowser(link: string)
{
	window.open(link, '_blank');
}

/**
 * Copy text or objects to the clipboard.
 * @param value
 */
export function copyToClipboard(value: unknown)
{
	if(Array.isArray(value))
	{
		navigator.clipboard.writeText(value.join(', '));
	} else if(value && typeof value === 'object')
	{
		navigator.clipboard.writeText(JSON.stringify(value));
	} else
	{
		navigator.clipboard.writeText(`${value}`);
	}
}

export function padLeft(
	str: string | number,
	padChar: string,
	totalLength: number
)
{
	str = str.toString();

	while(str.length < totalLength)
	{
		str = `${padChar}${str}`;
	}

	return str;
}

export function loopToNextInArray<T = unknown[]>(
	currentVal: T,
	arr: T[],
	offset = 0
)
{
	if(!arr?.length) return undefined;

	const currentIndex = arr.findIndex((x) => x === currentVal);

	if(currentIndex < 0) return arr[0];

	const targetIndex = (currentIndex + offset + 1) % arr.length;

	return arr[targetIndex];
}

/**
 * Log data to the console for debugging. Adds some nice formatting, too.
 * @param msgs
 */
export function consoleDebug(...msgs: unknown[]): void
{
	const trace = new Error().stack;
	const messages = Array.isArray(msgs) ? msgs.filter((m) =>
		['string', 'number', 'boolean'].includes(typeof m)) : msgs;
	const objects = Array.isArray(msgs) ? msgs.filter((m) => m && typeof m === 'object') : [];

	console.log(`>> ${trace?.split('\n')[2].split('at ').pop()}`);
	console.log(...messages);

	if(objects?.length)
	{
		objects.forEach((object) =>
		{
			console.log(object);
		});

		console.log('>> END');
	}
}

export function tryParseAsArray<T>(input: string): Array<T>
{
	try
	{
		return JSON.parse(input);
	}
	catch(e)
	{
		return [];
	}
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

function isNumber(value: unknown): value is number
{
	return typeof value === 'number' && !Number.isNaN(value);
}

export function stringSort(arr: unknown[], prop: string, inverse: boolean): void
{
	arr.sort((a, b) =>
	{
		if(!(isPopulatedObject(a) && isPopulatedObject(b)))
		{
			return -2;
		}

		if(!(isNumber(a[prop]) && isNumber(b[prop])))
		{
			return -1;
		}

		if(a[prop] < b[prop])
		{
			return inverse ? 1 : -1;
		}
		if(a[prop] > b[prop])
		{
			return inverse ? -1 : 1;
		}
		return 0;
	});
}

export function intSort(arr: unknown[], prop: string, inverse: boolean): void
{
	arr.sort((a, b) =>
	{
		if(!(isPopulatedObject(a) && isPopulatedObject(b)))
		{
			return -2;
		}

		if(!(isNumber(a[prop]) && isNumber(b[prop])))
		{
			return -1;
		}

		return inverse ? a[prop] - b[prop] : b[prop] - a[prop];
	});
}

/**
 * Date will fail if provided a timestamp as a string, or an invalid string.
 * @param dt 
 * @returns 
 */
export function toValidDateInput(dt: unknown): string | number | undefined
{
	if(dt === 0)
	{
		return dt;
	}

	if(!dt)
	{
		return undefined;
	}

	if(dt && typeof dt === 'number')
	{
		return dt;
	}

	if(dt && typeof dt === 'string')
	{
		const dtAsNum = parseInt(dt, 10);

		if(`${dtAsNum}` == dt)
		{
			return dtAsNum;
		}

		return dt;
	}

	return undefined;
}

export function toValidDate(dt: unknown): Date | undefined
{
	const dtInput = toValidDateInput(dt);

	if(!dtInput)
	{
		return undefined;
	}

	return new Date(dtInput);
}

export function dateSort(arr: unknown[], prop: string, inverse: boolean): void
{
	arr.sort((a, b) =>
	{
		if(!(isPopulatedObject(a) && isPopulatedObject(b)))
		{
			return -2;
		}

		const dateA = toValidDate(a[prop]);
		const dateB = toValidDate(b[prop]);

		if(!(dateA && dateB))
		{
			return -1;
		}

		const aComp = dateA.getTime();
		const bComp = dateB.getTime();

		return inverse ? aComp - bComp : bComp - aComp;
	});
}

export function toNumber(num: unknown): number | undefined
{
	if(typeof num === 'number')
	{
		if(Number.isNaN(num))
		{
			return undefined;
		}

		return num;
	}

	if(num && typeof num === 'string')
	{
		const parsedNum = num.includes('.') ? parseFloat(num) : parseInt(num, 10);

		if(`${parsedNum}` === `${num}`)
		{
			return parsedNum;
		}
	}

	return undefined;
}

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

// export function _removeUndefined<T = any>(inputData: T, depth = 0): T | null
// {
//   if(
//     depth > 100 ||
//     typeof inputData === 'undefined' ||
//     inputData === null
//   )
//   {
//     return null;
//   }

//   if(typeof inputData !== 'object')
//   {
//     return inputData;
//   }

//   if(Array.isArray(inputData))
//   {
//     return inputData.map((item) => (
//       removeUndefined(item, depth + 1)
//     )) as T;
//   }

//   const data = { ...inputData };

//   Object.keys(data).forEach((key) =>
//   {
//     if(typeof data[key] === 'undefined')
//     {
//       data[key] = null;
//     }
//   });

//   return data;
// }

export function uniq<T>(arr: T[], prop?: string): T[]
{
	if(!Array.isArray(arr))
	{
		return [];
	}

	if(prop)
	{
		return arr.reduce((agg, item) =>
		{
			if(isPopulatedObject(item) && (prop in item))
			{
				if(!agg.some((foundItem) => (
					isPopulatedObject(foundItem) &&
					foundItem[prop] === item[prop]
				)))
				{
					agg.push(item);
				}
			}

			return agg;
		}, [] as T[]);
	}

	return arr.reduce((agg, item) =>
	{
		if(!agg.includes(item))
		{
			agg.push(item);
		}

		return agg;
	}, [] as T[]);
}

export function deepMerge(
	source: unknown,
	target: unknown
): Record<string, unknown> | undefined
{
	if(isPopulatedObject(source) && isPopulatedObject(target))
	{
		const allKeys = uniq([
			...Object.keys(source),
			...Object.keys(target)
		]);

		return allKeys.reduce((agg, key) =>
		{
			agg[key] = deepMerge(source[key], target[key]);

			return agg;
		}, {} as Record<string, unknown>);
	}

	return [source, target].find(isPopulatedObject);
}

export const uuidRegex = (
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
);

export function isUuid(str: unknown): str is UUID
{
	if(!str || typeof str !== 'string')
	{
		return false;
	}

	return uuidRegex.test(str);
}

export function isUuidArray(arr: unknown): arr is UUID[]
{
	return (Array.isArray(arr) && arr.every(isUuid));
}

/**
 * Recursively retrieve field ids from a nested array of fields (or any Item)
 * @param items 
 * @returns Array of UUIDs
 */
export function retrieveItemIds<IItemType = Record<string, unknown>>(
	items: Array<IItemType | UUID | unknown>,
	allowRecursion?: boolean
): UUID[]
{
	const result: UUID[] = [];

	if(!Array.isArray(items))
	{
		return result;
	}

	items.forEach((item) =>
	{
		if(!item)
		{
			return;
		}
		else if(typeof item === 'string')
		{
			if(isUuid(item))
			{
				result.push(item);
			}
		}
		else if(isPopulatedObject(item))
		{
			if(isUuid(item?.id))
			{
				result.push(item.id);
			}

			if(
				allowRecursion &&
				Array.isArray(item?.children) &&
				item.children.length
			)
			{
				result.push(...(retrieveItemIds(item.children)));
			}
		}
	});

	return result;
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