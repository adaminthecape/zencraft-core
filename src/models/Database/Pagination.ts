import { GenericDatabase } from "./GenericDatabase";
import { DbFilters } from "./DbFilters";
import { toNumber } from "../../utils/generic";

export type DbPaginationOpts = {
	page?: number;
	pageSize?: number;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
	totalRows?: number;
};

export type PaginatedItemResponse<T = Record<string, unknown>> = {
	// returns a list of items
	results: Array<T>;
	// as well as the initial pagination data that generated the list
	pagination: DbPaginationOpts;
	// and the total amount found
	totalItems: number;
	// and whether there are more to obtain
	hasMore: boolean;
};

export function getLimitAndOffset(pagination: DbPaginationOpts | undefined): ({
	limit: number | undefined;
	offset: number | undefined;
})
{
	let limit, offset;

	if(pagination?.pageSize && toNumber(pagination.pageSize))
	{
		limit = pagination.pageSize;

		if(pagination?.page && toNumber(pagination.page))
		{
			offset = (pagination.page - 1) * pagination.pageSize;
		}
	}

	return { limit, offset };
}

export type QPagination = {
	sortBy?: string | null;
	descending?: boolean;
	page?: number;
	rowsPerPage?: number;
	rowsNumber?: number;
};

export type PaginationHandlerOpts = {
	initialValue?: DbPaginationOpts;
};

export class PaginationHandler
{
	public pagination: DbPaginationOpts;

	public static getDefaultPagination(): DbPaginationOpts
	{
		return {
			page: 1,
			pageSize: 10,
			sortBy: undefined,
			sortOrder: undefined,
			totalRows: 20
		};
	}

	public static convertPaginationFromQuasar(
		quasarPagination: QPagination
	): DbPaginationOpts
	{
		return {
			page: parseInt(`${quasarPagination?.page ?? 1}`, 10),
			pageSize: parseInt(`${quasarPagination?.rowsPerPage ?? 10}`, 10),
			totalRows: parseInt(`${quasarPagination?.rowsNumber ?? 20}`, 10),
			sortBy: quasarPagination?.sortBy ?? undefined,
			sortOrder: quasarPagination?.descending ? 'desc' : 'asc'
		};
	}

	public static convertPaginationToQuasar(
		internalPagination: DbPaginationOpts
	): QPagination
	{
		return {
			page: parseInt(`${internalPagination?.page ?? 1}`, 10),
			rowsPerPage: parseInt(`${internalPagination?.pageSize ?? 10}`, 10),
			rowsNumber: parseInt(`${internalPagination.totalRows ?? 20}`, 10),
			sortBy: internalPagination?.sortBy ?? undefined,
			descending: internalPagination?.sortOrder === 'desc' ? true : undefined
		};
	}

	public static async forEachPage<IItemType = Record<string, unknown>>(opts: {
		db: GenericDatabase;
		ph: PaginationHandler;
		itemType: string;
		filters?: DbFilters;
		maxPages?: number;
		withResult: (result: PaginatedItemResponse<IItemType>) => Promise<void>;
	}): Promise<void>
	{
		const res = await opts.db.selectMultiple({
			itemType: opts.itemType,
			filters: opts.filters,
			pagination: opts.ph.pagination
		}) as PaginatedItemResponse<IItemType>;

		await opts.withResult(res);

		opts.ph.setTotal(res.totalItems);

		if(
			res.hasMore &&
			!opts.ph.isDone &&
			(!opts.maxPages || (opts.maxPages >= (opts.ph.pagination.page ?? 1)))
		)
		{
			opts.ph.incrementPage();

			await this.forEachPage(opts);
		}
	}

	constructor(opts: PaginationHandlerOpts)
	{
		if(opts.initialValue)
		{
			this.pagination = opts.initialValue;
		}
		else
		{
			this.pagination = PaginationHandler.getDefaultPagination();
		}
	}

	public incrementPage()
	{
		if(!this.isDone)
		{
			this.pagination.page = (this.pagination.page ?? 0) + 1;
		}
	}

	public get totalPages(): number
	{
		if(!(
			this.pagination.pageSize &&
			this.pagination.totalRows
		))
		{
			return 0;
		}

		return Math.ceil(this.pagination.totalRows / this.pagination.pageSize);
	}

	public get isDone(): boolean
	{
		if(!(
			this.pagination.page &&
			this.pagination.pageSize &&
			this.pagination.totalRows
		))
		{
			return false;
		}

		return ((this.pagination.page ?? 0) >= this.totalPages);
	}

	public setTotal(value: number): void
	{
		this.pagination.totalRows = value;
	}

	public setPage(value: number): void
	{
		if(value <= this.totalPages)
		{
			this.pagination.page = value;
		}
	}

	public setPageSize(value: number): void
	{
		this.pagination.pageSize = value;
	}

	public setSort(value: string): void
	{
		this.pagination.sortBy = value;
	}

	public setSortDirection(value: DbPaginationOpts['sortOrder']): void
	{
		this.pagination.sortOrder = value;
	}

	public getQuasarPagination()
	{
		return PaginationHandler.convertPaginationToQuasar(this.pagination);
	}
}
