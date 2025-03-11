import { getCurrentSecond, isPopulatedObject } from '../../utils/tools';
import { SqlColumnDefinition, SqlDatabase, SqlDatabaseOpts } from './SqlDatabase';
import { DbPaginationOpts, getLimitAndOffset, PaginatedItemResponse } from './Pagination';
import { DbFilter, DbFilterGroup, DbFilterGroupType, DbFilterOperator, DbFilters, isGroupFilter } from './DbFilters';
import { Item } from '../Items/GenericItem';

export const GenericItemSqlFilterOperators = {
	string: [
		DbFilterOperator.isEqual,
		DbFilterOperator.isNotEqual,
	],
	number: [
		DbFilterOperator.isEqual,
		DbFilterOperator.isNotEqual,
		DbFilterOperator.greaterThan,
		DbFilterOperator.greaterThanOrEqualTo,
		DbFilterOperator.lessThan,
		DbFilterOperator.lessThanOrEqualTo,
	]
};

export type GenericItemSqlFilter<T = unknown> = {
	key: string;
	operator: DbFilterOperator;
	value: T;
};

export type GenericItemSqlFilters = {
	itemId?: GenericItemSqlFilter<string>;
	createdBy?: GenericItemSqlFilter<number>;
	createdAt?: GenericItemSqlFilter<number>;
	updatedAt?: GenericItemSqlFilter<number>;
	properties?: GenericItemSqlFilter[];
};

export class GenericItemSqlDatabase<
	IItemIdType extends (string | number) = string,
	IItemType = Item
> extends SqlDatabase<IItemIdType, IItemType>
{
	public static async getInstance(opts: SqlDatabaseOpts): Promise<GenericItemSqlDatabase>
	{
		const instance = new GenericItemSqlDatabase(opts);

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

	protected async getDb(): Promise<any | undefined>
	{
		await this.connect();
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
		const pattern = new RegExp(/^[A-Za-z0-9À-ȕ .=&"',\-\[\]\{\}]*$/, 'gi');

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
		return { success: true };
	}

	public getJsonData(dataObj: Record<string, unknown>)
	{
		const dataToSave = { ...dataObj };

		// remove properties stored in their own columns
		delete dataToSave.id;
		delete dataToSave.itemId;
		delete dataToSave.typeId;
		delete dataToSave.createdBy;
		delete dataToSave.createdAt;
		delete dataToSave.updatedAt;

		return dataToSave;
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

		const { itemId, itemType, data } = opts;

		const { success, error } = await this.validateDataObject(
			itemType,
			data as Record<string, unknown>
		);

		if(!success)
		{
			throw new Error(error);
		}

		const existingItem = await this.select({
			itemId,
			itemType
		});

		if(!existingItem)
		{
			const fields = [
				'itemId',
				'typeId',
				'jsonData',
				'createdBy',
				'createdAt',
				'updatedAt'
			];

			const dataToSave = this.getJsonData(data as Record<string, unknown>);

			await this.query(
				`INSERT INTO \`itemsPublished\` (${fields.join(',')}) VALUES (${fields.map((f) => '?')})`,
				[
					itemId,
					itemType,
					JSON.stringify(dataToSave),
					(data as Record<string, unknown>).createdBy || 'unknown',
					getCurrentSecond(),
					getCurrentSecond()
				]
			);

			return;
		}

		try
		{
			await this.archive({ itemId });
		}
		catch(e)
		{
			console.error(e);
		}

		const dataToSave = this.getJsonData(data as Record<string, unknown>);

		console.log('dataToSave:', dataToSave);

		const params: unknown[] = [];
		const fields: string[] = [];
		const wheres: string[] = [];

		fields.push(`jsonData = JSON_MERGE_PATCH(\`jsonData\`, ?)`);
		params.push(JSON.stringify(dataToSave));

		fields.push('updatedAt = ?');
		params.push(getCurrentSecond());

		wheres.push('itemId = ?');
		params.push(itemId);

		// const check = async () =>
		// {
		// 	await this.connect();

		// 	const checkParams = [];
		// 	const checkFields = [];

		// 	checkFields.push('JSON_MERGE_PATCH(\`jsonData\`, ?) AS newData');
		// 	checkParams.push(JSON.stringify(dataToSave));

		// 	checkFields.push('jsonData');

		// 	checkParams.push(itemId);

		// 	return this.query1r(
		// 		`SELECT ${checkFields.join(', ')} FROM \`itemsPublished\` WHERE itemId = ?`,
		// 		checkParams
		// 	);
		// };

		const query = `UPDATE \`itemsPublished\` SET ${fields.join(', ')} WHERE ${wheres.join(', ')}`;

		await this.query(query, params);
	}

	public async updateMultiple(opts: {
		itemType: string;
		items: Record<string, IItemType>;
	})
	{
		for await(const [key, value] of Object.entries(opts.items))
		{
			await this.update({
				itemType: opts.itemType,
				itemId: key,
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
		itemId: string;
		itemType: string;
		filters?: DbFilters;
	}): Promise<IItemType | undefined>
	{
		if(opts.itemType == 'Item')
		{
			console.log('select Item:', opts);
			console.trace();
		}

		const { results } = await this.selectMultiple({
			itemType: opts.itemType,
			itemIds: opts.itemId ? [opts.itemId] : undefined,
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
		fieldsToReturn?: string[] | undefined;
	}): Promise<PaginatedItemResponse<IItemType>>
	{
		const { itemIds, itemType } = opts;
		let { filters } = opts;
		const pagination = opts.pagination || {};
		const idField = opts.idField || 'itemId';

		const response: PaginatedItemResponse<IItemType> = {
			results: [] as Array<IItemType>,
			hasMore: false,
			totalItems: 0,
			pagination
		};

		await this.getDb();

		// tableName is pre-determined in this class
		// if(!this.validateValue(tableName))
		// {
		// 	throw new Error('Table name invalid');
		// }

		if(!this.validateValue(idField))
		{
			throw new Error('ID field invalid');
		}

		const queryWheres: string[] = [];
		const queryParams: unknown[] = [];

		if(Array.isArray(itemIds) && itemIds.length)
		{
			queryWheres.push(`${idField} IN (${itemIds.map((id) => '?').join(',')})`);
			queryParams.push(...itemIds);
		}

		if(!filters)
		{
			filters = [];
		}

		if(!filters.some((f) => (
			(f && ('key' in f)) &&
			(f.key === 'typeId') &&
			(f.value === itemType)
		)))
		{
			filters.push({
				key: 'typeId',
				operator: DbFilterOperator.isEqual,
				value: itemType,
			});
		}

		(Array.isArray(filters) ? filters : []).forEach((filter) =>
		{
			if(isGroupFilter(filter))
			{
				const { wheres, params } = this.parseGroupFilter(filter);

				queryWheres.push(wheres);
				queryParams.push(...params);

				return;
			}

			const { where, param } = this.parseFilter(
				filter,
				this.isJsonColumn(filter.key)
			);

			if(where)
			{
				queryWheres.push(where);

				if(typeof param !== 'undefined')
				{
					queryParams.push(param);
				}
			}
		});

		let fieldsToReturn = '*';

		if(Array.isArray(opts.fieldsToReturn))
		{
			if(!opts.fieldsToReturn.every(this.validateValue))
			{
				throw new Error('Invalid fields');
			}

			fieldsToReturn = opts.fieldsToReturn
				.map((f) => `\`${f}\``).join(', ');
		}

		const { limit, offset } = getLimitAndOffset(pagination);

		let orderBy;

		if(pagination?.sortBy)
		{
			if([
				'itemId',
				'revisionId',
				'typeId',
				'createdAt',
				'updatedAt'
			].includes(pagination.sortBy))
			{
				orderBy = pagination.sortBy;
			}
			else
			{
				// TODO: validate field exists in Item type via schema validator
				if(this.validateValue(pagination.sortBy))
				{
					orderBy = `JSON_EXTRACT(jsonData, "$.${pagination.sortBy}")`;
				}
			}
		}

		let sortOrder;

		if(pagination?.sortOrder)
		{
			if(['ASC', 'DESC'].includes(pagination.sortOrder.toUpperCase()))
			{
				sortOrder = pagination.sortOrder.toUpperCase();
			}
		}

		if(!orderBy)
		{
			orderBy = 'revisionId';
		}

		if(!sortOrder)
		{
			sortOrder = 'DESC';
		}

		const getQuery = (fieldsToUse: string) => (`SELECT ${fieldsToUse
			} FROM ?? ${queryWheres.length ?
				`WHERE ${queryWheres.map((v) => `(${v})`).join(' AND ')}` :
				''
			}${orderBy ? ` ORDER BY ${orderBy} ${sortOrder}` : ''
			}`);

		// get the count first
		if(limit)
		{
			const totalItems = await this.query1(
				getQuery('COUNT(itemId)'),
				['itemsPublished', ...queryParams],
			) as number | undefined;

			if(totalItems && Number.isInteger(totalItems))
			{
				response.totalItems = totalItems;
				pagination.totalRows = totalItems;

				if(limit && ((offset ?? 0) < (totalItems ?? 0)))
				{
					response.hasMore = true;
				}
			}
		}

		await this.query(
			`${getQuery(fieldsToReturn)}${limit ? ` LIMIT ${limit}` : ''
			}${(limit && offset) ? ` OFFSET ${offset}` : ''
			}`,
			['itemsPublished', ...queryParams],
			(data) =>
			{
				if(Array.isArray(data) && Array.isArray(data[0]))
				{
					response.results = (data as IItemType[][])[0];
				}
			}
		);

		response.results = response.results.map((row) =>
		{
			if(!isPopulatedObject(row))
			{
				return undefined;
			}

			if(row?.[idField])
			{
				let itemData = {
					id: row[idField],
					typeId: row.typeId,
					createdBy: row.createdBy,
					createdAt: row.createdAt,
					updatedAt: row.updatedAt
				};

				if(row.jsonData && typeof row.jsonData === 'string')
				{
					try
					{
						const jsonData = JSON.parse(row.jsonData);

						if(isPopulatedObject(jsonData))
						{
							itemData = {
								...jsonData,
								...itemData // itemData takes precedence
							};
						}
					}
					catch
					{
						//
					}
				}

				return itemData;
			}
		}).filter((entry) => entry) as Array<IItemType>;

		return response;
	}

	public parseFilter(filter: DbFilter, isJsonColumn?: boolean): ({
		where: string | undefined;
		param: unknown;
	})
	{
		// handle potential injection vulnerabilities
		if(!(
			this.validateValue(filter.key) &&
			(
				Array.isArray(filter.value) ?
					filter.value.every(this.validateValue) :
					this.validateValue(filter.value)
			) &&
			typeof filter.operator === 'string' &&
			Object.values(DbFilterOperator).includes(filter.operator)
		))
		{
			console.log(
				'Filter failed validation:', filter,
				this.validateValue(filter.key),
				this.validateValue(filter.value),
				typeof filter.operator === 'string',
				Object.values(DbFilterOperator).includes(filter.operator),
				filter.value
			);

			return {
				where: undefined,
				param: undefined
			};
		}

		let key = filter.key;
		let param = filter.value;

		if(isJsonColumn)
		{
			key = `JSON_EXTRACT(jsonData, "$.${key}")`;
		}

		let where;

		if(filter.operator === DbFilterOperator.isEqual)
		{
			if(filter.value === null)
			{
				where = `${key} IS ?`;
			}
			else
			{
				where = `${key} = ?`;
			}
		}
		else if(filter.operator === DbFilterOperator.isNotEqual)
		{
			if(filter.value === null)
			{
				where = `${key} IS NOT ?`;
			}
			else
			{
				where = `${key} <> ?`;
			}
		}
		else if([
			DbFilterOperator.in,
			DbFilterOperator.arrayContains,
			DbFilterOperator.arrayContainsAny,
		].includes(filter.operator))
		{
			where = `${key} IN (?)`;
		}
		else if(filter.operator === DbFilterOperator.notIn)
		{
			where = `NOT(${key} IN (?))`;
		}
		else if(filter.operator === DbFilterOperator.fuzzyEqual)
		{
			where = `LOWER(${key}) LIKE LOWER(?)`;
			param = `%${filter.value}%`;
		}
		else
		{
			where = `${key} ${filter.operator} ?`;
		}

		return { where, param };
	}

	public isJsonColumn(col: string): boolean
	{
		return !col ? false : ![
			'revisionId',
			'itemId',
			'typeId',
			'jsonData',
			'createdBy',
			'createdAt',
			'updatedAt',
		].includes(col);
	}

	public parseGroupFilter(filter: DbFilterGroup): ({
		wheres: string;
		params: unknown[];
	})
	{
		const results: {
			wheres: string[];
			params: unknown[];
		} = {
			wheres: [],
			params: []
		};

		if(![
			DbFilterGroupType.and,
			DbFilterGroupType.or
		].includes(filter.group))
		{
			return {
				wheres: '',
				params: []
			};
		}

		filter.children.forEach((subFilter) =>
		{
			const { where, param } = this.parseFilter(
				subFilter,
				this.isJsonColumn(subFilter.key)
			);

			if(where)
			{
				results.wheres.push(where);
			}

			if(typeof param !== 'undefined')
			{
				results.params.push(param);
			}
		});

		return {
			wheres: (
				results.wheres
					.map((v) => `(${v})`)
					.join(` ${filter.group.toUpperCase()} `)
			),
			params: results.params
		};
	}

	public async archive(opts: {
		itemId: string;
	}): Promise<void>
	{
		try
		{
			await this.query(
				`INSERT INTO itemsArchived (SELECT * FROM itemsPublished WHERE itemId = ?)`,
				[opts.itemId]
			);

			const fields = [
				'revisionId = ((SELECT MAX(revisionId) FROM itemsPublished) + 1)'
			];

			// after successful archival, update revisionId in itemsPublished
			await this.query(
				`UPDATE itemsPublished SET ${fields} WHERE itemId = ? LIMIT 1`.replace(/\t\n/g, ' '),
				[opts.itemId]
			);
		}
		catch(e)
		{
			console.error(e);
		}
	}

	public async remove(opts: {
		itemType: string;
		itemId: string;
	}): Promise<void>
	{
		const { itemId } = opts;

		try
		{
			await this.archive({ itemId });
		}
		catch(e)
		{
			console.error(e);
		}

		await this.query(
			`DELETE FROM itemsPublished WHERE itemId = ?`,
			[opts.itemId]
		);
	}

	public async removeMultiple(opts: {
		itemType: string;
		itemIds: string[];
	}): Promise<void>
	{
		if(!Array.isArray(opts.itemIds))
		{
			return;
		}

		for await(const itemId of opts.itemIds)
		{
			await this.remove({
				itemType: opts.itemType,
				itemId
			});
		}
	}
}
