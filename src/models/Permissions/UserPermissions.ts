import { ItemType, UUID } from '../../types/generic';
import { SqlDatabase } from '../Database/SqlDatabase';
import { ItemHandler, ItemOpts } from '../Items/GenericItem';

function getCurrentSecond(): number
{
	return parseInt(`${Date.now()}`.slice(0, 10), 10);
}

export enum SpecialPermissionType
{
	PERMISSIONS_READ = 'permissions.read',
	PERMISSIONS_CREATE = 'permissions.create',
	PERMISSIONS_SUSPEND = 'permissions.suspend',
	PERMISSIONS_VERIFY = 'permissions.verify',
}

export enum PermissionStatus
{
	SUSPENDED = 1,
	ACTIVE = 2,
	BANNED = 3,
	WITHDRAWN = 4,
	UNVERIFIED = 5,
}

export enum PermissionActionType
{
	create = 'create',
	read = 'read',
	update = 'update',
	delete = 'delete',
	accessList = 'accessList',
};
export type ItemPermissionName = (
	/** Pertains to all Items in scope */
	`${ItemType}.${PermissionActionType}.all` |
	/** Pertains to this particular Item in scope */
	`${ItemType}.${PermissionActionType}.${UUID}` |
	/** Pertains to a particular field of an Item in scope */
	`${ItemType}.${PermissionActionType}.${UUID}.$${string}`
);
export type PermissionName = (
	`${UUID}.${PermissionActionType}`
);
export type PermissionType = ItemPermissionName | PermissionName | SpecialPermissionType;

export interface PermissionMapRow
{
	/** Table row id */
	id?: number;
	/** The user to whom this permission applies */
	userId: string;
	/** The door this unlocks */
	permissionType: PermissionType;
	/** Group to which this permission applies */
	scope: UUID | undefined;
	/** Timestamp (in millis) when this permission was assigned */
	createdAt: number;
	/** The user who assigned this permission */
	createdBy: UUID;
	/** The user who approved this permission */
	approvedBy?: UUID;
	/** Whether the permission is active, suspended, or awaiting approval */
	status?: PermissionStatus;
}

export const cSelfManageablePermissions: Array<PermissionType> = [
	SpecialPermissionType.PERMISSIONS_READ,
	SpecialPermissionType.PERMISSIONS_SUSPEND,
];

// Each permissionsMap row is like a hotel room key card.
// - Multiple people can have a card for the same room.
// - Any card can be scoped to a given floor.
// - A user may have multiple cards for multiple floors.
// - A user may have a global pass, but admins cannot configure this.

export const migrationSql = `CREATE TABLE IF NOT EXISTS \`permissionsMap\` (
	\`id\` INT(15) NOT NULL AUTO_INCREMENT,
	\`userId\` VARCHAR(36) NOT NULL,
	\`permissionType\` VARCHAR(100) NOT NULL,
	\`scope\` VARCHAR(36) NULL,
	\`createdAt\` INT(15) NOT NULL,
	\`updatedAt\` INT(15) NOT NULL,
	\`createdBy\` VARCHAR(36) NOT NULL,
	\`approvedBy\` VARCHAR(36) NULL,
	\`status\` TINYINT NOT NULL,
	PRIMARY KEY (\`id\`)
)`;

export type UserPermissionsOpts = {
	/** Currently must use a SQL database for queries */
	db: SqlDatabase;
	/** ID of the user making the request */
	currentUserId: UUID;
	/** ID of the user being queried */
	targetUserId: UUID;
};

export class UserPermissions
{
	// public static async getInstance(
	// 	req: IReq,
	// 	userId: UUID
	// ): Promise<UserPermissions> {
	// 	const instance = new UserPermissions(req, userId);

	// 	await instance.loadAllPermissions();

	// 	return instance;
	// }

	public static async getPermissionsList(
		db: SqlDatabase,
		filters: {
			scope?: UUID | Array<UUID>;
			userId?: UUID | Array<UUID>;
			status?: PermissionStatus[];
			permissionTypes?: PermissionType[];
			pagination?: {
				page?: number;
				limit?: number;
				offset?: number;
			};
		}
	): Promise<{
		permissions: (PermissionMapRow & { username: string; })[];
		total: number;
		limit: number;
		page: number;
	}>
	{
		if(!filters) filters = {};
		// if (!filters.status) filters.status = LoginStatus.Active;
		if(!filters.pagination) filters.pagination = {};
		if(!filters.pagination.page) filters.pagination.page = 1;
		if(!filters.pagination.limit) filters.pagination.limit = 10;
		if(!filters.pagination.offset)
		{
			filters.pagination.offset = (
				(filters.pagination.page - 1) * filters.pagination.limit
			);
		}

		const wheres: string[] = [];
		const params: any[] = [];

		if(Array.isArray(filters.scope))
		{
			wheres.push('p.scope IN (?)');
			params.push(filters.scope);
		}
		else if(typeof filters.scope === 'string')
		{
			wheres.push('p.scope = ?');
			params.push(filters.scope);
		}

		if(Array.isArray(filters.userId))
		{
			wheres.push('p.userId IN (?)');
			params.push(filters.userId);
		}
		else if(typeof filters.userId === 'string')
		{
			wheres.push('p.userId = ?');
			params.push(filters.userId);
		}

		if(Array.isArray(filters.permissionTypes))
		{
			wheres.push('p.permissionType IN (?)');
			params.push(filters.permissionTypes);
		}

		if(filters.status?.length)
		{
			wheres.push('p.`status` IN (?)');
			params.push(filters.status);
		}

		params.push(
			typeof filters.pagination.limit === 'number'
				? filters.pagination.limit
				: parseInt(filters.pagination.limit, 10)
		);
		params.push(
			typeof filters.pagination.offset === 'number'
				? filters.pagination.offset
				: parseInt(filters.pagination.offset, 10)
		);

		if(!wheres.length)
		{
			wheres.push('p.userId IS NOT NULL');
		}

		let total = 0;

		try
		{
			const countData = await db.query1r(
				`SELECT COUNT(p.userId) AS count FROM permissionsMap p WHERE ${wheres.join(
					' AND '
				)}`,
				params
			);

			total = countData?.count || 0;
		}
		catch(e)
		{
			console.error('Could not get count for permissions', e);
		}

		const permissions = await db.query(
			`SELECT 
				p.userId,
				p.permissionType,
				p.scope,
				p.createdAt,
				p.updatedAt,
				p.createdBy,
				p.status,
				l.username
            FROM permissionsMap p
			JOIN logins l ON l.userId = p.userId
			WHERE ${wheres.join(' AND ')}
			LIMIT ? OFFSET ?`,
			params
		);

		return {
			permissions,
			total,
			limit: filters.pagination.limit,
			page: filters.pagination.page,
		};
	}

	protected db: SqlDatabase;
	protected currentUserId: UUID;
	protected targetUserId: UUID;
	// protected permissions: PermissionMapRow[];

	constructor(opts: UserPermissionsOpts)
	{
		this.db = opts.db;
		this.currentUserId = opts.currentUserId;
		this.targetUserId = opts.targetUserId;
	}

	// protected async loadAllPermissions(): Promise<void> {
	// 	const db = await ReqUtil.getSqlDb(this.req);
	// 	this.permissions = await db.select(
	// 		'SELECT * FROM permissionsMap WHERE userId = ?',
	// 		[this.userId]
	// 	);
	// }

	/**
	 * Fetch all permissions for this user, with optional additional filters.
	 * This deliberately does NOT return disabled permissions.
	 * @param scope
	 */
	public async getUsersActivePermissions(
		opts?: Partial<PermissionMapRow>
	): Promise<void>
	{
		// TODO: Guard against users phishing for others' permissions
		const wheres = [];
		const params = [];

		// userId first
		wheres.push('userId = ?');
		params.push(this.targetUserId);

		if(opts?.scope)
		{
			wheres.push('scope = ?');
			params.push(opts.scope);
		}

		if(opts?.permissionType)
		{
			wheres.push('permissionType = ?');
			params.push(opts.permissionType);
		}

		if(opts?.createdBy)
		{
			wheres.push('createdBy = ?');
			params.push(opts.createdBy);
		}

		// ensure only active permissions
		wheres.push('status = ?');
		params.push(PermissionStatus.ACTIVE);

		return this.db.query(
			`SELECT * FROM permissionsMap WHERE (${wheres.join(' AND ')})`,
			params
		);
	}

	// assign a permission to a user
	protected async insertPermission(rowData: PermissionMapRow): Promise<void>
	{
		if(!rowData.userId || !rowData.permissionType || !rowData.createdBy)
		{
			throw new Error('Bad permission row data');
		}

		await this.db.query(
			`INSERT INTO permissionsMap (
				permissionType, userId, scope, createdAt, createdBy, status
			) VALUES (?, ?, ?, ?, ?, ?)`,
			[
				rowData.permissionType,
				rowData.userId,
				rowData.scope,
				getCurrentSecond(),
				rowData.createdBy,
				rowData.status ?? PermissionStatus.UNVERIFIED,
			]
		);
	}

	/**
	 * Assign a given permission to a given user.
	 * @param permissionType
	 * @param userId
	 */
	public async assignPermission(
		permissionType: PermissionType,
		userId: UUID,
		scope?: UUID,
		andLog?: boolean
	): Promise<void>
	{
		/** Unscoped permissions can only be manually added */
		if(!scope)
		{
			throw new Error('Not allowed!');
		}

		// Does this permission already exist?
		const existingPermission = await this.getPermission(
			permissionType,
			scope,
			[
				PermissionStatus.ACTIVE,
				PermissionStatus.SUSPENDED,
				PermissionStatus.UNVERIFIED,
			]
		);

		if(existingPermission)
		{
			return;
		}

		await this.insertPermission({
			permissionType,
			userId,
			scope,
			createdAt: getCurrentSecond(),
			createdBy: this.currentUserId,
			status: PermissionStatus.UNVERIFIED,
		});

		if(andLog)
		{
			console.log(
				`Permission ${permissionType} assigned to ${userId} for ${scope}`
			);
		}
	}

	/**
	 * UNSAFE - only do this when assigning basic initial permissions
	 * Assign a given permission to a given user.
	 * @param permissionType
	 * @param userId
	 */
	public async assignPermissionUnsafe(
		permissionType: PermissionType,
		userId: UUID,
		scope?: UUID,
		status?: PermissionStatus
	): Promise<void>
	{
		if(!userId || !permissionType)
		{
			throw new Error('CANNOT GRANT');
		}

		// Does this permission already exist?
		const existingPermission = await this.getPermission(
			permissionType,
			scope,
			[
				PermissionStatus.ACTIVE,
				PermissionStatus.SUSPENDED,
				PermissionStatus.UNVERIFIED,
			]
		);

		if(existingPermission)
		{
			return;
		}

		await this.insertPermission({
			permissionType,
			userId,
			scope,
			createdAt: getCurrentSecond(),
			createdBy: this.currentUserId,
			status: status || PermissionStatus.UNVERIFIED,
		});

		console.log(
			`(UNSAFE) Permission ${permissionType} assigned to ${userId} for ${scope}`
		);
	}

	/**
	 * Permissions can be disabled, but nothing else about them can be changed.
	 * This is to preserve a record of permission assignments and allow logic
	 * based on whether a user has had the permission before.
	 * @param permissionType
	 * @param userId
	 * @param scope
	 */
	public async verifyPermission(
		permissionType: PermissionType,
		userId: UUID,
		scope?: UUID
	): Promise<void>
	{
		/** Unscoped permissions can only be manually added */
		if(!scope)
		{
			throw new Error('Not allowed!');
		}

		const fields: string[] = [];
		const wheres: string[] = [];
		const params: any[] = [];

		fields.push('status = ?');
		params.push(PermissionStatus.ACTIVE);

		fields.push('updatedAt = ?');
		params.push(getCurrentSecond());

		fields.push('approvedBy = ?');
		params.push(this.currentUserId);

		wheres.push('permissionType = ?');
		params.push(permissionType);

		wheres.push('userId = ?');
		params.push(userId);

		if(scope)
		{
			wheres.push('scope = ?');
			params.push(scope);
		}
		else
		{
			wheres.push('scope IS NULL');
		}

		await this.db.query(
			`UPDATE permissionsMap SET ${
				fields.join(', ')
			} WHERE (${
				wheres.join(' AND ')
			}) LIMIT 1`,
			params
		);
	}

	public async verifyPermissionUnsafe(
		permissionType: PermissionType,
		userId: UUID,
		scope?: UUID
	): Promise<void>
	{
		const fields: string[] = [];
		const wheres: string[] = [];
		const params: any[] = [];

		fields.push('status = ?');
		params.push(PermissionStatus.ACTIVE);

		fields.push('updatedAt = ?');
		params.push(getCurrentSecond());

		fields.push('approvedBy = ?');
		params.push(this.currentUserId);

		wheres.push('permissionType = ?');
		params.push(permissionType);

		wheres.push('userId = ?');
		params.push(userId);

		if(scope)
		{
			wheres.push('scope = ?');
			params.push(scope);
		}
		else
		{
			wheres.push('scope IS NULL');
		}

		await this.db.query(
			`UPDATE permissionsMap SET ${
				fields.join(', ')
			} WHERE (${
				wheres.join(' AND ')
			}) LIMIT 1`,
			params
		);
	}

	/**
	 * Permissions can be disabled, but nothing else about them can be changed.
	 * This is to preserve a record of permission assignments and allow logic
	 * based on whether a user has had the permission before.
	 * @param permissionType
	 * @param userId
	 * @param scope
	 */
	public async suspendPermission(
		permissionType: PermissionType,
		userId: UUID,
		scope?: UUID
	): Promise<void>
	{
		/** Unscoped permissions can only be manually added */
		if(!scope)
		{
			// throw new Error('Not allowed!');
		}

		await this.db.query(
			`UPDATE permissionsMap SET \`status\` = ?, updatedAt = ? WHERE (
				permissionType = ? AND userId = ? AND \`scope\` = ?
			)`,
			[
				PermissionStatus.SUSPENDED,
				getCurrentSecond(),
				permissionType,
				userId,
				scope,
			]
		);
	}

	/**
	 * Check if a user has a permission for the given scope.
	 * @param data
	 * @returns
	 */
	public async getPermission(
		permissionType: PermissionType,
		scope?: UUID,
		states?: PermissionStatus[],
		forceNullScope?: boolean
	): Promise<PermissionMapRow | undefined>
	{
		if(!(this.targetUserId && permissionType))
		{
			throw new Error(
				`Not enough data to retrieve permission: ${JSON.stringify({
					permissionType,
					scope,
				})}`
			);
		}

		const wheres: string[] = [];
		const params: any[] = [];

		wheres.push('userId = ?');
		params.push(this.targetUserId);

		wheres.push('permissionType = ?');
		params.push(permissionType);

		if(scope)
		{
			wheres.push('scope = ?');
			params.push(scope);
		}
		else
		{
			wheres.push('scope IS NULL');
		}

		wheres.push('status IN (?)');
		params.push(!states?.length ? [PermissionStatus.ACTIVE] : states);

		return this.db.query1r(
			`SELECT * FROM permissionsMap WHERE (${wheres.join(' AND ')})`,
			params
		);
	}

	public async validate(
		permissionType: PermissionType,
		scope?: UUID
	): Promise<boolean>
	{
		if(
			scope &&
			this.targetUserId &&
			this.currentUserId &&
			(this.targetUserId === this.currentUserId) &&
			(this.targetUserId === scope) &&
			permissionType &&
			cSelfManageablePermissions.includes(permissionType)
		)
		{
			console.log(`User ${
				this.targetUserId
			} managing OWN permission ${permissionType} on ${scope}`);

			// users can do some things to themselves
			return true;
		}

		const usersPermission = await this.getPermission(
			permissionType,
			scope,
			[PermissionStatus.ACTIVE]
		);

		if(
			!usersPermission
			// !usersPermission ||
			// !(
			// 	usersPermission?.userId === this.userId &&
			// 	usersPermission?.permissionType === permissionType &&
			// 	usersPermission?.status === PermissionStatus.ACTIVE &&
			// 	((!scope && !usersPermission?.scope) ||
			// 		usersPermission?.scope === scope)
			// )
		)
		{
			// is this a super admin for this permission?
			const superAdminPermission = await this.getPermission(
				permissionType,
				undefined
			);

			if(superAdminPermission)
			{
				console.log(`${
					this.targetUserId
				} is super admin for ${permissionType}`);

				return true;
			}

			throw new Error(`Not allowed! ${
				this.targetUserId
			} for ${permissionType} on ${scope}`);
		}

		return true;
	}

	public async validateMultiple(
		permissionTypes: PermissionType[],
		scope?: UUID
	): Promise<any>
	{
		const resultMap: Partial<Record<PermissionType, boolean>> = {};

		for await(const permissionType of permissionTypes)
		{
			try
			{
				if(await this.validate(permissionType, scope))
				{
					resultMap[permissionType] = true;
				}
			}
			catch(e)
			{
				resultMap[permissionType] = false;
			}
		}

		return {
			results: resultMap,
			success: Object.values(resultMap).every(
				(result) => result === true
			),
		};
	}
}

/**
 * Validate a given user's permission in a given scope (or unscoped).
 * Can only return `true` if validated, otherwise it will error.
 * @param req
 * @param userId
 * @param permissionType
 * @param scope
 * @returns
 */
export async function validatePermission(
	db: SqlDatabase,
	currentUserId: UUID,
	targetUserId: UUID,
	permissionType: PermissionType,
	scope?: UUID
): Promise<boolean>
{
	return (new UserPermissions({
		db,
		currentUserId,
		targetUserId,
	})).validate(permissionType, scope);
}
