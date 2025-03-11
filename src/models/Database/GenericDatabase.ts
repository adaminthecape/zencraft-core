import { DbFilters } from './DbFilters';
import { DbPaginationOpts, PaginatedItemResponse } from './Pagination';
import { Item } from '../Items/GenericItem';

export type GenericDatabaseOpts = {
	isDebugMode?: boolean;
};
export class GenericDatabase<
	IItemIdType extends (string | number) = string,
	IItemType = Item
>
{
	protected isDebugMode?: boolean;

	constructor(opts: GenericDatabaseOpts)
	{
		this.isDebugMode = !!opts.isDebugMode;
	}

	protected async getDb(): Promise<unknown | undefined>
	{
		return undefined;
	}

	/** @deprecated */
	public async watch(opts: {
		rootPath: string;
		withResult: (result: unknown) => void;
	})
	{
		//
	}

	public async update<T = Record<string, unknown>>(opts: {
		itemId: string;
		itemType: string;
		path?: string | undefined;
		data: IItemType;
		setUpdated?: boolean;
	})
	{
		//
	}

	public async updateMultiple(opts: {
		items: Record<string, IItemType>;
		itemType: string;
	})
	{
		//
	}

	public async insert(opts: {
		itemId: string;
		itemType: string;
		data: IItemType;
	}): Promise<void>
	{
		//
	}

	public async insertMultiple(opts: {
		itemType: string;
		items: Record<string, IItemType>;
	}): Promise<void>
	{
		//
	}

	/** @deprecated */
	public async select1r(opts: {
		itemId: string;
		itemType: string;
	}): Promise<IItemType | undefined>
	{
		return {} as IItemType;
	}

	public async select<T = Record<string, unknown>>(opts: {
		itemId: string;
		itemType: string;
		filters?: DbFilters;
	}): Promise<IItemType | undefined>
	{
		return {} as IItemType;
	}

	public async selectMultiple<T = Record<string, unknown>>(opts: {
		itemType: string;
		itemIds?: string[] | undefined;
		filters?: DbFilters;
		pagination?: DbPaginationOpts;
	}): Promise<PaginatedItemResponse<IItemType>>
	{
		return {
			results: [] as Array<IItemType>,
			hasMore: false,
			totalItems: 0,
			pagination: {
				page: 1,
				pageSize: 0
			}
		};
	}

	public async remove(opts: {
		itemId: string;
		itemType: string;
	}): Promise<void>
	{
		//
	}

	public async removeMultiple(opts: {
		itemIds: Array<string>;
		itemType: string;
	}): Promise<void>
	{
		//
	}
}
