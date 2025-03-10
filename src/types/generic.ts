export type UUID = `${string}-${string}-${string}-${string}-${string}`;
export type Nullable<T> = T | null | undefined;

export enum KnownItemType
{
	Item = 'Item',
	Archetype = 'Archetype',
	CustomItem = 'CustomItem',
	Field = 'Field',
	AccessRole = 'AccessRole',
	BlockDefinition = 'BlockDefinition',
	Block = 'Block',
	Module = 'Module',
	Page = 'Page',
}

export type ItemType = string;