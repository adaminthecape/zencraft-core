/**
 * The FirebaseAuth handler deals with connecting to Firebase as a valid user.
 * It depends on your config in the firebase console, so you will need to have a
 * user set up there which this can consume (email & password is required).
 */
export * as auth from "./models/firebase/FirebaseAuth";
// export * as table from "./models/firebase/FirebaseTable";
/**
 * This is the handler for the Firestore database.
 */
export * as rtdb from "./models/firebase/RealtimeDatabase";

/**
 * Database handlers are used to interact with the database. They contain the
 * logic for saving, loading, and deleting data. The GenericDatabase does not
 * do anything, but exists for the other handlers to extend, making a consistent
 * interface for all database handlers.
 */
export * as genericDb from "./models/Database/GenericDatabase";

/**
 * This is a SQL db handler, which expects that the item type corresponds to the
 * table name. Ensure your tables exist before querying them. Alternatively, you
 * may simply use the `query()` function to run raw SQL queries.
 */
export * as sqlDb from "./models/Database/SqlDatabase";
/**
 * This is a SQL db handler, which expects that all items are stored in a single
 * table. This is useful for small projects, but may not scale well. You may use
 * this to together with the `SqlDatabase` to store low-volume data in a single
 * table, and high-volume data in separate tables.
 */
export * as itemSqlDb from "./models/Database/GenericItemSqlDatabase";

/**
 * These database filter types and handler present a consistent interface for
 * all database handlers to use when querying the database.
 */
export * as dbFilters from "./models/Database/DbFilters";
/**
 * This contains pagination types and handling common to all the db handlers.
 */
export * as dbPagination from "./models/Database/Pagination";

/**
 * Items are the basis of the system. All complex data is stored as Items.
 */
export * as item from "./models/Items/GenericItem";

/**
 * Fields are the basic data types that Items are made of. They contain config
 * data and validation rules. All CustomItems must have a list of Fields.
 */
export * as fields from './models/Items/Field';
/**
 * Field validators are the rules that determine if field data can be saved. If
 * the data doesn't pass the validation, it will not be saved. All CustomItems
 * must have Fields, which are validated by the FieldValidator class.
 */
export * as fieldValidation from './models/Archetypes/FieldValidator';

/**
 * Archetypes are the blueprints for Items. They contain the list of Fields
 * that an Item must have, as well as other configuration data.
 */
export * as Archetype from './models/Archetypes/Archetype';
/**
 * BlockDefinitions are a special kind of Archetype which represents config
 * for Blocks. Blocks are the basic components of layouts.
 */
export * as BlockDefinition from './models/Archetypes/BlockDefinition';

/**
 * CustomItems are Items that are defined by platform admins. They can have any
 * number of Fields, and can be used to store any kind of data.
 */
export * as CustomItem from './models/Items/CustomItem';

/**
 * Modules, Pages, and Blocks are the necessary components of layouts. Modules
 * are the top-level components, Pages are the second-level components, and
 * Blocks are the lowest-level components.
 */
export * as Module from './models/Items/Module';
export * as Page from './models/Items/Page';
export * as Block from './models/Items/Block';

/**
 * AccessRoles are categories of users that have different permissions. Whereas
 * UserPermissions are the actual permissions that users have, AccessRoles are
 * the categories that those permissions fall into.
 */
export * as AccessRole from './models/Permissions/AccessRole';
export * as UserPermissions from './models/Permissions/UserPermissions';

export * as sharedTypes from './types/generic';

export * as utils from './utils';
