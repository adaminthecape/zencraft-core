import { FieldData, FieldType } from "../models/Items/Field";
import { Item } from "../models/Items/GenericItem";
import { KnownItemType, UUID } from "../types/generic";

/**
 * This file contains all the Fields needed for the essential Item types. These
 * are used to populate the database with the necessary Fields when the system
 * is first set up.
 */

export const blockChildPositionFields: FieldData[] = [
  {
    id: '8591fdca-f45a-4cdb-97d7-71f109ed5e29',
    typeId: KnownItemType.Field,
    key: 'id',
    label: 'Block',
    fieldType: FieldType.item,
    itemType: KnownItemType.Block,
  },
  {
    id: '92488c2d-3217-4e31-8aeb-889f34f0e210',
    typeId: KnownItemType.Field,
    key: 'col',
    label: 'Pos (X)',
    fieldType: FieldType.number,
  },
  {
    id: 'defcb109-843a-46bd-a608-8f4e4cc2fac4',
    typeId: KnownItemType.Field,
    key: 'row',
    label: 'Pos (Y)',
    fieldType: FieldType.number,
  },
];

export const blockItemFields: FieldData[] = [
  {
    id: '09e9952a-ae13-4242-a69c-6d20aa722a6d',
    typeId: KnownItemType.Field,
    key: 'title',
    label: 'Title',
    fieldType: FieldType.text,
    isPrimarySearchField: true,
    isDefaultSortField: true,
    isSearchable: true,
    validation: {
      required: true,
      between: { min: 0, max: 200 }
    }
  },
  {
    id: '54dde479-6b15-4e08-9a75-4ca90d22bdb9',
    typeId: KnownItemType.Field,
    key: 'blueprintId',
    label: 'Block Definition',
    fieldType: FieldType.item,
    itemType: KnownItemType.Blueprint,
    isSearchable: true,
  },
  {
    id: '7f6db5b1-7919-486c-9ea5-95df65018d6a',
    typeId: KnownItemType.Field,
    key: 'childBlocks',
    label: 'Blocks',
    fieldType: FieldType.repeater,
    children: (blockChildPositionFields.map((f) => f.id) as UUID[])
  },
  {
    id: '555faf20-52a0-4a97-a255-aceea8976fd9',
    typeId: KnownItemType.Field,
    key: 'config',
    label: 'Config',
    fieldType: FieldType.repeater,
    maximumItems: 1,
    children: [] // repeater fields populated at runtime
  },
  {
    id: '44c04b5c-1434-49dc-871c-871fb65c65db',
    typeId: KnownItemType.Field,
    key: 'customStyles',
    label: 'Custom CSS',
    fieldType: FieldType.textarea,
  },
  {
    id: 'a2424fb8-ad38-40f8-a739-527accfb3f45',
    typeId: KnownItemType.Field,
    key: 'customClasses',
    label: 'Custom CSS Classes',
    fieldType: FieldType.text,
  },
];

export const archetypeItemFields: FieldData[] = [
  {
    id: 'fc30f92c-c564-4982-90ba-fd32eb2f5eca',
    typeId: KnownItemType.Field,
    key: 'name',
    label: 'Name',
    fieldType: FieldType.text,
    isPrimarySearchField: true,
    isSearchable: true,
    validation: {
      between: { min: 0, max: 100 }
    }
  },
  {
    id: '8008cfa5-4f5c-4e0d-ac3b-bfe5d17f62f1',
    typeId: KnownItemType.Field,
    key: 'itemType',
    label: 'Item Type',
    fieldType: FieldType.text,
    validation: {
      options: false,
    }
  },
  {
    id: '4922d039-36bf-4c77-ad30-74d84102807e',
    typeId: KnownItemType.Field,
    key: 'attachedFields',
    label: 'Fields',
    fieldType: FieldType.itemArray,
    itemType: KnownItemType.Field,
    validation: {
      required: true,
      between: { min: 0, max: 100 }
    }
  },
];

export const blueprintItemFields: FieldData[] = [
  ...archetypeItemFields,
  {
    id: '70abafc5-dbc3-496d-a8e7-39d44cb4b29a',
    typeId: KnownItemType.Field,
    key: 'blockType',
    label: 'Block Type',
    fieldType: FieldType.dropdown,
    options: [], // Front end must upsert the available block types
    isDefaultSortField: true,
    isSearchable: true,
    validation: {
      options: true,
      required: true,
    }
  },
  {
    id: 'cf7beee4-fe8f-4a34-a5f4-690ba63d08d2',
    typeId: KnownItemType.Field,
    key: 'allowedChildBlockTypes',
    label: 'Allowed Blocks',
    fieldType: FieldType.itemArray,
    itemType: KnownItemType.Block,
    isSearchable: true,
  },
];

export const fieldFieldsMap: Record<keyof Omit<FieldData, keyof Item>, FieldData> = {
    key: {
        id: '96bc11b1-86e6-49b3-885a-52623957b2db',
        typeId: KnownItemType.Field,
        key: 'key',
        label: 'Key',
        fieldType: FieldType.text,
        isSearchable: true,
        validation: {
            required: true,
            between: { min: 0, max: 36 }
        }
    },
    label: {
        id: '178041eb-d4a6-4c66-be33-36baad64c511',
        typeId: KnownItemType.Field,
        key: 'label',
        label: 'Label',
        fieldType: FieldType.text,
        isSearchable: true,
        validation: {
            between: { min: 0, max: 100 }
        }
    },
    icon: {
        id: 'f2d45bf4-e2f4-4b21-9099-ac1643605533',
        typeId: KnownItemType.Field,
        key: 'icon',
        label: 'Icon',
        fieldType: FieldType.dropdown,
        options: ['edit'],
    },
    fieldType: {
        id: '9faeee80-2404-4c3e-9829-6ac9b58536a1',
        typeId: KnownItemType.Field,
        key: 'fieldType',
        label: 'fieldType',
        fieldType: FieldType.dropdown,
        options: Object.values(FieldType),
        isSearchable: true,
        validation: {
            options: true,
            required: true,
        }
    },
    itemType: {
        id: 'ad631611-2303-4f27-b9ba-bebf0fc92228',
        typeId: KnownItemType.Field,
        key: 'itemType',
        label: 'Item Type',
        fieldType: FieldType.itemType,
        options: Object.values(KnownItemType),
        validation: {
            // disabled because these values must come from the db!
            options: false,
        }
    },
    itemTypeFrom: {
        id: 'fa438bf6-f850-43b2-8589-9c89724b988f',
        typeId: KnownItemType.Field,
        key: 'itemTypeFrom',
        label: 'itemTypeFrom',
        fieldType: FieldType.item,
        itemType: KnownItemType.Field,
    },
    isDefaultSortField: {
        id: 'c55a2aba-4c19-4afc-8c4f-c815ba720ef1',
        typeId: KnownItemType.Field,
        key: 'isDefaultSortField',
        label: 'Default Sort Field',
        fieldType: FieldType.toggle,
    },
    isPrimarySearchField: {
        id: '0cd3b47c-5ac5-49c7-ac08-9f91073b6128',
        typeId: KnownItemType.Field,
        key: 'isPrimarySearchField',
        label: 'Primary Search Field',
        fieldType: FieldType.toggle,
    },
    isSearchable: {
        id: '66574639-3eea-41cb-960a-a9aac4c95a18',
        typeId: KnownItemType.Field,
        key: 'isSearchable',
        label: 'Searchable',
        fieldType: FieldType.toggle,
    },
    children: {
        id: 'bb610a2c-6e5c-404a-bef4-8b41139a671d',
        typeId: KnownItemType.Field,
        key: 'children',
        label: 'Sub-Fields',
        fieldType: FieldType.itemArray,
        itemType: KnownItemType.Field,
    },
    validation: {
        id: '2c68df83-5cad-4c52-9daf-58d9462ad206',
        typeId: KnownItemType.Field,
        key: 'validation',
        label: '[TODO] Validation',
        fieldType: FieldType.dropdown,
    },
    multiSelect: {
        id: '962f8f29-dab4-4da2-84c0-2c0b072afc71',
        typeId: KnownItemType.Field,
        key: 'multiSelect',
        label: 'Multi-Select',
        fieldType: FieldType.toggle,
    },
    options: {
        id: '429aa271-b9b0-4258-8b24-11ff5183ae9a',
        typeId: KnownItemType.Field,
        key: 'options',
        label: '[TODO] Options',
        fieldType: FieldType.dropdown,
    },
    maximumItems: {
        id: 'fead9e18-e94c-4508-b091-a3206267fbad',
        typeId: KnownItemType.Field,
        key: 'maximumItems',
        label: 'Maximum Items',
        fieldType: FieldType.number,
    },
};

export const moduleItemFields: FieldData[] = [
  {
    id: 'cf2f9d7f-c9f6-4654-8558-6839202d06e4',
    typeId: KnownItemType.Field,
    key: 'title',
    label: 'Title',
    fieldType: FieldType.text,
    isPrimarySearchField: true,
    isDefaultSortField: true,
    isSearchable: true,
    validation: {
      required: true,
      between: { min: 0, max: 200 }
    }
  },
  {
    id: '7a61116c-e43a-42d0-9dda-388fc2010d59',
    typeId: KnownItemType.Field,
    key: 'slug',
    label: 'Slug',
    fieldType: FieldType.text,
    isSearchable: true,
    validation: {
      required: true,
      between: { min: 0, max: 50 }
    }
  },
  {
    id: '560d1c29-2e0e-4b6d-9de6-93773c17d9f5',
    typeId: KnownItemType.Field,
    key: 'pageIds',
    label: 'Pages',
    fieldType: FieldType.itemArray,
    itemType: KnownItemType.Page,
  },
  {
    id: 'd522e6b9-bda1-4be6-8374-a414f5e26cca',
    typeId: KnownItemType.Field,
    key: 'defaultPageId',
    label: 'Default Page',
    fieldType: FieldType.item,
    itemType: KnownItemType.Page,
  },
];

export const pageItemFields: FieldData[] = [
  {
    id: '05a95104-ff2b-4b96-ac3b-185e6e6e8e33',
    typeId: KnownItemType.Field,
    key: 'title',
    label: 'Title',
    fieldType: FieldType.text,
    isPrimarySearchField: true,
    isDefaultSortField: true,
    isSearchable: true,
    validation: {
      required: true,
      between: { min: 0, max: 200 }
    }
  },
  {
    id: 'dffd4ca6-b96c-4589-8dcb-d000c5f4a5f5',
    typeId: KnownItemType.Field,
    key: 'blockIds',
    label: 'Blocks',
    fieldType: FieldType.itemArray,
    itemType: KnownItemType.Block,
  },
  {
    id: 'c4f6e559-0681-4f7a-b2ff-a1531f4c1163',
    typeId: KnownItemType.Field,
    key: 'slug',
    label: 'Slug',
    fieldType: FieldType.text,
    isSearchable: true,
    validation: {
      required: true,
      between: { min: 0, max: 50 }
    }
  },
];

export const definedPermissionsRepeaterFields: FieldData[] = [
  {
    id: '6c4157ba-09de-4e9e-8d14-0d0ac1419d8c',
    typeId: KnownItemType.Field,
    key: 'permissionType',
    label: 'Permission Type',
    fieldType: FieldType.text,
    validation: {
      required: true,
    }
  },
  {
    id: 'bdb1b552-0308-4a71-b613-196c4f69f546',
    typeId: KnownItemType.Field,
    key: 'status',
    label: 'Permission Status',
    fieldType: FieldType.dropdown,
    options: [0, 1, 2, 3],
    validation: {
      required: true,
      options: true,
    }
  },
  {
    id: '49b2a9bc-ed9b-45d6-863c-95ccd40747a3',
    typeId: KnownItemType.Field,
    key: 'scope',
    label: 'Permission Scope',
    fieldType: FieldType.uuid,
  },
];

export const accessRoleItemFields: FieldData[] = [
  {
    id: 'ed0fd8d9-4f5a-4391-a2b4-3a2f17398dd7',
    typeId: KnownItemType.Field,
    key: 'title',
    label: 'Title',
    fieldType: FieldType.text,
    isPrimarySearchField: true,
    isDefaultSortField: true,
    isSearchable: true,
    validation: {
      required: true,
      between: { min: 0, max: 50 }
    }
  },
  {
    id: '14d1bfc7-0460-469e-8a23-484a666d0b7d',
    typeId: KnownItemType.Field,
    key: 'definedPermissions',
    label: 'Permissions',
    fieldType: FieldType.repeater,
    children: (Object.values(definedPermissionsRepeaterFields).map((x) => x.id) as UUID[])
  },
];
