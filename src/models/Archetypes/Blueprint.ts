import { KnownItemType, Nullable, UUID } from '../../types/generic';
import { ArchetypeItemOpts, ArchetypeItem, ArchetypeHandler } from './Archetype';
import { isUuid, retrieveItemIds } from '../../utils/generic';
import { isPopulatedObject } from '../../utils/tools';

export type BlueprintItemOpts = ArchetypeItemOpts;

export type BlueprintItem = ArchetypeItem & {
	name?: Nullable<string>;
	blockType: Nullable<string>;
	allowedChildBlockTypes?: Nullable<Array<UUID>>;
};

export class BlueprintHandler
	extends ArchetypeHandler<BlueprintItem>
	implements BlueprintItem
{
	public typeId: string = KnownItemType.Blueprint;

	public static async getInstance(opts: BlueprintItemOpts): Promise<BlueprintHandler>
	{
		let fieldIds;

		if(Array.isArray(opts.fieldsArray))
		{
			fieldIds = retrieveItemIds(opts.fieldsArray);
		}
		else if(isPopulatedObject(opts.fieldsMap))
		{
			fieldIds = retrieveItemIds(Object.values(opts.fieldsMap));
		}
		else if(
			Array.isArray(opts.fieldIds) &&
			opts.fieldIds.length &&
			opts.fieldIds.every(isUuid)
		)
		{
			fieldIds = opts.fieldIds;
		}

		if(!fieldIds)
		{
			throw new Error(`Field IDs not found for Blueprint ${opts.id}`);
		}

		const fieldsArray = await BlueprintHandler.loadFields({
			db: opts.db,
			fieldIds
		});

		if(!(Array.isArray(fieldsArray) && fieldsArray.length))
		{
			throw new Error(`Fields not found for Blueprint ${opts.id}`);
		}

		const instance = new BlueprintHandler({ ...opts, fieldsArray });

		await instance.load();

		return instance;
	}

	constructor(opts: BlueprintItemOpts)
	{
		super(opts);
	}

	get blockType(): Nullable<string>
	{
		return this.data.blockType;
	}

	set blockType(value: unknown)
	{
		this.setIfValid({
			key: 'blockType',
			value,
			validator: (val) => (typeof val === 'string')
		});
	}

	get allowedChildBlockTypes(): Nullable<Array<UUID>>
	{
		return this.data.allowedChildBlockTypes;
	}

	set allowedChildBlockTypes(value: unknown)
	{
		this.setIfValid({
			key: 'allowedChildBlockTypes',
			value,
			validator: (val) => (Array.isArray(val) && val.every(isUuid))
		});
	}

	public getData(): BlueprintItem
	{
		// for each field, get its value from data if it exists
		const data = {
			...super.getData(),
			typeId: KnownItemType.Blueprint,
			blockType: this.blockType,
			allowedChildBlockTypes: this.allowedChildBlockTypes,
		};

		return data;
	}

	public setData(data: Partial<BlueprintItem>): void
	{
		if(!isPopulatedObject(data))
		{
			return;
		}

		try
		{
			super.setData({
				name: data.name,
				attachedFields: data.attachedFields,
				scopeId: data.scopeId
			});

			this.typeId = KnownItemType.Blueprint;
			this.blockType = data.blockType;
			this.allowedChildBlockTypes = data.allowedChildBlockTypes;
		}
		catch(e)
		{
			console.error(e, data);
		}
	}
}
