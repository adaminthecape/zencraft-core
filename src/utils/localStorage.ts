/**
 * Save a value to localStorage.
 * Objects are automatically stringified.
 * Only registered names may be used.
 * @param name
 * @param data
 */
export function saveToLocalStorage(name: string, data: unknown) {
  const validName = (typeof name === 'string' && name) ? name : undefined;

  if (!validName) {
    return;
  }

  if (data && typeof data === 'object') {
    localStorage.setItem(validName, JSON.stringify(data));
  } else {
    localStorage.setItem(validName, data);
  }
}

/**
 * Get an item from local storage. Returns the string if it cannot be parsed, unless forceObject is true.
 * @param name - local storage key to fetch
 * @param forceObject - `true` to return undefined when parsing as object fails
 * @returns {string|unknown}
 */
export function getFromLocalStorage(
  name: string,
  forceObject = false
)
{
  const validName = (typeof name === 'string' && name) ? name : undefined;

  if (!validName) {
    return undefined;
  }

  const data = localStorage.getItem(validName);

  if (forceObject) {
    try {
      return JSON.parse(data as string);
    } catch (e) {
      return undefined;
    }
  } else {
    try {
      return JSON.parse(data as string);
    } catch (e) {
      return data;
    }
  }
}

/**
 * Insert a value into an existing array in localStorage, if not already in the array.
 * @param name
 * @param data
 */
export function saveToLocalStorageArray(name: string, data: unknown) {
  const existingData = getFromLocalStorage(name) || [];

  if (
    !existingData.some((item: unknown) => {
      let itemComp;

      try {
        itemComp =
          item && typeof item === 'object' ? JSON.stringify(item) : item;
      } catch (e) {
        itemComp = item;
      }

      return item === itemComp;
    })
  ) {
    existingData.push(data);
  }

  saveToLocalStorage(name, JSON.stringify(existingData));
}

export function localStorageIntervalQueueAdd(
  name: string,
  item: string | number
) {
  if ((item !== 0) && (!name || !item)) {
    return;
  }

  saveToLocalStorageArray(name, item);
}

export function localStorageIntervalCheck(
  name: string,
  callback: (queue: Array<string | number>) => void
) {
  if (!name || typeof callback !== 'function') {
    return undefined;
  }

  return setInterval(() => {
    const queue = getFromLocalStorage(name);

    if (Array.isArray(queue) && queue.length) {
      console.log('localStorageIntervalCheck', name, queue);
      callback([queue[0]]);
      saveToLocalStorage(name, queue.slice(1));
    }
  }, 250);
}

