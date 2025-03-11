import { KnownItemType, Nullable, UUID } from '../../types/generic';
import { Item, ItemHandler, ItemOpts } from './GenericItem';
import { isUuid } from '../../utils/uuid';
import { isPopulatedObject } from '../../utils/tools';

export type HubItemOpts = ItemOpts;

export type HubItem = Item & {
	title: Nullable<string>;
	slug: Nullable<string>;
	pageIds: Nullable<UUID[]>;
	defaultPageId: Nullable<UUID>;
};

export const REGEX_SLUG = /^[a-z0-9\-]{0,50}$/gi;

// @ts-expect-error getInstance() return type is unexpected but not incorrect
export class HubHandler
	extends ItemHandler<HubItem>
	implements HubItem
{
	public typeId: string = KnownItemType.Hub;

	public static async getInstance(opts: HubItemOpts): Promise<HubHandler>
	{
		const instance = new HubHandler(opts);

		await instance.load();

		return instance;
	}

	constructor(opts: HubItemOpts)
	{
		super(opts);

		this.setDefinition({
			definitionId: 'e40c4ab1-a490-408a-94f6-b5410b4779c6'
		});
	}

	get title(): Nullable<string>
	{
		return this.data.title;
	}

	set title(value: unknown)
	{
		this.setIfValid({
			key: 'title',
			value,
			validator: (val) => ((typeof val === 'string') && val.length <= 200)
		});
	}

	get pageIds(): Nullable<UUID[]>
	{
		return this.data.pageIds;
	}

	set pageIds(value: unknown)
	{
		this.setIfValid({
			key: 'pageIds',
			value,
			validator: (val) => (Array.isArray(val) && val.every(isUuid))
		});
	}

	get slug(): Nullable<string>
	{
		return this.data.slug;
	}

	set slug(value: unknown)
	{
		this.setIfValid({
			key: 'slug',
			value,
			validator: (val) => (
				(typeof val === 'string') &&
				val.length <= 50 &&
				/^[a-z0-9\-]{0,50}$/.test(val)
			)
		});
	}

	get defaultPageId(): Nullable<UUID>
	{
		return this.data.defaultPageId;
	}

	set defaultPageId(value: unknown)
	{
		this.setIfValid({
			key: 'defaultPageId',
			value,
			validator: (val) => ((typeof val === 'string') && isUuid(val))
		});
	}

	public getData(): HubItem
	{
		return {
			...super.getData(),
			title: this.title,
			slug: this.slug,
			pageIds: this.pageIds,
			defaultPageId: this.defaultPageId,
		};
	}

	public setData(data: Partial<HubItem>): void
	{
		if(!isPopulatedObject(data))
		{
			return;
		}

		try
		{
			super.setData({});

			this.typeId = KnownItemType.Hub;
			this.title = data.title;
			this.slug = data.slug;
			this.pageIds = data.pageIds;
			this.defaultPageId = data.defaultPageId;
		}
		catch(e)
		{
			console.error(e, data);
		}
	}
}
