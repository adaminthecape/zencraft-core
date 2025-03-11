import { SqlDatabase } from "./SqlDatabase";
import { FieldData } from "../Items/Field";
import { generateUuid } from "../../utils/uuid";

export type MigrationHandlerOpts = {
	db: SqlDatabase;
};

export type MigrationHandlerData = {};

export type SuccessResponse = {
	success: boolean;
	error?: string;
};

export class MigrationHandler
{
	protected id: string;
	protected db: SqlDatabase;

	constructor(opts: MigrationHandlerOpts)
	{
		this.id = generateUuid().split('-').shift() as string;
		this.db = opts.db;
	}

	protected log(source: string, ...msgs: unknown[]): void
	{
		console.log(`Migrator: ${this.id}: ${source}:`, ...msgs);
	}

	public async addTable(opts: {
		tableName: string;
		fieldDefinitions: FieldData[];
	}): Promise<SuccessResponse>
	{
		const wheres: string[] = [];
		const params: unknown[] = [];
		const query = '';

		this.log('addTable', { query, params });

		const response = await this.db.query(query, params);

		this.log('addTable', { response });

		return { success: true };
	}

	public async addColumnToTable(opts: {
		tableName: string;
		columnName: string;
		fieldDefinition: FieldData;
	}): Promise<SuccessResponse>
	{
		const wheres: string[] = [];
		const params: unknown[] = [];
		const query = '';

		this.log('addColumnToTable', { query, params });

		const response = await this.db.query(query, params);

		this.log('addColumnToTable', { response });

		return { success: true };
	}
}
