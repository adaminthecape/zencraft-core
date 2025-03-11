import { KnownItemType, Nullable } from '../../types/generic';
import { PermissionActionType, PermissionMapRow, PermissionType, PermissionStatus } from './UserPermissions';
import { DbFilters, DbFilterOperator } from '../Database/DbFilters';
import { GenericDatabase } from '../Database/GenericDatabase';
import { DbPaginationOpts, PaginationHandler, PaginatedItemResponse } from '../Database/Pagination';
import { ItemOpts, Item, ItemHandler } from '../Items/GenericItem';
import { isPopulatedObject } from '../../utils/tools';
import { isUuid } from '../../utils/uuid';

export type AccessRoleItemOpts = ItemOpts;

export type AdminDefinedPermission = {
	permissionType: PermissionMapRow['permissionType'];
	status: PermissionMapRow['status'];
	scope: PermissionMapRow['scope'];
};

export function validatePermissionName(name: string): name is PermissionType
{
	if(typeof name !== 'string')
	{
		return false;
	}

	const parts = name.split('.');

	const [itemType, actionType, scope] = parts;

	if(
		// first value must be a valid item type
		// not able to validate this against the db here so just check if string
		(itemType && (typeof itemType === 'string')) &&
		// second value must be a valid action type
		(
			typeof actionType === 'string' &&
			PermissionActionType[actionType as keyof typeof PermissionActionType]
		) &&
		// third value must be undefined or a valid UUID
		((typeof scope === 'undefined') || isUuid(scope) || (scope === 'all'))
	)
	{
		return true;
	}

	return false;
}

export function validateAdminDefinedPermission(
	perm: unknown
): perm is AdminDefinedPermission
{
	if(
		isPopulatedObject(perm) &&
		('status' in perm) &&
		('permissionType' in perm) &&
		perm.permissionType &&
		validatePermissionName(perm.permissionType as PermissionType) &&
		Object.values(PermissionStatus).includes(parseInt(`${perm.status}`, 10))
	)
	{
		return true;
	}

	return false;
}

export type AccessRoleItem = Item & {
	title: Nullable<string>;
	definedPermissions: Nullable<AdminDefinedPermission[]>;
};

// @ts-expect-error getInstance() return type is unexpected but not incorrect
export class AccessRoleHandler
	extends ItemHandler<AccessRoleItem>
	implements AccessRoleItem 
{
	public typeId: string = KnownItemType.AccessRole;

	public static async getInstance(opts: AccessRoleItemOpts): Promise<AccessRoleHandler>
	{
		const instance = new AccessRoleHandler(opts);

		await instance.load();

		return instance;
	}

	public static async getAllAccessRoles(opts: {
		db: GenericDatabase;
		filters?: DbFilters;
		pagination?: DbPaginationOpts;
	}): Promise<Array<AccessRoleItem>>
	{
		const paginationHandler = new PaginationHandler({
			initialValue: opts.pagination
		});

		paginationHandler.setPageSize(50);

		const response: PaginatedItemResponse<AccessRoleItem> = {
			results: [],
			totalItems: 0,
			hasMore: false,
			pagination: paginationHandler.pagination
		};

		if(!opts.filters)
		{
			opts.filters = [];
		}

		opts.filters.push({
			key: 'typeId',
			operator: DbFilterOperator.isEqual,
			value: KnownItemType.AccessRole,
		});

		await PaginationHandler.forEachPage({
			db: opts.db,
			filters: opts.filters,
			itemType: KnownItemType.AccessRole,
			ph: paginationHandler,
			withResult: async (result) =>
			{
				if(Array.isArray(result.results))
				{
					response.results.push(...result.results as AccessRoleItem[]);
				}
			}
		});

		return response.results;
	}

	constructor(opts: AccessRoleItemOpts)
	{
		super(opts);
	}

	get title(): Nullable<string>
	{
		return this.data.title;
	}

	set title(value: unknown)
	{
		this.setIfValid({
			key: 'title',
			value,
			validator: (val) => ((typeof val === 'string') && val.length <= 200)
		});
	}

	get definedPermissions(): Nullable<AdminDefinedPermission[]>
	{
		if(isPopulatedObject(this.data.definedPermissions))
		{
			// This could be validated again here, but is validated on the way in
			return Object.values(this.data.definedPermissions) as AdminDefinedPermission[];
		}

		return this.data.definedPermissions;
	}

	set definedPermissions(value: unknown)
	{
		if(isPopulatedObject(value) && Object.keys(value).every((key) => (
			`${parseInt(`${key}`, 10)}` === `${key}`
		)))
		{
			value = [...Object.values(value)];
		}

		this.setIfValid({
			key: 'definedPermissions',
			value,
			validator: (val) => (
				Array.isArray(val) &&
				val.every(validateAdminDefinedPermission)
			)
		});
	}

	public getData(): AccessRoleItem
	{
		return {
			...super.getData(),
			typeId: KnownItemType.AccessRole,
			title: this.title,
			definedPermissions: this.definedPermissions,
		};
	}

	public setData(data: Partial<AccessRoleItem>): void
	{
		if(!isPopulatedObject(data))
		{
			return;
		}

		try
		{
			super.setData({});

			this.typeId = KnownItemType.AccessRole;
			this.title = data.title;
			this.definedPermissions = data.definedPermissions;
		}
		catch(e)
		{
			console.error(e, data);
		}
	}
}
