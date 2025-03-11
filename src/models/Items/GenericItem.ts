import { DbFilterOperator } from '../Database/DbFilters';
import { KnownItemType, Nullable, UUID } from '../../types/generic';
import { GenericDatabase } from '../Database/GenericDatabase';
import { FirebaseRTDB } from '../firebase/RealtimeDatabase';
import { getCurrentSecond, isPopulatedObject, removeUndefined } from '../../utils/tools';
import { isUuid } from '../../utils/generic';

export const dbName = 'notes';

export const ItemType = {
	'Item': 'Item',
	'Todo': 'Todo',
	'Ticket': 'Ticket',
	'Field': 'Field',
} as const;
export type ItemType = typeof ItemType[keyof typeof ItemType];

export type Item = {
	id: string;
	typeId: string;
	createdBy?: string;
	updatedAt?: number;
	createdAt?: number;
};

export type OnDirtyFieldFn = (
	itemId: string,
	itemType: string,
	name: string,
	value: unknown
) => void;

/** Replicated here to avoid circular imports as Archetype extends Item */
type ArchetypeData = Item & {
	id: Nullable<string>;
	name: Nullable<string>;
	itemType: Nullable<string>;
	attachedFields: Nullable<Array<string>>;
};

export type ItemOpts<IItemType = Item> = {
	db: GenericDatabase;
	id: string;
	typeId?: string;
	initialData?: Partial<IItemType>;
	definitionId?: UUID;
	definition?: ArchetypeData;
	onDirtyField?: OnDirtyFieldFn | undefined;
};

/**
 * Item paradigm:
 * The ItemHandler class provides the basic needs for getting/setting Item data.
 * 
 * You should create classes that extend it, for each of your item types.
 * 
 * Your custom item properties should be instance variables, each with a setter.
 * 
 * Your setters should control validation of each property, or any internal data
 * transformation.
 * 
 * You should only expose properties of any item through `getData()` (except id,
 * which is always public).
 * 
 * You should get/set the item as a unit via `load()`/`save()`, after any needed
 * internal data transformation.
 * 
 * For any async follow-up actions for a change (e.g. updating related items),
 * you should call a method that updates those things based on the current data.
 */
export class ItemHandler<IItemType extends Item = Item> implements Item
{
	// ## Item variables
	public id: IItemType['id'];
	public typeId: string = 'Item';

	// ## Class variables
	protected db: ItemOpts['db'];
	protected isLoaded = false;
	protected data: Partial<IItemType> = {};
	protected onDirtyField: OnDirtyFieldFn | undefined;
	protected definition: Nullable<ArchetypeData>;
	protected definitionId: Nullable<UUID>;

	/**
	 * Log of properties which have been mutated. Intended to facilitate saving a
	 * partial update, if desired.
	 */
	public dirtyFields: Record<string, boolean> = {};

	public static async getInstance<
		IItemTypeB extends Item = Item,
		IHandlerType extends ItemHandler<IItemTypeB> = ItemHandler<IItemTypeB>
	>(
		opts: ItemOpts
	): Promise<IHandlerType>
	{
		if(!((opts.db instanceof FirebaseRTDB) || (opts.db instanceof GenericDatabase)))
		{
			throw new Error(`Database unavailable for item "${opts.id}"`);
		}

		const instance = new ItemHandler<IItemTypeB>(opts);

		await instance.init();

		return instance as IHandlerType;
	}

	constructor(opts: ItemOpts)
	{
		if(!(
			opts.db
			// (opts.db instanceof SqlDatabase) ||
			// (opts.db instanceof GenericItemSqlDatabase) ||
			// (opts.db instanceof FirebaseRTDB) ||
			// (opts.db instanceof GenericDatabase)
		))
		{
			throw new Error(`Database unavailable or unspecified for item "${opts.id}"`);
		}

		this.id = opts.id;
		this.db = opts.db;

		this.data = this.getBaseData() as IItemType;

		if(typeof opts.onDirtyField === 'function')
		{
			this.setOnDirtyField(opts.onDirtyField);
		}

		if(isPopulatedObject(opts.initialData))
		{
			this.setData(opts.initialData as Partial<IItemType>);
		}

		if(opts.typeId)
		{
			this.typeId = opts.typeId;
		}

		if(opts.definition || opts.definitionId)
		{
			this.setDefinition({
				definition: opts.definition,
				definitionId: opts.definitionId
			});
		}
	}

	protected setDefinition(opts: {
		definitionId?: UUID;
		definition?: ArchetypeData;
		overwriteExisting?: boolean;
	})
	{
		if(this.definitionId && !opts.overwriteExisting)
		{
			return;
		}

		if(opts.definitionId)
		{
			if(isUuid(opts.definitionId))
			{
				this.definitionId = opts.definitionId;
			}
			else if(opts.definitionId === null)
			{
				this.definitionId = null;
			}
			else
			{
				throw new Error(`Invalid definition value for item ${this.id}`);
			}
		}
		else if(opts.definition)
		{
			this.definition = opts.definition;
		}
	}

	public async loadRelatedItems(opts: {
		itemType: string;
		itemIds: Array<UUID>;
	}): Promise<Record<string, unknown>[]>
	{
		if(
			!opts ||
			!(Array.isArray(opts.itemIds) && opts.itemIds.every(isUuid)) ||
			!(this.db instanceof GenericDatabase) ||
			!(opts.itemType in ItemType)
		)
		{
			return [];
		}

		const { results } = (await this.db.selectMultiple({
			itemType: opts.itemType,
			filters: [
				{
					key: 'itemId',
					operator: DbFilterOperator.in,
					value: opts.itemIds
				}
			]
		})) || {};

		return results || [];
	}

	protected async loadDefinition(): Promise<ArchetypeData | undefined>
	{
		if(isPopulatedObject(this.definition))
		{
			return;
		}

		if(!isUuid(this.definitionId))
		{
			return;
		}

		const definitionData = await this.db.select({
			itemType: KnownItemType.Archetype,
			itemId: this.definitionId,
		});

		if(!definitionData)
		{
			return undefined;
		}

		this.definition = definitionData as ArchetypeData;

		return this.definition;
	}

	protected setIfValid<T>(opts: {
		key: string;
		value: T;
		validator: (value: T) => boolean;
		stringsCannotBeNumbers?: boolean;
	}): void
	{
		const { key, stringsCannotBeNumbers } = opts;
		let { value } = opts;

		if(
			!stringsCannotBeNumbers &&
			typeof value === 'string' &&
			`${parseInt(value, 10)}` === value
		)
		{
			value = parseInt(value, 10);
		}

		if(value === null)
		{
			(this.data as Record<string, unknown>)[key] = null;
			this.markDirty(key);
		}
		/**
		 * Surprise! Hidden caveat! This will fail as if it's a race condition if
		 * you use an imported regex for validation. Make sure to use a regex copied
		 * to the location you need it (yes, as awful as that is to maintain) unless
		 * you are really sure it won't fail validation here!
		 */
		else if(opts.validator(value))
		{
			(this.data as Record<string, unknown>)[key] = value;
			this.markDirty(key);
		}
		else if(typeof value !== 'undefined')
		{
			console.log('FAILED:', {
				key,
				value,
				type: typeof value,
			});
		}
	}

	public get updatedAt(): number
	{
		if(!this.data.updatedAt)
		{
			return Date.now();
		}

		return this.data.updatedAt;
	}

	public set updatedAt(value: number | null)
	{
		if(value === null)
		{
			this.data.updatedAt = undefined;
		}
		else
		{
			if(!Number.isInteger(value))
			{
				throw new Error(`updatedAt must be a number, got "${value}"`);
			}

			if(`${value}`.length === 13)
			{
				value = Math.floor(value / 1000);
			}

			this.data.updatedAt = value;
		}

		// disabled due to spam - any update updates this value
		// this.markDirty('updatedAt');
	}

	public get createdAt(): number | undefined
	{
		if(!this.data.createdAt)
		{
			if(!this.isLoaded)
			{
				// we don't know it yet; don't presume it doesn't exist
				return undefined;
			}

			return Math.floor(Date.now() / 1000);
		}

		return this.data.createdAt;
	}

	public set createdAt(value: number | null)
	{
		if(Number.isInteger(this.data.createdAt))
		{
			throw new Error(`Attempted to override createdAt for item ${this.id}`);
		}

		if(value === null)
		{
			this.data.createdAt = undefined;
		}
		else
		{
			if(!Number.isInteger(value))
			{
				throw new Error(`createdAt must be a number, got "${value}"`);
			}

			if(`${value}`.length === 13)
			{
				value = Math.floor(value / 1000);
			}

			this.data.createdAt = value;
		}

		this.markDirty('createdAt');
	}

	public get createdBy(): string | undefined
	{
		return this.data.createdBy;
	}

	public set createdBy(value: string | null)
	{
		if(Number.isInteger(this.data.createdBy))
		{
			throw new Error(`Attempted to override createdBy for item ${this.id}`);
		}

		if(value === null)
		{
			this.data.createdBy = undefined;
		}
		else
		{
			if(!isUuid(value))
			{
				throw new Error(`createdBy must be a UUID, got "${value}"`);
			}

			this.data.createdBy = value;
		}

		this.markDirty('createdBy');
	}

	public async load({
		force = false
	} = {}): Promise<IItemType | undefined>
	{
		if(this.isLoaded && !force)
		{
			return undefined;
		}

		const item = await this.db.select<IItemType>({
			itemType: this.typeId,
			itemId: this.id as UUID
		});

		if(!isPopulatedObject(item))
		{
			console.log(`Failed to retrieve item ${this.id} (${this.typeId})`);

			return undefined;
		}

		this.setData(item as Partial<IItemType>);
		this.isLoaded = true;

		return this.getData();
	}

	public async save(): Promise<void>
	{
		await this.update({ data: this.getData() });
	}

	/** To be overridden by descendants */
	public async init(): Promise<void>
	{
		await this.load();
	}

	public async update(opts: {
		data: Partial<IItemType>;
		doNotSetData?: boolean;
	}): Promise<void>
	{
		if(!isPopulatedObject(opts.data))
		{
			console.warn(`Tried to update item (id: "${this.id}") with empty data`);

			return;
		}

		const data = { ...opts.data };

		if(!data.updatedAt)
		{
			data.updatedAt = getCurrentSecond();
		}

		if(!data.createdAt)
		{
			data.createdAt = getCurrentSecond();
		}

		if(!opts.doNotSetData)
		{
			this.setData(data);
		}

		try
		{
			await this.db.update<IItemType>({
				itemType: this.typeId,
				itemId: this.id,
				data: data as IItemType
			});
		}
		catch(e)
		{
			console.warn(`Failed to update item (id: "${this.id}") with error: ${(e as Error).message
				}`);
		}
	}

	protected getBaseData()
	{
		return {
			id: this.id,
			typeId: this.typeId,
			updatedAt: this.updatedAt,
			createdAt: this.createdAt,
			createdBy: this.createdBy,
		};
	}

	public getItemTypeDbReference(typeId: string, db = dbName)
	{
		return { dbName: db, tableName: 'items' };
	}

	public setData(
		item: Partial<IItemType>,
		opts?: {
			overwriteExisting?: boolean;
		}
	): void
	{
		// TODO: zod validation
		if(!isPopulatedObject(item))
		{
			return;
		}

		const baseData = this.getBaseData();

		this.typeId = item.typeId || baseData.typeId;

		this.data = {
			// existing data
			...(!opts?.overwriteExisting && { ...this.data }),
			// new data
			...item,
			// necessary data
			...baseData,
			typeId: this.typeId
		};
	}

	public getData(): IItemType
	{
		return {
			...this.data,
			...removeUndefined(this.getBaseData()),
			id: this.id,
			typeId: this.typeId,
			updatedAt: this.updatedAt,
			createdAt: this.createdAt,
			createdBy: this.createdBy,
		} as IItemType;
	}

	public setOnDirtyField(fn: OnDirtyFieldFn | undefined): void
	{
		this.onDirtyField = fn;
	}

	public markDirty(name: string): void
	{
		this.dirtyFields[name] = true;

		if(typeof this.onDirtyField === 'function')
		{
			this.onDirtyField(
				this.id,
				this.typeId,
				name,
				(this.data as Record<string, unknown>)[name]
			);
		}
	}

	public markClean(name: string): void
	{
		if(name in this.dirtyFields)
		{
			delete this.dirtyFields[name];
		}
	}

	public async destroy(): Promise<void>
	{
		await this.db.remove({
			itemType: this.typeId,
			itemId: this.id
		});
	}
}
