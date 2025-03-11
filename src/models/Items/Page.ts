import { KnownItemType, Nullable, UUID } from '../../types/generic';
import { isPopulatedObject } from '../../utils/tools';
import { isUuid } from '../../utils/uuid';
import { ItemOpts, Item, ItemHandler } from './GenericItem';

export type PageItemOpts = ItemOpts;

export type PageItem = Item & {
	title: Nullable<string>;
	slug: Nullable<string>;
	blockIds: Nullable<UUID[]>;
};

// @ts-expect-error getInstance() return type is unexpected but not incorrect
export class PageHandler
	extends ItemHandler<PageItem>
	implements PageItem
{
	public typeId: string = KnownItemType.Page;

	public static async getInstance(opts: PageItemOpts): Promise<PageHandler>
	{
		const instance = new PageHandler(opts);

		await instance.load();

		return instance;
	}

	constructor(opts: PageItemOpts)
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

	get blockIds(): Nullable<UUID[]>
	{
		return this.data.blockIds;
	}

	set blockIds(value: unknown)
	{
		this.setIfValid({
			key: 'blockIds',
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

	public getData(): PageItem
	{
		return {
			...super.getData(),
			title: this.title,
			slug: this.slug,
			blockIds: this.blockIds,
		};
	}

	public setData(data: Partial<PageItem>): void
	{
		if(!isPopulatedObject(data))
		{
			return;
		}

		try
		{
			super.setData({});

			this.typeId = KnownItemType.Page;
			this.title = data.title;
			this.slug = data.slug;
			this.blockIds = data.blockIds;
		}
		catch(e)
		{
			console.error(e, data);
		}
	}
}
