export function pad(str: string | number)
{
	return `${str}`.padStart(2, '0');
}

export function getUtcDate(d: Date | string | number = new Date()): string
{
	if(!(d instanceof Date))
	{
		d = new Date(d);
	}

	return `${d.getFullYear()
		}-${pad(d.getMonth() + 1)
		}-${pad(d.getDate())
		}`;
}

export function getUtcTime(d: Date | string | number = new Date()): string
{
	if(!(d instanceof Date))
	{
		d = new Date(d);
	}

	return `${pad(d.getHours())
		}:${pad(d.getMinutes())
		}:${pad(d.getSeconds())
		}`;
}

export function getSqlDate(d: Date | string | number = new Date()): string
{
	if(!(d instanceof Date))
	{
		d = new Date(d);
	}

	return `${getUtcDate(d)} ${getUtcTime(d)}`;
}

export function getDayOfWeek(date: string, short?: boolean): string
{
	const d: Date = new Date(date);

	const days = [
		'Sunday',
		'Monday',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday'
	];

	return short ? days[d.getDay()].slice(0, 2) : days[d.getDay()];
}

/** Various time units as seconds */
export enum SecondsIn
{
	minute = 60,
	hour = 60 * 60,
	day = 60 * 60 * 24,
	month = 60 * 60 * 24 * 30,
	year = 60 * 60 * 24 * 30 * 12,
}

export enum ShortTimeNames
{
	minute = 'm',
	hour = 'h',
	day = 'd',
	month = 'mo',
	year = 'y',
}

export const ShortMonthNames = {
	0: 'Jan',
	1: 'Feb',
	2: 'Mar',
	3: 'Apr',
	4: 'May',
	5: 'Jun',
	6: 'Jul',
	7: 'Aug',
	8: 'Sep',
	9: 'Oct',
	10: 'Nov',
	11: 'Dec'
} as const;

export type TimeUnit = 'minute' | 'hour' | 'day' | 'month' | 'year';

export function secondsToHumanReadable(seconds: number, short = false)
{
	let res = `${seconds} ${short ? 's' : 'seconds'}`;

	Object.keys(SecondsIn).forEach((x: string) =>
	{
		if(seconds > SecondsIn[x as TimeUnit])
		{
			if(seconds > 2 * SecondsIn[x as TimeUnit])
			{
				res = `${Math.floor(seconds / SecondsIn[x as TimeUnit])} ${short ? ShortTimeNames[x as TimeUnit] : `${x}s`
					}`;
			} else
			{
				res = short ? `1 ${ShortTimeNames[x as TimeUnit]}` : `a ${x}`;
			}
		}
	});

	return res;
}

export function timeSince(time: number, short?: boolean, shorter?: boolean)
{
	const diff = Math.floor((Date.now() - time) / 1000);

	if(shorter)
	{
		return secondsToHumanReadable(diff, short);
	}

	if(diff > 0)
	{
		return `${secondsToHumanReadable(diff, short)} ago`;
	} else
	{
		return `in ${secondsToHumanReadable(-diff, short)}`;
	}
}

export function offsetDateFromUTC(date: string): string
{
	// millis to add for timezone correction
	const offset = new Date().getTimezoneOffset() * 60 * 1000;

	return new Date(new Date(date).getTime() - offset).toISOString();
}

export function getDateParts()
{
	const dt = new Date();

	const second = pad(dt.getSeconds());
	const minute = pad(dt.getMinutes());
	const hour = pad(dt.getHours());
	const month = pad(dt.getMonth() + 1);
	const day = pad(dt.getDate());
	const year = dt.getFullYear();

	return { second, minute, hour, day, month, year };
}
