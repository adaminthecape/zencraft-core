import { ItemType, KnownItemType, Nullable, UUID } from '../../types/generic';
import { ItemDefinitionItemOpts, ItemDefinitionItem, ItemDefinitionHandler } from './ItemDefinition';
import { isPopulatedObject, isUuid, retrieveItemIds } from '../../utils/generic';

export type BlockDefinitionItemOpts = ItemDefinitionItemOpts & {};

export type BlockDefinitionItem = ItemDefinitionItem & {
  name?: Nullable<string>;
  blockType: Nullable<string>;
  allowedChildBlockTypes?: Nullable<Array<UUID>>;
};

export class BlockDefinitionHandler
  extends ItemDefinitionHandler<BlockDefinitionItem>
  implements BlockDefinitionItem
{
  public typeId: ItemType = KnownItemType.BlockDefinition;

  public static async getInstance(opts: BlockDefinitionItemOpts): Promise<BlockDefinitionHandler>
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
      throw new Error(`Field IDs not found for BlockDefinition ${opts.id}`);
    }

    const fieldsArray = await BlockDefinitionHandler.loadFields({
      db: opts.db,
      fieldIds
    });

    if(!(Array.isArray(fieldsArray) && fieldsArray.length))
    {
      throw new Error(`Fields not found for BlockDefinition ${opts.id}`);
    }

    const instance = new BlockDefinitionHandler({ ...opts, fieldsArray });

		await instance.load();

		return instance;
  }

	constructor(opts: BlockDefinitionItemOpts)
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

	public getData(): BlockDefinitionItem
  {
    // for each field, get its value from data if it exists
		const data = {
      ...super.getData(),
      typeId: KnownItemType.BlockDefinition,
      blockType: this.blockType,
      allowedChildBlockTypes: this.allowedChildBlockTypes,
    };

    return data;
	}

  public setData(data: Partial<BlockDefinitionItem>): void
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

      this.typeId = KnownItemType.BlockDefinition;
      this.blockType = data.blockType;
      this.allowedChildBlockTypes = data.allowedChildBlockTypes;
		}
		catch(e)
		{
			console.error(e, data);
		}
	}
}
