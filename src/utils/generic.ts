export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export function getAppBasePath() {
  return undefined;
}

export function openInBrowser(link: string) {
  window.open(link, '_blank');
}

/**
 * Copy text or objects to the clipboard.
 * @param value
 */
export function copyToClipboard(value: any) {
  if (Array.isArray(value)) {
    navigator.clipboard.writeText(value.join(', '));
  } else if (value && typeof value === 'object') {
    navigator.clipboard.writeText(JSON.stringify(value));
  } else {
    navigator.clipboard.writeText(value);
  }
}

export function padLeft(
  str: string | number,
  padChar: string,
  totalLength: number
) {
  str = str.toString();

  while (str.length < totalLength) {
    str = `${padChar}${str}`;
  }

  return str;
}

export function loopToNextInArray<T = any>(
  currentVal: T,
  arr: T[],
  offset = 0
) {
  if (!arr?.length) return undefined;

  const currentIndex = arr.findIndex((x) => x === currentVal);

  if (currentIndex < 0) return arr[0];

  const targetIndex = (currentIndex + offset + 1) % arr.length;

  return arr[targetIndex];
}

/**
 * Log data to the console for debugging. Adds some nice formatting, too.
 * @param msgs
 */
export function consoleDebug(...msgs: any[]): void
{
  const trace = new Error().stack;
  const messages = Array.isArray(msgs) ? msgs.filter((m) =>
    ['string', 'number', 'boolean'].includes(typeof m)) : msgs;
  const objects = Array.isArray(msgs) ? msgs.filter((m) => m && typeof m === 'object') : [];

  console.log(`>> ${trace?.split('\n')[2].split('at ').pop() }`);
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
  source: any[],
  key: string,
  deleteKey = false
)
{
  let res;

  try
  {
    res = source.reduce((agg, item) =>
    {
      if(item && item[key])
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
  } catch(e)
  {
    console.warn(e);

    res = source;
  }

  return res;
}

export function stringSort(arr: any[], prop: string, inverse: boolean)
{
  arr.sort((a, b) =>
  {
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

export function intSort(arr: any[], prop: string, inverse: boolean)
{
  arr.sort((a, b) =>
  {
    return inverse ? a[prop] - b[prop] : b[prop] - a[prop];
  });
}

export function dateSort(arr: any[], prop: string, inverse: boolean)
{
  arr.sort((a, b) =>
  {
    const aComp = new Date(a[prop]).getTime();
    const bComp = new Date(b[prop]).getTime();

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
      if(isPopulatedObject(item) && (prop in (item as any)))
      {
        if(!agg.some((foundItem) => (
          (foundItem as any)[prop] === (item as any)[prop]
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

export function deepMerge(source: unknown, target: unknown): any
{
  if(Array.isArray(source) && Array.isArray(target))
  {
    return [...source, ...target];
  }

  if(isPopulatedObject(source) && isPopulatedObject(target))
  {
    const allKeys = uniq([
      ...Object.keys(source as any),
      ...Object.keys(target as any)
    ]);

    return allKeys.reduce((agg, key) =>
    {
      agg[key] = deepMerge((source as any)[key], (target as any)[key]);

      return agg;
    }, {} as any);
  }

  if(source && target)
  {
    return (source as any) + (target as any);
  }

  return source || target;
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
  while(arr.length && isPopulatedObject(res))

  return res;
}