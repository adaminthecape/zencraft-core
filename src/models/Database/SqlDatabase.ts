import { GenericDatabase } from './GenericDatabase';
import { DbFilterOperator, DbFilters } from './DbFilters';
import { DbPaginationOpts, PaginatedItemResponse } from './Pagination';
import { Item } from '../Items/GenericItem';
import { isPopulatedObject } from '../../utils/tools';

export type SqlColumnDefinition = {
	Field: string;
	Type: string;
	Null: string;
	Key: string;
	Default: string;
	Extra: string;
};

export type SqlUserConfig = {
	user: string;
	password: string;
	database: string;
	host: string;
	port: number;
};

export type SqlDatabaseOpts = {
	isDebugMode?: boolean;
	customConfig?: SqlUserConfig;
};

export type MySQLConnection = {
	connect: () => Promise<void>;
	end: () => void;
	query: (query: string) => Promise<unknown>;
	format: (query: string, params: unknown[]) => string;
};

export class SqlDatabase<
	IItemIdType extends (string | number) = string,
	IItemType = Item
> extends GenericDatabase<string, IItemType>
{
	protected config: SqlUserConfig | undefined;
	protected connection: MySQLConnection | undefined;
	protected lastQuery: string | undefined;
	public isConnected: boolean = false;
	protected connectionTimeoutValue: number = 500;
	protected connectionTimeout: ReturnType<typeof setTimeout> | undefined;

	public static async getInstance(opts: SqlDatabaseOpts): Promise<SqlDatabase>
	{
		const instance = new SqlDatabase(opts);

		await instance.connect();

		return instance;
	}

	constructor(opts: SqlDatabaseOpts)
	{
		super(opts);

		if(!opts.customConfig)
		{
			this.config = {
				user: process.env.MYSQL_DB_USER as string,
				password: process.env.MYSQL_DB_PASS as string,
				host: process.env.MYSQL_DB_HOST as string,
				port: parseInt(process.env.MYSQL_DB_PORT as string, 10),
				database: process.env.MYSQL_DB_NAME as string,
			};
		}
		else
		{
			this.config = opts.customConfig;
		}
	}

	protected resetReleaseTimer(): void
	{
		if(this.connectionTimeout)
		{
			clearTimeout(this.connectionTimeout);
		}

		this.connectionTimeout = setTimeout(() =>
		{
			this.release();
		}, this.connectionTimeoutValue);
	}

	protected async connect(): Promise<void>
	{
		if(!this.config)
		{
			throw new Error('No config available');
		}

		if(this.isConnected)
		{
			this.resetReleaseTimer();

			return;
		}

		const { createConnection } = await import('mysql2/promise');

		this.connection = await createConnection(this.config);

		await this.connection.connect();

		this.isConnected = true;
	}

	public async release()
	{
		if(this.connection)
		{
			this.connection.end();
		}

		this.isConnected = false;
	}

	public getFormattedQuery(query: string, params: unknown[]): string | undefined
	{
		if(!this.connection)
		{
			return undefined;
		}

		return this.connection
			.format(query, params)
			.replace(/\s\s+/g, ' ')
			.trim();
	}

	protected async getDb(): Promise<ReturnType<typeof this.connect> | undefined>
	{
		await this.connect();
	}

	public async query(
		queryString: string,
		params: unknown[] = [],
		returnValueFunction?: (data: unknown) => unknown
	): Promise<unknown>
	{
		if(!this.connection)
		{
			console.warn('DB query ERROR: No connection!');
			return undefined;
		}

		try
		{
			// if (returnAffected) {
			// 	const [_, resultData] = await this.connection.query(
			// 		this.connection.format(queryString, params)
			// 	);

			// 	return resultData?.affectedRows;
			// }

			const qry = this.connection.format(queryString, params);

			this.lastQuery = qry;

			const resultData = await this.connection.query(qry);
			let result;

			if(typeof returnValueFunction === 'function')
			{
				result = returnValueFunction(resultData);
			}
			else
			{
				if(Array.isArray(resultData))
				{
					return resultData[0];
				}

				return undefined;
			}

			if(
				this.isDebugMode ||
				this.lastQuery?.includes('INSERT') ||
				// this.lastQuery?.includes('UPDATE') ||
				this.lastQuery?.includes('DELETE')
			)
			{
				console.log('-------------------------------------------------');
				console.log(this.lastQuery);
			}

			this.resetReleaseTimer();

			return result;
		}
		catch(e)
		{
			console.error(e);

			return undefined;
		}
	}

	public async query1(queryString: string, params: unknown[] = [])
	{
		if(!queryString.includes('LIMIT'))
		{
			queryString += ' LIMIT 1';
		}

		return this.query(queryString, params, (data) =>
		{
			let row;

			if(Array.isArray(data))
			{
				if(Array.isArray(data[0]))
				{
					row = data[0][0];

					if(row)
					{
						const key = Object.keys(row || {})?.[0];

						if(key)
						{
							return row[key];
						}
					}
				}
			}

			return undefined;
		});
	}

	public async query1r(queryString: string, params: unknown[] = [])
	{
		if(!queryString.includes('LIMIT'))
		{
			queryString += ' LIMIT 1';
		}

		return this.query(queryString, params, (data) =>
		{
			if(Array.isArray(data))
			{
				if(Array.isArray(data[0]))
				{
					return data[0][0];
				}
			}
		});
	}

	protected async validateColumns(tableName: string, columnNames: string[]): Promise<{
		success: boolean;
		error?: string;
		matches?: Record<string, boolean>;
	}>
	{
		if(!this.validateValue(tableName))
		{
			return { success: false, error: `Table name "${tableName}" invalid` };
		}

		const tableColumns = await this.query(
			`SHOW COLUMNS FROM ??`,
			[tableName]
		);

		if(!(Array.isArray(tableColumns) && tableColumns.length))
		{
			return { success: false, error: 'No columns' };
		}

		const columns = tableColumns
			?.map((colDef: SqlColumnDefinition) => colDef?.Field)
			?.filter((f: string) => f);

		if(!columns.length)
		{
			return { success: false, error: 'No columns' };
		}

		const matches = columnNames.reduce((agg, colToCheck) =>
		{
			agg[colToCheck] = columns.includes(colToCheck);

			return agg;
		}, {} as Record<string, boolean>);

		return {
			success: Object.keys(matches).every((m) => m),
			matches
		};
	}

	public validateValue(value: unknown)
	{
		const pattern = new RegExp(/^[A-Za-z0-9]*$/, 'gi');

		switch(typeof value)
		{
			case 'string':
				return pattern.test(value);
			case 'number':
				return !Number.isNaN(value);
			case 'boolean':
				return true;
			case 'object':
				return (value === null);
			default:
				return false;
		}
	}

	public async validateDataObject(
		tableName: string,
		data: Record<string, unknown>
	): Promise<{
		success: boolean;
		error?: string;
	}>
	{
		const columnNames = Object.keys(data);

		const {
			success: allColumnsValid,
			error,
			matches
		} = await this.validateColumns(tableName, columnNames);

		if(error)
		{
			return {
				success: false,
				error
			};
		}

		const { validCols, invalidCols } = Object.entries(
			matches || {}
		).reduce((agg, [col, exists]) =>
		{
			(exists ? agg.validCols : agg.invalidCols).push(col);

			return agg;
		}, {
			validCols: [],
			invalidCols: []
		} as {
			validCols: string[];
			invalidCols: string[];
		});

		if(!validCols.includes('id'))
		{
			return {
				success: false,
				error: `No id in table ${tableName}`
			};
		}

		if(!allColumnsValid)
		{
			return {
				success: false,
				error: `Invalid columns: ${invalidCols.join(',')}`
			};
		}

		return { success: true };
	}

	public async update(opts: {
		itemId: string;
		itemType: string;
		path?: string | undefined;
		data: IItemType;
		setUpdated?: boolean;
	})
	{
		await this.getDb();

		const { itemType, itemId, path, data } = opts;
		const tableName = itemType.toLowerCase();

		const { success, error } = await this.validateDataObject(
			tableName,
			data as Record<string, unknown>
		);

		if(!success)
		{
			throw new Error(error);
		}

		const fields: string[] = [];
		const values: string[] = [];
		const params: unknown[] = [];

		fields.push('id');
		values.push('?');
		params.push(itemId);

		Object.entries(data as Record<string, unknown>).forEach(([field, value]) =>
		{
			if(
				Array.isArray(value) ||
				isPopulatedObject(value)
			)
			{
				const valueString = JSON.stringify(value);

				if(this.validateValue(valueString))
				{
					fields.push(field);
					values.push('?');
					params.push(valueString);
				}
			}

			if(this.validateValue(value))
			{
				fields.push(field);
				values.push('?');
				params.push(value);
			}
		});

		const sql = `REPLACE INTO \`${tableName
			}\` (${fields.join(',')
			}) VALUES (${values.join(',')
			})`;

		await this.query(sql, params);
	}

	public async updateMultiple(opts: {
		itemType: string;
		items: Record<string, IItemType>;
	})
	{
		for await(const [key, value] of Object.entries(opts.items))
		{
			await this.update({
				itemId: key as string,
				itemType: opts.itemType,
				data: value as IItemType
			});
		}
	}

	public async insert(opts: {
		itemId: string;
		itemType: string;
		data: IItemType;
	}): Promise<void>
	{
		return this.update(opts);
	}

	public async insertMultiple(opts: {
		itemType: string;
		items: Record<string, IItemType>;
	}): Promise<void>
	{
		return this.updateMultiple(opts);
	}

	public async select(opts: {
		itemType: string;
		itemId: string;
		filters?: DbFilters;
	}): Promise<IItemType | undefined>
	{
		const { results } = await this.selectMultiple({
			...opts,
			filters: opts.itemType ? [
				...(opts.filters || []),
				{
					key: 'typeId',
					operator: DbFilterOperator.isEqual,
					value: opts.itemType
				}
			] : opts.filters,
			pagination: {
				page: 1,
				pageSize: 1
			}
		});

		return results?.[0] as IItemType | undefined;
	}

	public async selectMultiple(opts: {
		itemType: string;
		itemIds?: string[] | undefined;
		filters?: DbFilters;
		pagination?: DbPaginationOpts;
		idField?: string;
	}): Promise<PaginatedItemResponse<IItemType>>
	{
		const { itemIds, itemType } = opts;
		const tableName = itemType.toLowerCase();
		let { filters } = opts;

		if(!filters)
		{
			filters = [];
		}

		if(!filters.some((f) => (
			(f && ('key' in f)) &&
			(f.key === 'typeId') &&
			(f.value === opts.itemType)
		)))
		{
			filters.push({
				key: 'typeId',
				operator: DbFilterOperator.isEqual,
				value: opts.itemType,
			});
		}

		await this.getDb();

		// TODO: Implement filters (copy from GenericItemSqlDatabase)

		if(!this.validateValue(tableName))
		{
			throw new Error('Table name invalid');
		}

		const results = await this.query(
			`SELECT * FROM ?? ${itemIds?.length ? `WHERE id IN (${itemIds.map((id) => '?').join(',')
				})` : ''}`,
			[tableName, ...(itemIds || [])]
		);

		if(Array.isArray(results) && results.length)
		{
			return {
				results: results as IItemType[],
				hasMore: false,
				totalItems: results.length,
				pagination: opts.pagination || {},
			};
		}

		return {
			results: [],
			hasMore: false,
			totalItems: 0,
			pagination: opts.pagination || {},
		};
	}

	public async remove(opts: {
		itemType: string;
		itemId: string;
	}): Promise<void>
	{
		//
	}

	public async removeMultiple(opts: {
		itemType: string;
		itemIds: Array<string>;
	}): Promise<void>
	{
		//
	}
}
