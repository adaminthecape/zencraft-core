import { UUID } from '../../types/generic';
import { ItemType } from '../Items/GenericItem';
import { FieldData, Field, FieldType, FieldValidation } from '../Items/Field';
import { GenericDatabase, GenericDatabaseOpts } from '../Database/GenericDatabase';
import { DbFilters, isGroupFilter, isSingleFilter } from '../Database/DbFilters';
import { DbPaginationOpts, PaginatedItemResponse } from '../Database/Pagination';
import { toNumber, isUuid, reduceIntoAssociativeArray } from '../../utils/generic';
import { isPopulatedObject } from '../../utils/tools';

export type KnownValidationRules = keyof FieldValidation;
export type ValidationResult = (true | string);
export type ValidatorFunction = (opts: FieldValidatorFnOpts) => (true | string);
export type FieldValidatorFnOpts = { val: unknown; field: FieldData | undefined; };
export type TransformFunction<TIn = unknown, TOut = unknown> = (val: TIn) => (TOut | undefined);
export type FieldValidatorOpts = {
  fieldsArray?: Array<FieldData>;
  fieldsMap?: Record<string, FieldData>;
};

const transforms: Record<string, TransformFunction> = {
  toNumber: toNumber,
  toString: (val: unknown) => ((typeof val === 'string') ? val : undefined),
};

const fieldTypeTransforms: Partial<Record<FieldType, TransformFunction>> = {
  // text: transforms.toString,
  // textarea: transforms.toString,
  number: transforms.toNumber,
  timestamp: transforms.toNumber,
  // radio: undefined,
  // checkbox: undefined,
  // dropdown: undefined,
  // readonly: undefined,
  // repeater: undefined,
  // uuid: undefined,
  // uuidArray: undefined,
  // item: undefined,
  // itemArray: undefined,
};

function stringBetween(valOpts: {
  min: number;
  max: number;
  value: unknown;
}): ValidationResult
{
  if(typeof valOpts.value !== 'string')
  {
    return 'Invalid value';
  }

  const { min, max, value } = valOpts;

  if((min && (value.length < min)))
  {
    return `Must be greater than ${min} characters.`;
  }

  if((max && (value.length > max)))
  {
    return `Must be fewer than ${max} characters.`;
  }

  return true;
};

function numberBetween(valOpts: {
  min: number;
  max: number;
  value: unknown;
}): ValidationResult
{
  const { min, max } = valOpts;
  let { value } = valOpts;

  if((typeof value !== 'number') || Number.isNaN(value))
  {
    return 'Invalid value';
  }

  if((min && (value < min)))
  {
    return `Must be greater than ${min}.`;
  }

  if((max && (value > max)))
  {
    return `Must be less than ${max}.`;
  }

  return true;
};

const validators: Record<KnownValidationRules | string, ValidatorFunction> = {
  required: (opts: FieldValidatorFnOpts): ValidationResult =>
  {
    const { val, field } = opts;

    return val ? true : 'You must enter a value';
  },
  options: (opts: FieldValidatorFnOpts): ValidationResult =>
  {
    const { val, field } = opts;

    if(!Array.isArray(field?.options))
    {
      return 'No options to validate';
    }

    if(Array.isArray(val))
    {
      if(!val.every((v) => field.options?.includes(v)))
      {
        return 'Values mismatch';
      }
    }
    else if((typeof val === 'string') || (typeof val === 'number'))
    {
      // `==` to compare strings & numbers
      if(!field.options?.some((opt) => (opt == val)))
      {
        return 'Invalid selection';
      }
    }

    return true;
  },
  between: (opts: FieldValidatorFnOpts): ValidationResult =>
  {
    const { val, field } = opts;

    if(!field?.validation?.between)
    {
      return true;
    }

    if(Array.isArray(opts.val))
    {
      return numberBetween({
        min: field.validation.between.min,
        max: field.validation.between.max,
        value: opts.val.length
      });
    }

    if([
      FieldType.number,
      FieldType.timestamp
    ].includes(field.fieldType as FieldType))
    {
      return numberBetween({
        min: field.validation.between.min,
        max: field.validation.between.max,
        value: val as any
      });
    }

    return stringBetween({
      min: field.validation.between.min,
      max: field.validation.between.max,
      value: val as any
    });
  },
  isBoolean: (opts: FieldValidatorFnOpts) => 
  {
    const { val, field } = opts;

    return (typeof val === 'boolean') || 'Must be a string';
  },
  isString: (opts: FieldValidatorFnOpts) => 
  {
    const { val, field } = opts;

    return (typeof val === 'string') || 'Must be a string';
  },
  isNumber: (opts: FieldValidatorFnOpts) => 
  {
    const { val, field } = opts;

    if(!toNumber(val))
    {
      return 'Must be a number';
    }

    return true;
  },
  isArray: (opts: FieldValidatorFnOpts) => 
  {
    const { val, field } = opts;

    return Array.isArray(val) || 'Must be an array';
  },
  isObject: (opts: FieldValidatorFnOpts) => 
  {
    const { val, field } = opts;

    return Boolean(
      typeof val === 'object' &&
      val &&
      !Array.isArray(val)
    ) || 'Must be an object';
  },
  isTimestamp: (opts: FieldValidatorFnOpts) =>
  {
    const { val, field } = opts;

    return (
      Number.isInteger(toNumber(val)) &&
      (val as number) > 1e9
    ) || 'Must be a timestamp';
  },
  isUuid: (opts: FieldValidatorFnOpts) =>
  {
    const { val, field } = opts;

    return isUuid(val) || 'Must be an ID';
  },
  isUuidArray: (opts: FieldValidatorFnOpts) =>
  {
    const { val, field } = opts;

    return (
      Array.isArray(val) &&
      val.every(isUuid)
    ) || 'Must be a list of IDs';
  },
  isItemFilterArray: (opts: FieldValidatorFnOpts) =>
  {
    const { val, field } = opts;

    return (
      isGroupFilter(opts.val) ||
      isSingleFilter(opts.val)
    ) || 'Must be a valid array of filters or filter groups';
  },
  isPrimitive: (opts: FieldValidatorFnOpts) =>
  {
    const { val, field } = opts;

    return (
      typeof val === 'string' ||
      typeof val === 'number' ||
      typeof val === 'boolean'
    ) || 'Must be a primitive';
  },
  isPrimitiveArray: (opts: FieldValidatorFnOpts) =>
  {
    const { val, field } = opts;

    return (
      Array.isArray(val) &&
      val.every((v) => (
        typeof v === 'string' ||
        typeof v === 'number' ||
        typeof v === 'boolean'
      ))
    ) || 'Must be a primitive array';
  },
};

const fieldTypeValidators: Record<FieldType, ValidatorFunction> = {
  text: validators.isString,
  textarea: validators.isString,
  number: validators.isNumber,
  timestamp: validators.isTimestamp,
  radio: validators.isPrimitive,
  readonly: () => 'Field is readonly',
  repeater: (opts: FieldValidatorFnOpts) => true,
  uuid: validators.isUuid,
  uuidArray: validators.isUuidArray,
  dropdown: (opts: FieldValidatorFnOpts) => ([
    validators.isPrimitive(opts),
    validators.isPrimitiveArray(opts),
  ].some((result) => (result === true)) || 'Must be a valid dropdown'),
  checkbox: validators.isArray,
  toggle: validators.isBoolean,
  item: validators.isUuid,
  itemArray: validators.isUuidArray,
  itemFilters: validators.isItemFilterArray,
  fieldType: (opts: FieldValidatorFnOpts) =>
  {
    return (
      (typeof opts.val === 'string') &&
      Object.values(FieldType).includes(opts.val as FieldType)
    ) || 'Must be a known field type';
  },
  itemFieldKey: (opts: FieldValidatorFnOpts) =>
  {
    return (
      (typeof opts.val === 'string') &&
      /^[a-z0-9_]{0,50}$/g.test(opts.val)
    ) || 'Must be a valid field key';
  },
  itemType: (opts: FieldValidatorFnOpts) =>
  {
    return !!(
      // disabled because item types are dynamic and must come from the db
      // Object.values(ItemType).includes(opts.val as ItemType) &&
      opts.val && (typeof opts.val === 'string')
    ) || 'Must be a known item type';
  }
};

/**
 * Recursively retrieve field ids from a nested array of fields
 * @param fieldsArray 
 * @returns 
 */
function retrieveFieldIds(fieldsArray: Array<FieldData | Field['id']>): Field['id'][]
{
  const result: Field['id'][] = [];

  if(!Array.isArray(fieldsArray))
  {
    return result;
  }

  fieldsArray.forEach((field) =>
  {
    if(!field)
    {
      return;
    }

    if(typeof field === 'string')
    {
      if(isUuid(field))
      {
        result.push(field);
      }
    }
    else if(isUuid(field?.id))
    {
      result.push(field.id);
    }
    else if(Array.isArray(field?.children))
    {
      result.push(...(retrieveFieldIds(field.children)));
    }
  });

  return result;
}

/**
 * Use the FieldValidator class to validate data according to Field definitions.
 * You need to give it a list of fields or field IDs, which will be converted to
 * Field data for consumption. You should always use `getInstance()` to ensure
 * that your field data is loaded - validation fails when the field is missing.
 */
export class FieldValidator
{
  public fieldIds: Array<Field['id']>;
  public fields?: Record<Field['id'], FieldData> | undefined;

  /**
   * Given an array of field handlers or their data, return
   * an associative array of handlers, keyed by field ID.
   * @param fieldArray
   * @returns
   * @deprecated
   */
  public static deriveFieldHandlers(
    fieldArray: Array<Field | FieldData>
  ): Record<Field['id'], Field>
  {
    if(!Array.isArray(fieldArray))
    {
      return {};
    }

    return fieldArray.reduce((
      agg: Record<Field['id'], Field>,
      field: Field | FieldData
    ) =>
    {
      if(field instanceof Field)
      {
        agg[field.id] = field;
      }
      else if(isPopulatedObject(field))
      {
        agg[field.id] = new Field({
          id: field.id,
          // TODO: hook up to actual db, if necessary
          db: new GenericDatabase<string, Field>({}),
          initialData: field as FieldData
        });
      }

      return agg;
    }, {});
  }

  /**
   * Given a field, return an array of KnownValidationRules, which
   * you can then map to validation handler functions as needed.
   * @param field
   * @returns
   */
  public static generateInputRuleNames(
    field: Field | FieldData
  ): KnownValidationRules[]
  {
    let fieldData;

    if(field instanceof Field)
    {
      fieldData = field.getData();
    }
    else if(isPopulatedObject(field))
    {
      fieldData = field;
    }

    if(!fieldData?.validation)
    {
      return [];
    }

    return Object.keys(fieldData.validation) as KnownValidationRules[];
  }

  public static async mapFieldIdsToData(opts: {
    db: GenericDatabase<string, Field>;
    fieldDataOrIds: Array<(FieldData | Field['id'])>;
  }): Promise<Record<Field['id'], FieldData>>
  {
    const { db, fieldDataOrIds: fieldDataArray } = opts;

    if(!(
      db &&
      Array.isArray(fieldDataArray) &&
      fieldDataArray.length
    ))
    {
      return {};
    }

    const fieldIds = retrieveFieldIds(fieldDataArray);

    if(!fieldIds?.length)
    {
      return {};
    }

    let fieldsFromDb = await db.selectMultiple({
      itemType: ItemType.Field,
      itemIds: fieldIds
    });

    if(!Array.isArray(fieldsFromDb?.results))
    {
      return {};
    }

    const results: (
      Record<Field['id'], FieldData>
    ) = reduceIntoAssociativeArray(
      (fieldsFromDb.results) || [],
      'id'
    );

    fieldDataArray.forEach((f) =>
    {
      if((isPopulatedObject(f) && (f as any))?.id && !results[f.id])
      {
        (results as Record<Field['id'], FieldData>)[f.id] = f;
      }
    });

    return results;
  }

  public static retrieveFieldIds = retrieveFieldIds;
  public static validateRequired = validators.required;
  public static validateOptions = validators.options;
  public static validateBetween = validators.between;
  public static validateIsBoolean = validators.isBoolean;
  public static validateIsArray = validators.isArray;
  public static validateIsNumber = validators.isNumber;
  public static validateIsString = validators.isString;
  public static validateIsTimestamp = validators.isTimestamp;
  public static validateIsObject = validators.isObject;
  public static validateIsUuid = validators.isUuid;
  public static validateIsUuidArray = validators.isUuidArray;
  public static validateIsItemFilterArray = validators.isItemFilterArray;

  public static async getInstance(opts: FieldValidatorOpts & {
    db: GenericDatabase<Field['id'], Field>
  }): Promise<FieldValidator>
  {
    const instance = new FieldValidator(opts);

    await instance.loadFields(opts);

    return instance;
  }

  constructor(opts: FieldValidatorOpts)
  {
    let fieldIds;

    if(opts.fieldsArray)
    {
      fieldIds = retrieveFieldIds(opts.fieldsArray);
    }
    else if(opts.fieldsMap)
    {
      fieldIds = retrieveFieldIds(Object.values(opts.fieldsMap));
    }

    if(!fieldIds)
    {
      throw new Error('Must provide fields');
    }

    this.fieldIds = fieldIds;
  }

  protected async loadFields(opts: {
    db: GenericDatabase<string, Field>;
  }): Promise<void>
  {
    const fields = await FieldValidator.mapFieldIdsToData({
      db: opts.db,
      fieldDataOrIds: this.fieldIds as UUID[]
    });

    if(!(Array.isArray(fields) && fields.length))
    {
      console.warn(`Failed to load fields ${this.fieldIds.join(',')}`);
    }

    this.fields = fields;
  }

  /**
   * TODO:
   * Use this function to validate a key-value pair against its field
   * It should fail if the field does not exist on the instance
   * It should succeed if the value is null
   * It should transform the value if needed, based on the field type
   *  (e.g. if field type is number, but given a number as a string, accept it as a number)
   * Should be able to:
   * - Set a list of fields on an Item (which extends ItemDefinition)
   * - Give an object to setData()
   * - Validate all properties in the data with this function
   * - Ensure valid data structure from any starting point, recursively
   * @param opts 
   * @returns 
   */
  public validateForKey(opts: FieldValidatorFnOpts): ValidationResult
  {
    const { val, field } = opts;

    // need to ensure this validates any primitive by its field type
    switch(field?.fieldType)
    {
      // Unhandled as yet:
      case FieldType.checkbox:
      case FieldType.radio:
        return `Unhandled field type ${field?.fieldType}`;
      case FieldType.dropdown:
        return validators.options(opts);
      case FieldType.number:
        return validators.isNumber(opts);
      case FieldType.text:
      case FieldType.textarea:
        return validators.isString(opts);
      case FieldType.timestamp:
        return validators.isTimestamp(opts);
      case FieldType.item:
      case FieldType.uuid:
        return validators.isUuid(opts);
      case FieldType.itemArray:
      case FieldType.uuidArray:
        return validators.isUuidArray(opts);
      case FieldType.repeater:
        return validators.isArray(opts);
      case FieldType.readonly:
        return 'Field is readonly';
      default:
        return `Unknown field type ${field?.fieldType} (1)`;
    }
  }

  public transformByFieldType(opts: FieldValidatorFnOpts): unknown
  {
    const { val, field } = opts;
    const type = field?.fieldType as FieldType;

    if(!type || (typeof fieldTypeTransforms[type] !== 'function'))
    {
      return val;
    }

    opts.val = fieldTypeTransforms[type](val);
  }

  public validateByFieldType(opts: FieldValidatorFnOpts): ValidationResult
  {
    const { val, field } = opts;

    if(
      !field?.fieldType ||
      (typeof fieldTypeValidators[field.fieldType as FieldType] !== 'function')
    )
    {
      return `Unknown field type ${field?.fieldType} (2)`;
    }

    return fieldTypeValidators[field.fieldType as FieldType]({ val, field });
  }

  public validateRepeater(opts: FieldValidatorFnOpts): ValidationResult
  {
    const { val, field } = opts;

    if(val === null)
    {
      return true;
    }

    if(!Array.isArray(val))
    {
      return 'Must be an array of values';
    }

    if(!(Array.isArray(field?.children) && field.children.length))
    {
      return 'No fields to compare';
    }

    // we should have all the fields loaded, including repeater children
    // we need to map the repeater child ids to their fields
    // and use a new Validator to test each child item
    const fieldKeyToIdMap: Record<string, UUID> = {};
    const fieldsMap = field.children.reduce((agg: Record<UUID, FieldData>, childId) =>
    {
      if(this.fields?.[childId]?.key)
      {
        agg[childId] = this.fields[childId];
        fieldKeyToIdMap[this.fields[childId].key] = childId;
      }

      return agg;
    }, {});

    const subValidator = new FieldValidator({ fieldsMap });
    let failedMessage;

    for(const entry of val)
    {
      for(const key of Object.keys(entry))
      {
        const { success, message } = subValidator.validateField({
          fieldId: fieldKeyToIdMap[key],
          value: entry
        });

        if(!success)
        {
          failedMessage = message;

          break;
        }
      }

      if(failedMessage)
      {
        break;
      }
    }

    if(failedMessage)
    {
      return failedMessage;
    }

    return true;
  }

  public validateField(opts: {
    value: unknown;
  } & ({
    fieldId: Field['id'];
  } | {
    field: FieldData;
  })): ({
    success: boolean;
    message?: string;
  })
  {
    if(!('fieldId' in opts) && !('field' in opts))
    {
      return { success: false, message: 'No field data available' };
    }

    let field;

    if('fieldId' in opts)
    {
      field = this.fields?.[opts.fieldId];
    }
    else if('field' in opts)
    {
      field = opts.field;
    }

    if(!field?.fieldType)
    {
      return { success: false, message: 'Unknown field type' };
    }

    const payload = { val: opts.value, field };

    this.transformByFieldType(payload);

    const typeValid = this.validateByFieldType(payload);

    if(typeValid !== true)
    {
      return { success: false, message: typeValid };
    }

    if((field.fieldType === FieldType.repeater))
    {
      // need to validate its child values against its child fields
      const isRepeaterValid = this.validateRepeater(payload);

      if(isRepeaterValid !== true)
      {
        return { success: false, message: isRepeaterValid };
      }
    }

    const rules = FieldValidator.generateInputRuleNames(field);

    if(!(Array.isArray(rules) && rules.length))
    {
      // no rules = nothing to fail on
      return { success: true };
    }

    let failureMessage;

    // evaluate rules, return the first failure
    for(const ruleName of rules)
    {
      let result;

      const validatorName = `validate${
        ruleName.slice(0, 1).toUpperCase()
      }${
        ruleName.slice(1)
      }`;
      const validator = (FieldValidator)[
        validatorName as keyof typeof FieldValidator
      ] as ValidatorFunction;

      if(typeof validator !== 'function')
      {
        console.error(`Unrecognised validator "${validatorName}" for "${ruleName}"`);

        continue;
      }

      result = validator(payload);

      if(result !== true)
      {
        // rule failed
        failureMessage = result;

        break;
      }
    }

    if(typeof failureMessage === 'string')
    {
      return { success: false, message: failureMessage };
    }

    return { success: true };
  }
}

/**
 * Throwaway example for how to load fields from a Store instead of from a db
 * This can work with any kind of caching solution as you may have hundreds of
 * fields to validate, and you would want to not query the db over and over
 * @param opts 
 * @returns 
 */
async function getFieldValidatorTiedToStore(opts: {
  fieldDataArray: Array<(FieldData | string)>;
}): Promise<FieldValidator>
{
  class StoreDb extends GenericDatabase<string, Record<string, unknown>>
  {
    public store: any;

    constructor(opts: GenericDatabaseOpts & {
      store: any
    })
    {
      super(opts);
    }

    public async selectMultiple(opts: {
      itemType: string;
      itemIds?: string[] | undefined;
      filters?: DbFilters;
      pagination?: DbPaginationOpts;
    }): Promise<PaginatedItemResponse<Record<string, unknown>>>
    {
      return this.store.loadMultiple({ ids: opts.itemIds });
    }
  };

  const itemsInStore: any[] = [];

  return FieldValidator.getInstance({
    db: (new StoreDb({
      store: {
        getItem: (id: string) => (itemsInStore.find((x) => x.id === id))
      }
    })) as any,
    fieldsArray: opts.fieldDataArray as FieldData[]
  });
}