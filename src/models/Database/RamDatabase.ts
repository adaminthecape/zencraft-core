import { DbFilterHandler, DbFilterOperator, DbFilters } from './DbFilters';
import { DbPaginationOpts, PaginatedItemResponse, PaginationHandler } from './Pagination';
import { Item } from '../Items/GenericItem';
import { GenericDatabase, GenericDatabaseOpts } from './GenericDatabase';

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
		this.isDebugMode = !!opts.isDebugMode;
		this.cache = {};
	}

	public getCacheKey(opts: {
		itemId: string;
		itemType: string;
	}): string
	{
		return `${opts.itemType}:${opts.itemId}`;
	}

	public getCachedItem(opts: {
		itemId: string;
		itemType: string;
	}): IItemType | undefined
	{
		return this.cache[this.getCacheKey(opts)];
	}

	protected async getDb(): Promise<any | undefined>
	{
		return this.cache;
	}

	public async update(opts: {
		itemId: string;
		itemType: string;
		path?: string | undefined;
		data: IItemType;
		setUpdated?: boolean;
	})
	{
		const item = this.getCachedItem(opts);

		if(item)
		{
			Object.assign(item, opts.data);
		}
		else
		{
			this.cache[this.getCacheKey(opts)] = {
				...opts.data,
				id: opts.itemId,
				typeId: opts.itemType,
			};
		}
	}

	public async updateMultiple(opts: {
		items: Record<string, IItemType>;
		itemType: string;
	})
	{
		for(const itemId in opts.items)
		{
			const item = opts.items[itemId];

			this.update({
				itemId,
				itemType: opts.itemType,
				data: item
			});
		}
	}

	public async insert(opts: {
		itemId: string;
		itemType: string;
		data: IItemType;
	}): Promise<void>
	{
		this.update(opts);
	}

	public async insertMultiple(opts: {
		itemType: string;
		items: Record<string, IItemType>;
	}): Promise<void>
	{
		this.updateMultiple(opts);
	}

	/** @deprecated */
	public async select1r(opts: {
		itemId: string;
		itemType: string;
	}): Promise<IItemType | undefined>
	{
		return this.getCachedItem(opts);
	}

	public async select(opts: {
		itemId: string;
		itemType: string;
		filters?: DbFilters;
	}): Promise<IItemType | undefined>
	{
		if(!opts.filters)
		{
			return this.getCachedItem(opts);
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

		const filterHandler = new DbFilterHandler({ filters });

		filterHandler.updateFilter({
			key: 'typeId',
			operator: DbFilterOperator.isEqual,
			value: itemType,
		});

		const traverseFilters = DbFilterHandler.traverseFilters;

		if(Array.isArray(itemIds))
		{
			filterHandler.updateFilter({
				key: 'itemId',
				operator: DbFilterOperator.in,
				value: itemIds,
			});
		}

		// console.log('filters:', filterHandler.filters);

		const filtered = Object.values(this.cache).filter((
			obj: any
		) => traverseFilters(filterHandler.filters, obj));

		const ph = new PaginationHandler({
			initialValue: pagination,
		});

		ph.setTotal((filtered || []).length);

		if(pagination)
		{
			const { page, pageSize } = ph.pagination;

			if(typeof page === 'number' && typeof pageSize === 'number')
			{
				const results = (filtered || [])
					.slice((page - 1) * pageSize, page * pageSize) as Array<IItemType>;

				return {
					results,
					hasMore: results.length > (page * pageSize),
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
			results: (filtered || []) as Array<IItemType>,
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
