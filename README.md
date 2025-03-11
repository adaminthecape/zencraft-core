# Zencraft Core
Welcome to my platform. This is an exercise of mine into N-tier architecture,
which has led me to interesting ideas and has become a way for me to practice 
and hone my programming skills. I will attempt to explain the function of the
components of the system and how they interact.

## Purpose
The intended purpose of the system is very open-ended, in that there can be any
purpose as its end result, as long as that can be represented with 2D and/or
relational data structures.

## Components

### Database
There are various database interfaces defined. All are based on GenericDatabase
(see `@/models/Database/GenericDatabase.ts`), and extend that class. GenericDb
is itself a dummy class, i.e. it does nothing, but defines the base types for
the other db handlers. It consumes `DbPagination` and `DbFilters`. All the other
db handlers (`SqlDatabase`, `GenericItemSqlDatabase`, `RealtimeDatabase`, etc)
extend GenericDatabase and conform to its types. This ensures consistency when
injecting a db handler into an Item or consuming it anywhere else (e.g. an API).

For rapid prototyping, it is easiest to use `GenericItemSqlDatabase`, for which
you will need only 2 tables: `itemsPublished` and `itemsArchived`. The former
contains all Items available on the platform, while `itemsArchived` contains all
historical revisions of Items, which you may then process as desired.

### Items
The GenericItem (or Item) class (see `@/models/Items/GenericItem.ts`) represents
a JSON data structure. The class provides essential methods for interfacing with
the injected database interface.

Here is a simple workflow for using Items. For simplicity, I will use the memory
database available in `@/models/Database/RamDatabase.ts`. This will not persist
the data to disk, but you can set up other storage solutions later as desired.

You can start managing data with as little as 8 lines of code:

```typescript
import * as zencore from 'zencraft-core';

// generate a new ID for your Item
const id = zencore.utils.uuid.generateUuid();

// instantiate a new database (or cache) handler
const db = new zencore.ramDb.RamDatabase({});

// instantiate an Item handler
const handler = new zencore.item.ItemHandler({ id, db });

// set some data on your new Item
handler.setData({ foo: 'bar' } as Record<string, unknown>);

// this data will have been validated according to the Item's setters
// beware - a GenericItem will accept any data through `setData()`
// CustomItem and other extensions will only accept validated data
const newData = handler.getData();

console.log('newData.foo:', (newData as Record<string, unknown>).foo);
// newData.foo: 'bar'

// this will persist the new data to your chosen db solution above
await handler.save();

// `load()` will return the result of `getData()` after loading the data
const savedData = await handler.load();

console.log('savedData:', savedData);
// savedData: {
//     id: '<generated uuid>',
//     typeId: 'Item',
//     createdAt: '<a few seconds ago>',
//     updatedAt: '<now>',
//     createdBy: 'unknown',
//     foo: 'bar',
// }
```

There is already handling for CustomItems via the front end, but in Core we can
easily define our own CustomItems by defining their fields:

```typescript
import * as zencore from 'zencraft-core';

    const db = new zencore.ramDb.RamDatabase({});

const fieldId = zencore.utils.uuid.generateUuid();
const customItemFields: zencore.fields.FieldData[] = [
    {
        id: fieldId,
        typeId: zencore.sharedTypes.KnownItemType.Field,
        key: 'name',
        fieldType: zencore.fields.FieldType.text,
        validation: {
            between: { min: 0, max: 100 }
        }
    }
];

const archetypeId = zencore.utils.uuid.generateUuid();
const archetypeHandler = new zencore.Archetype.ArchetypeHandler({
    id: archetypeId,
    db
});
archetypeHandler.setFields({ fieldsArray: customItemFields });

// now we have an Archetype with fields; we must match it to a CustomItem
const itemId = zencore.utils.uuid.generateUuid();
// the Field data must be passed to the CustomItemHandler initially, so that
// its fields can be validated immediately
const itemHandler = new zencore.CustomItem.CustomHandler({
    id: itemId,
    db,
    definition: archetypeHandler.getData(),
    fieldDataArray: customItemFields
});

// this will fail because 'foo' is not a valid field
itemHandler.setData({ foo: 'bar' });
console.log('new foo:', itemHandler.getData().foo);
// new foo: undefined

// this will fail because 'name' is a text field
itemHandler.setData({ name: { value: 'bar' } });
console.log('new name:', itemHandler.getData().name);
// new name: undefined

// this will succeed because 'name' is a valid string
itemHandler.setData({ name: 'foo' });
console.log('new name:', itemHandler.getData().name);
// new name: foo

// you may clear the value by making it `null` (this works for any field)
itemHandler.setData({ name: null });
console.log('new name:', itemHandler.getData().name);
// new name: null

// you may add a hook that triggers when a value is changed:
const onDirtyField: zencore.item.OnDirtyFieldFn = (
    itemId: string,
    itemType: string,
    name: string,
    value: unknown
) =>
{
    console.log(`Field "${name}" changed to "${value}"`);
};
itemHandler.setOnDirtyField(onDirtyField);
itemHandler.setData({ name: 'foo' });
console.log('new name:', itemHandler.getData().name);
// Field "name" changed to "foo"
// new name: foo
```

Now we have seen how to work with Items, Archetypes, and database handlers on a
basic level, you can explore the rest of the available options and use what you
need. As long as you use the `FieldData` type to define your Fields, and use a
CustomItem with an Archetype that contains your defined Fields, then your Items
will always be stored with valid data, and you will be able to easily retrieve,
store, and manipulate them.