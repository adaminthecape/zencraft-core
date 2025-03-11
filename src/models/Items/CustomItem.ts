import { Nullable, UUID } from '../../types/generic';
import { FieldData } from './Field';
import { ItemOpts, Item, ItemHandler } from './GenericItem';
import { ArchetypeItem } from '../Archetypes/Archetype';
import { getCurrentSecond, isPopulatedObject } from '../../utils/tools';
import { FieldValidator } from '../Archetypes/FieldValidator';
import { reduceIntoAssociativeArray } from '../../utils/tools';

export type CustomItemOpts = ItemOpts & (
	/**
	 * In order to reliably validate data by fields, we need the definition
	 * to be loaded before all else; we can either have the attachedFields
	 * available along with a synchronous function to get the field data (e.g.
	 * if retrieving it from a store or cache), or we can provide the field data
	 * directly in the opts. Not using a function here because field data must
	 * be definitively loaded before the handler is created.
	 */
	{
		definition: ArchetypeItem;
		fieldDataArray: FieldData[];
	}
);

export type CustomItem = Item & {
	/**
	 * CustomItem data is defined by its definition's fields, so the data can be
	 * anything, although it must be validated according to the known fields. So
	 * we don't get much help from typing with this, as opposed to hardcoded
	 * handlers, but admins get a lot more configurability.
	 */
	[key: string]: Nullable<unknown>;
};

// @ts-expect-error getInstance() return type is unexpected but not incorrect
export class CustomHandler
	extends ItemHandler<CustomItem>
	implements CustomItem
{
	public typeId: string = 'Custom';
	protected definitionId: UUID;
	protected validator: FieldValidator;
	protected fieldDataArray: (FieldData[]) | null;
	/** Map of field keys to their data */
	protected fieldKeyMap: Record<string, FieldData>;

	public static override async getInstance(
		opts: CustomItemOpts
	): Promise<CustomHandler>
	{
		const instance = new CustomHandler(opts);

		await instance.load();

		return instance;
	}

	constructor(opts: CustomItemOpts)
	{
		super(opts);

		if(!(
			opts.definition?.id &&
			Array.isArray(opts.definition?.attachedFields)
		))
		{
			throw new Error(`CustomHandler (${(
				opts.id
			)}) requires a definition with attachedFields`);
		}

		if(!Array.isArray(opts.fieldDataArray))
		{
			throw new Error(`CustomHandler (${(
				opts.id
			)}) requires either getFieldDataFn or fieldDataArray`);
		}

		this.definitionId = opts.definition.id as UUID;
		this.typeId = opts.definition.itemType || 'Custom';
		this.definition = opts.definition;
		this.fieldDataArray = opts.fieldDataArray.filter(isPopulatedObject);
		this.fieldKeyMap = reduceIntoAssociativeArray(
			this.fieldDataArray,
			'key'
		) as Record<string, FieldData>;
		this.validator = new FieldValidator({
			fieldsArray: this.fieldDataArray
		});
	}

	protected override setIfValid<T = unknown>(opts: {
		key: string;
		value: T;
		validator: (value: T) => boolean;
	}): void
	{
		const { key } = opts;
		const { value } = opts;

		if(value === null)
		{
			(this.data as Record<string, unknown>)[key] = value;
			this.markDirty(key);
		}
		else if(opts.validator(value))
		{
			(this.data as Record<string, unknown>)[key] = value;
			this.markDirty(key);
		}
		else if(typeof value !== 'undefined')
		{
			console.log('FAILED (c):', {
				key,
				value,
				type: typeof value,
				field: this.fieldKeyMap[key],
				message: this.validator.validateField({
					field: this.fieldKeyMap[key],
					value
				}).message
			});
		}
	}

	/**
	 * For each of the attached fields, retrieve its corresponding data value
	 * as `this.data[field.key]`; this means that only the attached fields will
	 * yield any data.
	 * @returns An object containing this Item's field-based data
	 */
	protected getCustomFieldsData(): Record<string, unknown>
	{
		return Object.keys(this.fieldKeyMap).reduce((
			agg: Record<string, unknown>,
			key: string
		) =>
		{
			agg[key] = (this.data as Record<string, unknown>)[key];

			return agg;
		}, {});
	}

	public override getData(): CustomItem
	{
		return {
			...super.getData(),
			...this.getCustomFieldsData(),
			definitionId: this.definitionId || this.definition?.id,
			typeId: this.definition?.itemType || 'Custom',
		};
	}

	/**
	 * Set the Item's data based on its attached fields. Any values provided, if
	 * they do not correspond to a known field key, will be ignored. Any props
	 * which do correspond to a known field key will be validated according to
	 * the field's type, and any `validation` options specified on the field.
	 * @param data 
	 */
	public override setData(data: Record<string, unknown>): void
	{
		if(!isPopulatedObject(data))
		{
			return;
		}

		const baseKeys = [
			'id',
			'typeId',
			'createdBy',
			'createdAt',
			'updatedAt',
			'definitionId',
		];

		try
		{
			Object.entries(data).forEach(([key, value]) =>
			{
				if(baseKeys.includes(key))
				{
					return;
				}

				if(!this.fieldKeyMap[key])
				{
					console.log(`Field not found for key: ${key}`);

					return;
				}

				this.setIfValid({
					key,
					value,
					validator: (val) => this.validator.validateField({
						field: this.fieldKeyMap[key],
						value: val
					}).success
				});
			});

			const now = getCurrentSecond();

			this.typeId = this.definition?.itemType || 'Custom';
			this.data.typeId = this.typeId;
			this.updatedAt = now;

			if(!this.createdAt)
			{
				this.createdAt = now;
			}

			if(data.definitionId)
			{
				this.definitionId = data.definitionId as UUID;
			}
		}
		catch(e)
		{
			console.error(e, data);
		}
	}
}
