import { Nullable, UUID } from "../../types/generic";
import { isPopulatedObject } from "../../utils/tools";
import { isUuid } from "../../utils/uuid";
import { Item, ItemHandler, ItemOpts, ItemType } from "./GenericItem";

export type FieldValidation = {
	required?: boolean;
	between?: {
		min: number;
		max: number;
	};
	options?: string[] | boolean;
	isBoolean?: boolean;
	isString?: boolean;
	isNumber?: boolean;
	isArray?: boolean;
	isObject?: boolean;
	isTimestamp?: boolean;
	isUuid?: boolean;
	isUuidArray?: boolean;
	isItemFilterArray?: boolean;
};

export enum FieldType
{
	text = 'text',
	textarea = 'textarea',
	number = 'number',
	timestamp = 'timestamp',
	dropdown = 'dropdown',
	toggle = 'toggle',
	checkbox = 'checkbox',
	radio = 'radio',
	readonly = 'readonly',
	uuid = 'uuid',
	uuidArray = 'uuidArray',
	item = 'item',
	itemArray = 'itemArray',
	itemFilters = 'itemFilters',
	repeater = 'repeater',
	fieldType = 'fieldType',
	itemType = 'itemType',
	itemFieldKey = 'itemFieldKey',
};

export type FieldData = Item & {
	key: Nullable<string>;
	label?: Nullable<string>;
	icon?: Nullable<string>;
	/** Category of field to display in the UI, e.g. text, number, item */
	fieldType: Nullable<FieldType>;
	/** The type of Item whose IDs this field stores */
	itemType?: Nullable<string>;
	/** If itemType not specified, try to get it from a field with this key */
	itemTypeFrom?: Nullable<string>;
	/** Intended to be displayed in the UI as the main fuzzy-match input */
	isPrimarySearchField?: Nullable<boolean>;
	/** Whether this field should be included in search filters */
	isSearchable?: Nullable<boolean>;
	/** Whether a table should default to sorting by this field */
	isDefaultSortField?: Nullable<boolean>;
	/** For dropdowns, whether multiple values can be selected */
	multiSelect?: Nullable<boolean>;
	/** {@link FieldValidation} */
	validation?: Nullable<FieldValidation>;
	/** Dropdown options, if applicable */
	options?: Nullable<(string | number)[]>;
	/** IDs of child fields of this field (for repeaters) */
	children?: Nullable<Array<UUID>>;
	/** Maximum number of repeater or array items allowed */
	maximumItems?: Nullable<number>;
};

export type FieldHandlerOpts = ItemOpts;

export class FieldTransforms
{
	public static stringToNumber(value: unknown): number | undefined
	{
		if(
			(typeof value === 'string') &&
			(`${parseInt(value, 10)}` === value)
		)
		{
			return parseInt(value, 10);
		}

		return undefined;
	}

	public static stringToBool(value: unknown): boolean | undefined
	{
		if(typeof value === 'string')
		{
			if(value === 'true')
			{
				return true;
			}
			else if(value === 'false')
			{
				return false;
			}
		}

		return undefined;
	}
}

export class Field extends ItemHandler<Item & FieldData> implements FieldData
{
	constructor(opts: ItemOpts)
	{
		super(opts);
	}

	// a Field needs some basic properties to drive a UI

	public get validation(): Nullable<FieldValidation>
	{
		return this.data.validation;
	}

	public set validation(value: Nullable<FieldValidation>)
	{
		if(value === null)
		{
			this.data.validation = null;
		}
		else if(!isPopulatedObject(value))
		{
			return;
		}

		// TODO: validate validation
		this.data.validation = value;
		this.markDirty('validation');
	}

	public get fieldType(): Nullable<FieldType>
	{
		return this.data.fieldType;
	}

	public set fieldType(value: Nullable<FieldType>)
	{
		if(value === null)
		{
			this.data.fieldType = null;
		}

		this.data.fieldType = value;
		this.markDirty('fieldType');
	}

	public get key(): Nullable<string>
	{
		return this.data.key;
	}

	public set key(value: Nullable<string>)
	{
		if(value === null)
		{
			this.data.key = null;
		}

		this.data.key = value;
		this.markDirty('key');
	}

	public get label(): Nullable<string>
	{
		return this.data.label;
	}

	public set label(value: Nullable<string>)
	{
		if(value === null)
		{
			this.data.label = null;
		}

		this.data.label = value;
		this.markDirty('label');
	}

	public get icon(): Nullable<string>
	{
		return this.data.icon;
	}

	public set icon(value: Nullable<string>)
	{
		if(value === null)
		{
			this.data.icon = null;
		}

		this.data.icon = value;
		this.markDirty('icon');
	}

	public get options(): Nullable<(string | number)[]>
	{
		return this.data.options;
	}

	public set options(value: Nullable<(string | number)[]>)
	{
		if(value === null)
		{
			this.data.options = null;
		}
		else if(!Array.isArray(value))
		{
			return;
		}

		this.data.options = value;
		this.markDirty('options');
	}

	public get itemType(): Nullable<string>
	{
		return this.data.itemType;
	}

	public set itemType(value: Nullable<string>)
	{
		if(value === null)
		{
			this.data.itemType = null;
		}
		else if(typeof value !== 'string')
		{
			return;
		}

		this.data.itemType = value;
		this.markDirty('options');
	}

	public get isSearchable(): Nullable<boolean>
	{
		return this.data.isSearchable;
	}

	public set isSearchable(value: Nullable<boolean>)
	{
		value = FieldTransforms.stringToBool(value) ?? value;

		this.setIfValid({
			key: 'isSearchable',
			value,
			validator: (val) => (typeof val === 'boolean')
		});
	}

	public get isPrimarySearchField(): Nullable<boolean>
	{
		return this.data.isPrimarySearchField;
	}

	public set isPrimarySearchField(value: Nullable<boolean>)
	{
		value = FieldTransforms.stringToBool(value) ?? value;

		this.setIfValid({
			key: 'isPrimarySearchField',
			value,
			validator: (val) => (typeof val === 'boolean')
		});
	}

	public get isDefaultSortField(): Nullable<boolean>
	{
		return this.data.isDefaultSortField;
	}

	public set isDefaultSortField(value: Nullable<boolean>)
	{
		value = FieldTransforms.stringToBool(value) ?? value;

		this.setIfValid({
			key: 'isDefaultSortField',
			value,
			validator: (val) => (typeof val === 'boolean')
		});
	}

	public get multiSelect(): Nullable<boolean>
	{
		return this.data.multiSelect;
	}

	public set multiSelect(value: Nullable<boolean>)
	{
		value = FieldTransforms.stringToBool(value) ?? value;

		this.setIfValid({
			key: 'multiSelect',
			value,
			validator: (val) => (typeof val === 'boolean')
		});
	}

	public get children(): Nullable<Array<UUID>>
	{
		return this.data.children;
	}

	public set children(value: unknown)
	{
		if(isUuid(value))
		{
			value = [value];
		}

		this.setIfValid({
			key: 'children',
			value,
			validator: (val) => (Array.isArray(val) && val.every(isUuid))
		});
	}

	public get maximumItems(): Nullable<number>
	{
		return this.data.maximumItems;
	}

	public set maximumItems(value: unknown)
	{
		if(
			typeof value === 'string' &&
			`${parseInt(value, 10)}` === value
		)
		{
			value = parseInt(value, 10);
		}

		this.setIfValid({
			key: 'maximumItems',
			value,
			validator: (val) => (Number.isInteger(val))
		});
	}

	public getData(): FieldData
	{
		return {
			...super.getData(),
			key: this.key,
			label: this.label,
			icon: this.icon,
			fieldType: this.fieldType,
			itemType: this.itemType,
			validation: this.validation,
			options: this.options,
			isPrimarySearchField: this.isPrimarySearchField,
			isSearchable: this.isSearchable,
			isDefaultSortField: this.isDefaultSortField,
			multiSelect: this.multiSelect,
			children: this.children,
			maximumItems: this.maximumItems,
		};
	}

	public setData(
		data: Partial<Item & FieldData>,
		opts?: { overwriteExisting?: boolean; }
	): void
	{
		if(!isPopulatedObject(data))
		{
			return;
		}

		try
		{
			super.setData({});

			this.typeId = ItemType.Field;
			this.validation = data.validation;
			this.fieldType = data.fieldType;
			this.key = data.key;
			this.label = data.label;
			this.icon = data.icon;
			this.options = data.options;
			this.itemType = data.itemType;
			this.isPrimarySearchField = data.isPrimarySearchField;
			this.isSearchable = data.isSearchable;
			this.isDefaultSortField = data.isDefaultSortField;
			this.multiSelect = data.multiSelect;
			this.children = data.children;
			this.maximumItems = data.maximumItems;
		}
		catch(e)
		{
			console.error(e, data);
		}
	}
}
