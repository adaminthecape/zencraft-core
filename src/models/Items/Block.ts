import { KnownItemType, Nullable } from '../../types/generic';
import { isUuid } from '../../utils/generic';
import { isPopulatedObject } from '../../utils/tools';
import { BlueprintItem } from '../Archetypes/Blueprint';
import { ItemOpts, Item, ItemHandler } from './GenericItem';

export type BlockItemOpts = ItemOpts;

/**
 * A record of a Block and its position in the matrix.
 * A simple Block might not need positions, but e.g. a table might need to know
 * where to put which block in which column and/or row.
 */
export type ChildBlockPosition = {
	/** ID of the Block to render */
	id: BlockItem['id'];
	/** Horizontal (X) position */
	row?: number;
	/** Vertical (Y) position */
	col?: number;
};

export type BlockItemCustomProperties = {
	title: Nullable<string>;
	blueprintId: Nullable<BlueprintItem['id']>;
	childBlocks: Nullable<ChildBlockPosition[]>;
	customStyles: Nullable<Record<string, (string | number)>>;
	customClasses: Nullable<string[]>;
	/**
	 * Block config data is defined by the Blueprint and could be any object
	 * matching its definition's field structure.
	 */
	config: Nullable<Record<string, unknown>>;
};

export type BlockItem = Item & BlockItemCustomProperties;

export type BlockPositionKey = `pos-${number}-${number}`;

// @ts-expect-error getInstance() return type is unexpected but not incorrect
export class BlockHandler
	extends ItemHandler<BlockItem>
	implements BlockItem
{
	public typeId: string = KnownItemType.Block;

	public static async getInstance(opts: BlockItemOpts): Promise<BlockHandler>
	{
		const instance = new BlockHandler(opts);

		await instance.load();

		return instance;
	}

	public static findNextAvailableNumber(arr: number[]): number | undefined
	{
		const min = Math.min(...arr);

		if(min > 0)
		{
			return 0;
		}

		return arr.reduce((acc: number, num) =>
		{
			if((num - 1) === acc)
			{
				// not a match
				return acc + 1;
			}

			return acc;
		}, min ?? -1);
	}

	public static getExistingColsAndRows(
		blocks: Nullable<BlockItemCustomProperties['childBlocks']>
	): ({
		existingCols: number[];
		existingRows: number[];
	})
	{
		return (blocks || []).reduce((
			agg,
			entry: ChildBlockPosition
		) =>
		{
			if(entry.col)
			{
				agg.existingCols.push(entry.col);
			}

			if(entry.row)
			{
				agg.existingRows.push(entry.row);
			}

			return agg;
		},
			{
				existingCols: [],
				existingRows: [],
			} as ({
				existingCols: number[];
				existingRows: number[];
			}));
	}

	public static getPositionsMap(
		childBlocks: Array<ChildBlockPosition>
	): Record<BlockPositionKey, string>
	{
		if(!(Array.isArray(childBlocks) && childBlocks.length))
		{
			return {};
		}

		return childBlocks.reduce((
			agg: Record<BlockPositionKey, string>,
			pos
		) =>
		{
			if(pos?.id && (pos.row || (pos.row == 0)) && (pos.col || (pos.col == 0)))
			{
				agg[`pos-${pos.col}-${pos.row}`] = pos.id;
			}

			return agg;
		}, {});
	}

	public static mapPositionsToArray(
		positions: Record<BlockPositionKey, string>
	): Array<ChildBlockPosition>
	{
		if(!isPopulatedObject(positions))
		{
			return [];
		}

		return Object.keys(positions).reduce((
			agg: Array<ChildBlockPosition>,
			posKey: string
		) =>
		{
			const [, col, row] = posKey.split('-');

			agg.push({
				id: positions[posKey as BlockPositionKey],
				col: parseInt(col, 10),
				row: parseInt(row, 10),
			});

			return agg;
		}, []);
	}

	public static addChildBlock(opts: ChildBlockPosition & {
		existingChildBlocks?: BlockItemCustomProperties['childBlocks'];
	}): BlockItemCustomProperties['childBlocks']
	{
		const { id, existingChildBlocks } = opts;
		let { col, row } = opts;
		const blocks: BlockItemCustomProperties['childBlocks'] = [];

		if(Array.isArray(existingChildBlocks))
		{
			blocks.push(...existingChildBlocks);
		}

		const positions = BlockHandler.getPositionsMap(blocks);

		const colValid = Number.isInteger(parseInt(`${col}`, 10));
		const rowValid = Number.isInteger(parseInt(`${row}`, 10));

		col = colValid ? parseInt(`${col}`, 10) : 0;
		row = rowValid ? parseInt(`${row}`, 10) : 0;

		// keeping whatever column is selected, increment row until empty row found

		let pos = positions[`pos-${col}-${row}`];

		// increment the row until we find an empty one
		while(pos && (row < 100))
		{
			row += 1;
			pos = positions[`pos-${col}-${row}`];
		}

		positions[`pos-${col}-${row}`] = id;

		return BlockHandler.mapPositionsToArray(positions);
	}

	constructor(opts: BlockItemOpts)
	{
		super(opts);
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

	get blueprintId(): Nullable<BlueprintItem['id']>
	{
		return this.data.blueprintId;
	}

	set blueprintId(value: unknown)
	{
		this.setIfValid({
			key: 'blueprintId',
			value,
			validator: isUuid
		});
	}

	get childBlocks(): Nullable<ChildBlockPosition[]>
	{
		return this.data.childBlocks;
	}

	set childBlocks(value: unknown)
	{
		if(Array.isArray(value))
		{
			value = value.filter((v) => (isPopulatedObject(v) && v.id));
		}

		this.setIfValid({
			key: 'childBlocks',
			value,
			validator: (val) => (Array.isArray(val) && val.every((v) =>
			{
				return (
					(v === null) ||
					isPopulatedObject(v) &&
					Object.keys(v).every((key) => (['id', 'row', 'col'].includes(key))) &&
					'id' in v &&
					(!v.id || isUuid(v.id))
				);
			}))
		});
	}

	get customClasses(): Nullable<string[]>
	{
		return this.data.customClasses;
	}

	set customClasses(value: unknown)
	{
		this.setIfValid({
			key: 'customClasses',
			value,
			validator: (val) => (typeof val === 'string'),
			// validator: (val) => (Array.isArray(val) && val.every((v) => typeof v === 'string')),
		});
	}

	get customStyles(): Nullable<Record<string, (string | number)>>
	{
		return this.data.customStyles;
	}

	set customStyles(value: unknown)
	{
		this.setIfValid({
			key: 'customStyles',
			value,
			validator: (val) => (typeof val === 'string'),
			// validator: (val) => (isPopulatedObject(val)),
		});
	}

	get config(): Nullable<Record<string, unknown>>
	{
		return this.data.config;
	}

	set config(value: unknown)
	{
		// repeaters have array values, but can contain only one entry for config
		if(Array.isArray(value))
		{
			[value] = value;
		}

		this.setIfValid({
			key: 'config',
			value,
			validator: (val) => (isPopulatedObject(val))
		});
	}

	public getData(): BlockItem
	{
		return {
			...super.getData(),
			title: this.title,
			blueprintId: this.blueprintId,
			childBlocks: this.childBlocks,
			customStyles: this.customStyles,
			customClasses: this.customClasses,
			config: this.config
		};
	}

	public setData(data: Partial<BlockItem>): void
	{
		if(!isPopulatedObject(data))
		{
			return;
		}

		try
		{
			super.setData({});

			this.typeId = KnownItemType.Block;
			this.title = data.title;
			this.blueprintId = data.blueprintId;
			this.childBlocks = data.childBlocks;
			this.customStyles = data.customStyles;
			this.customClasses = data.customClasses;
			this.config = data.config;
		}
		catch(e)
		{
			console.error(e, data);
		}
	}
}
