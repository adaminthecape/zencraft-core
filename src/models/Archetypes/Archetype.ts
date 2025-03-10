import { KnownItemType, Nullable, UUID } from '../../types/generic';
import { FieldData } from '../Items/Field';
import { ItemOpts, Item, ItemType, ItemHandler } from '../Items/GenericItem';
import { GenericDatabase } from '../Database/GenericDatabase';
import { DbFilterOperator } from '../Database/DbFilters';
import { retrieveItemIds, isUuid, reduceIntoAssociativeArray } from '../../utils/generic';
import { isPopulatedObject } from '../../utils/tools';

export type ArchetypeItemOpts = ItemOpts & {
	fieldsArray?: FieldData[];
  fieldsMap?: Record<string, FieldData>;
  fieldIds?: UUID[];
};

export type ArchetypeItem = Item & {
  name: Nullable<string>;
  itemType: Nullable<string>;
  attachedFields: Nullable<UUID[]>;
  scopeId: Nullable<UUID>;
};

// @ts-expect-error
export class ArchetypeHandler<DefinitionType extends ArchetypeItem = ArchetypeItem>
  extends ItemHandler<DefinitionType>
	implements ArchetypeItem
{
  public typeId: any = KnownItemType.Archetype;
  protected fieldsMap?: Record<FieldData['id'], FieldData>;

  public static async getInstance(opts: ArchetypeItemOpts): Promise<ArchetypeHandler>
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

		const instance = new ArchetypeHandler(opts);

		await instance.load();

    if(fieldIds)
    {
      instance.setFields({
        fieldsArray: await ArchetypeHandler.loadFields({
          db: opts.db,
          fieldIds
        })
      });
    }

		return instance;
  }

  public static async loadFields(opts: {
    db: GenericDatabase;
    fieldIds: Array<UUID>;
  }): Promise<FieldData[]>
  {
    if(
      !opts ||
      !(Array.isArray(opts.fieldIds) && opts.fieldIds.every(isUuid)) ||
      !(opts.db instanceof GenericDatabase)
    )
    {
      return [];
    }

    const { results } = (await opts.db.selectMultiple({
      itemType: ItemType.Field,
      filters: [
        {
          key: 'typeId',
          operator: DbFilterOperator.isEqual,
          value: ItemType.Field
        },
        {
          key: 'itemId',
          operator: DbFilterOperator.in,
          value: opts.fieldIds
        }
      ]
    })) || {};

    return (results || []) as FieldData[];
  }

	constructor(opts: ArchetypeItemOpts)
  {
    super(opts);

    this.setFields(opts);
  }

  public setFields(opts: Omit<ArchetypeItemOpts, keyof ItemOpts>)
  {
    if(Array.isArray(opts.fieldsArray))
    {
      this.attachedFields = opts.fieldsArray.map((f) => f.id);
      this.fieldsMap = reduceIntoAssociativeArray(opts.fieldsArray, 'key');
    }
    else if(isPopulatedObject(opts.fieldsMap))
    {
      this.attachedFields = Object.values(opts.fieldsMap).map((f) => f.id);
      this.fieldsMap = opts.fieldsMap;
    }
    else if(
      Array.isArray(opts.fieldIds) &&
      opts.fieldIds.length &&
      opts.fieldIds.every(isUuid)
    )
    {
      // need to load fields - methods will error if not loaded first
      this.attachedFields = opts.fieldIds;
    }
  }

  public async load(opts?: {
    force?: boolean | undefined;
  }): Promise<DefinitionType | undefined>
  {
    if(Array.isArray(this.attachedFields) && this.attachedFields.length)
    {
      if(opts?.force || !isPopulatedObject(this.fieldsMap))
      {
        const foundFields = await ArchetypeHandler.loadFields({
          db: this.db,
          fieldIds: this.attachedFields
        });

        if(Array.isArray(foundFields) && foundFields.length)
        {
          this.setFields({ fieldsArray: foundFields });
        }
      }
    }

    return super.load();
  }

  get name(): Nullable<string>
	{
    return this.data.name;
	}

  set name(value: unknown)
  {
    this.setIfValid({
      key: 'name',
      value,
      validator: (val) => (typeof val === 'string')
    });
	}

  get attachedFields(): Nullable<UUID[]>
	{
    return this.data.attachedFields;
	}

  set attachedFields(value: unknown)
  {
    this.setIfValid({
      key: 'attachedFields',
      value,
      validator: (val) => (Array.isArray(val) && val.every(isUuid))
    });
	}

  get scopeId(): Nullable<UUID>
	{
    return this.data.scopeId;
	}

  set scopeId(value: unknown)
  {
    this.setIfValid({ key: 'scopeId', value, validator: isUuid });
	}

  get itemType(): Nullable<string>
	{
    return this.data.itemType;
	}

  set itemType(value: unknown)
  {
    this.setIfValid({
      key: 'itemType',
      value,
      validator: (val) => !!(val && (typeof val === 'string'))
    });
	}

	public getData(): DefinitionType
  {
    // for each field, get its value from data if it exists
		return {
      ...super.getData(),
      name: this.name,
      itemType: this.itemType,
      scopeId: this.scopeId,
      attachedFields: this.attachedFields
    } as DefinitionType;
	}

  public setData(data: Partial<DefinitionType>): void
  {
		if(!isPopulatedObject(data))
		{
			return;
		}

		try
    {
      // super.setData({});

			this.typeId = KnownItemType.Archetype;
      this.name = data.name;
      this.itemType = data.itemType;
      this.scopeId = data.scopeId;
      this.attachedFields = data.attachedFields;
		}
		catch(e)
		{
			console.error(e, data);
		}
	}
}

// instantiate Archetype
// it will know its attachedFields
// validation actions will require fields to be loaded
// method to validate setting a value using fields map
export function validateFieldValue(opts: {
  value: unknown;
  field: FieldData;
}): boolean
{
  return false;
}