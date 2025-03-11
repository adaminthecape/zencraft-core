import { DbFilterHandler, DbFilterOperator, DbFilters } from './DbFilters';
import { DbPaginationOpts, PaginatedItemResponse, PaginationHandler } from './Pagination';
import { Item } from '../Items/GenericItem';
import { GenericDatabase, GenericDatabaseOpts } from './GenericDatabase';
import { toNumber } from '../../utils/generic';
import { isUuid } from '../../utils/uuid';

export type RamDatabaseOpts = GenericDatabaseOpts;
export class RamDatabase<
	IItemIdType extends (string | number) = string,
	IItemType = Item
> extends GenericDatabase<IItemIdType, IItemType>
{
	public cache: Record<string, IItemType> = {};

	constructor(opts: RamDatabaseOpts)
	{
		super(opts);
	}

	public validateItemTypeAndId(opts: {
		itemId: string;
		itemType: string;
	}): boolean
	{
		return (isUuid(opts.itemId) && typeof opts.itemType === 'string');
	}

	public getCacheKey(opts: {
		itemId: string;
		itemType: string;
	}): string
	{
		return `${opts.itemType}:${opts.itemId}`;
	}

	public async update(opts: {
		itemId: string;
		itemType: string;
		path?: string | undefined;
		data: IItemType;
		setUpdated?: boolean;
	})
	{
		if(!this.validateItemTypeAndId(opts)) return;

		const item = await this.select(opts);

		if(item)
		{
			Object.assign(item, opts.data);
		}
		else
		{
			await this.insert(opts);
		}
	}

	public async updateMultiple(opts: {
		items: Record<string, IItemType>;
		itemType: string;
	})
	{
		for await(const itemId of Object.keys(opts.items))
		{
			const item = opts.items[itemId];
			const itemOpts = {
				itemId,
				itemType: opts.itemType,
				data: item
			};

			if(this.validateItemTypeAndId(itemOpts))
			{
				await this.update(itemOpts);
			}
		}
	}

	public async insert(opts: {
		itemId: string;
		itemType: string;
		data: IItemType;
	}): Promise<void>
	{
		if(!this.validateItemTypeAndId(opts)) return;

		this.cache[this.getCacheKey(opts)] = {
			...opts.data,
			id: opts.itemId,
			typeId: opts.itemType,
		};
	}

	public async insertMultiple(opts: {
		itemType: string;
		items: Record<string, IItemType>;
	}): Promise<void>
	{
		for(const itemId in opts.items)
		{
			const item = opts.items[itemId];
			const itemOpts = {
				itemId,
				itemType: opts.itemType,
				data: item
			};

			await this.insert(itemOpts);
		}
	}

	/** @deprecated */
	public async select1r(opts: {
		itemId: string;
		itemType: string;
	}): Promise<IItemType | undefined>
	{
		return this.select(opts);
	}

	public async select(opts: {
		itemId: string;
		itemType: string;
		filters?: DbFilters;
	}): Promise<IItemType | undefined>
	{
		if(!this.validateItemTypeAndId(opts)) return;

		if(!opts.filters)
		{
			return this.cache[this.getCacheKey(opts)];
		}

		return (await this.selectMultiple({
			itemType: opts.itemType,
			itemIds: [opts.itemId],
			filters: opts.filters
		}))?.results?.[0];
	}

	public async selectMultiple(opts: {
		itemType: string;
		itemIds?: string[] | undefined;
		filters?: DbFilters;
		pagination?: DbPaginationOpts;
	}): Promise<PaginatedItemResponse<IItemType>>
	{
		const { itemType, itemIds, filters, pagination } = opts;

		const fh = new DbFilterHandler({ filters });

		fh.updateFilter({
			key: 'typeId',
			operator: DbFilterOperator.isEqual,
			value: itemType,
		});

		if(Array.isArray(itemIds))
		{
			fh.updateFilter({
				key: 'itemId',
				operator: DbFilterOperator.in,
				value: itemIds,
			});
		}

		const filteredData = Object.values(this.cache).filter((
			obj: any
		) => DbFilterHandler.traverseFilters(fh.filters, obj));

		const ph = new PaginationHandler({
			initialValue: pagination,
		});

		ph.setTotal((filteredData || []).length);

		if(pagination)
		{
			const { page, pageSize } = ph.pagination;
			const pageNum = toNumber(page);
			const pageSizeNum = toNumber(pageSize);

			if(pageNum && pageSizeNum)
			{
				const results = (filteredData || [])
					.slice((pageNum - 1) * pageSizeNum, pageNum * pageSizeNum);

				return {
					results: results as Array<IItemType>,
					hasMore: results.length > (pageNum * pageSizeNum),
					totalItems: ph.pagination.totalRows ?? 0,
					pagination: {
						page: ph.pagination.page,
						pageSize: ph.pagination.pageSize,
						totalRows: ph.pagination.totalRows,
						sortBy: ph.pagination.sortBy,
						sortOrder: ph.pagination.sortOrder,
					}
				};
			}
		}

		return {
			results: (filteredData || []) as Array<IItemType>,
			hasMore: false,
			totalItems: ph.pagination.totalRows ?? 0,
			pagination: {
				page: ph.pagination.page,
				pageSize: ph.pagination.pageSize,
				totalRows: ph.pagination.totalRows,
				sortBy: ph.pagination.sortBy,
				sortOrder: ph.pagination.sortOrder,
			}
		};
	}

	public async remove(opts: {
		itemId: string;
		itemType: string;
	}): Promise<void>
	{
		if(!this.validateItemTypeAndId(opts)) return;

		if(this.cache[this.getCacheKey(opts)])
		{
			delete this.cache[this.getCacheKey(opts)];
		}
	}

	public async removeMultiple(opts: {
		itemIds: Array<string>;
		itemType: string;
	}): Promise<void>
	{
		for(const itemId of opts.itemIds)
		{
			this.remove({
				itemId,
				itemType: opts.itemType
			});
		}
	}
}
