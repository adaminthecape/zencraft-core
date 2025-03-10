import { FirebaseAuth, FirebaseAuthOpts } from './FirebaseAuth';
import { collection, getFirestore, doc, addDoc, setDoc, initializeFirestore, getDoc, query, where, or, and, QueryCompositeFilterConstraint, QueryConstraint, getDocs, deleteDoc } from '@firebase/firestore';
import { UUID } from '../../types/generic';
import { FirebaseApp } from '@firebase/app';
import { Item } from '../Items/GenericItem';
import { GenericDatabase } from '../Database/GenericDatabase';
import { DbFilters, isGroupFilter } from '../Database/DbFilters';
import { isPopulatedObject, removeUndefined } from '../../utils/tools';
import { DbPaginationOpts, PaginatedItemResponse } from '../Database/Pagination';

export type FirebaseRTDBOpts = {
	isDebugMode?: boolean;
	auth: FirebaseAuth | FirebaseAuthOpts;
};

export type FirebaseDbInstance = ReturnType<typeof getFirestore>;

// This cannot be an instance variable, or it doesn't work
let dbInstance: FirebaseDbInstance,
	appInstance: FirebaseApp;

function getFirestoreInstance(app?: FirebaseApp): FirebaseDbInstance | undefined
{
	if(dbInstance)
	{
		return dbInstance;
	}

	if(!app) return undefined;

	// app already initialised by FirebaseAuth
	// appInstance = initializeFirestore(app, {});

	dbInstance = getFirestore(app);

	return dbInstance;
}

export class FirebaseRTDB extends GenericDatabase
{
	protected dbInstance: ReturnType<typeof getFirestore> | undefined;
	protected auth: FirebaseAuth;

	// public static async getInstance(
	// 	opts: FirebaseRTDBOpts
	// ): Promise<FirebaseRTDB>
	// {
	// 	const instance = new FirebaseRTDB(opts);

	// 	console.log('RTDB: getInstance: authorizing');

	// 	await instance.auth.authorize();

	// 	return instance;
	// }

	protected static getPaths(opts: {
		table: string;
		path: string;
		dbName: string;
	}): { basePath: string; fullPath: string; updatedPath: string; }
	{
		const basePath = `${opts.dbName}/${opts.table}`;
		const fullPath = `${basePath}/${opts.path.split('.').join('/')}`;
		const updatedPath = `${basePath}/updated`;

		return { basePath, fullPath, updatedPath };
	}

	constructor(opts: FirebaseRTDBOpts)
	{
		super(opts);

		this.isDebugMode = !!opts.isDebugMode;

		if(opts.auth instanceof FirebaseAuth)
		{
			this.auth = opts.auth;
		}
		else if(
			isPopulatedObject(opts.auth) &&
			'userAccount' in opts.auth
		)
		{
			this.auth = new FirebaseAuth({
				userAccount: opts.auth.userAccount
			});
		}
		else
		{
			throw new Error('No auth available in RTDB');
		}
	}

	protected async getDb(): Promise<ReturnType<typeof getFirestore> | undefined>
	{
		if(!this.auth.isInitialised)
		{
			await this.auth.authorize();
		}

		if(!dbInstance)
		{
			return getFirestoreInstance(this.auth.getData().app);
		}

		return dbInstance;

		// the rest of this is _supposed_ to work, but storing the database in the
		// instance seems to make it all go wrong, so we have to just use this way

		// if(this.dbInstance)
		// {
		//   return this.dbInstance;
		// }

		// await this.auth.authorize();

		// this.dbInstance = getDatabase();

		// let interval: any;

		// const isReady = (db: any) => (db?._instanceStarted === true);

		// console.log('Resolving database ...');

		// await Promise.race([
		//   new Promise((resolve, reject) =>
		//   {
		//     setTimeout(() =>
		//     {
		//       if(interval)
		//       {
		//         clearInterval(interval);
		//       }

		//       resolve(false);
		//     }, 10000);
		//   }),
		//   new Promise((resolve, reject) =>
		//   {
		//     interval = setInterval(() =>
		//     {
		//       if(isReady(this.dbInstance))
		//       {
		//         clearInterval(interval);
		//         resolve(true);
		//       }
		//     }, 50);
		//   }),
		// ]);

		// console.log('FirebaseRTDB::getDb() instance:', this.dbInstance);

		// if(!isReady(this.dbInstance))
		// {
		//   throw new Error('Failed to resolve db instance');
		// }

		// return this.dbInstance;
	}

	/** @deprecated */
	public async watch(opts: {
		rootPath: string;
		withResult: (result: any) => void;
	})
	{
		// const { rootPath, withResult } = opts;

		// if(typeof withResult !== 'function')
		// {
		// 	console.warn('readFromFirebaseDb: Change handler required!');

		// 	return;
		// }

		// if(this.isDebugMode)
		// {
		// 	console.warn('readFromFirebaseDb:', rootPath);
		// }
		// else
		// {
		// 	const dbInstance = await this.getDb();

		// 	const dbRef = ref(dbInstance, rootPath);

		// 	onValue(dbRef, (snapshot: any) =>
		// 	{
		// 		withResult(snapshot.val());
		// 	});
		// }
	}

	public async update<T extends Item = Item>(opts: {
		tableName?: string;
		itemId: UUID;
		itemType: string;
		path?: string | undefined;
		data: T;
		setUpdated?: boolean;
	})
	{
		const { itemType, itemId, path, data } = opts;

		const dataToUpdate = removeUndefined(data);

		if(!isPopulatedObject(dataToUpdate))
		{
			console.warn(`Cannot update processed data for item ${itemId}`);

			return;
		}

		const dbInstance = await this.getDb();

		if(!dbInstance)
		{
			throw new Error(`Failed to insert item id "${itemId}": No DB found`);
		}

		const docRef = path ?
			doc(dbInstance, itemType, itemId, ...path.split('.')) :
			doc(dbInstance, itemType, itemId);

		await setDoc<any, any>(docRef, dataToUpdate);
	}

	public async insert<T = unknown>(opts: {
		tableName?: string;
		itemId: string;
		itemType: string;
		data: T;
	}): Promise<void>
	{
		const { itemId, data, itemType } = opts;

		if(!(itemId && data && itemType))
		{
			throw new Error(`Failed to insert item id "${itemId}"`);
		}

		const dataToUpdate = removeUndefined(data);

		if(!isPopulatedObject(dataToUpdate))
		{
			console.warn(`Cannot insert processed data for item ${itemId}`);

			return;
		}

		const dbInstance = await this.getDb();

		if(!dbInstance)
		{
			throw new Error(`Failed to insert item id "${itemId}": No DB found`);
		}

		const colRef = collection(dbInstance, itemType);

		await addDoc(colRef, data);
	}

	public async select1r<T = unknown>(opts: {
		tableName?: string;
		itemId: UUID;
		itemType: string;
	}): Promise<T | undefined>
	{
		const { itemType, itemId } = opts;

		const dbInstance = await this.getDb();

		if(!dbInstance)
		{
			return undefined;
		}

		const docRef = doc(dbInstance, itemType, itemId);
		const docSnap = await getDoc(docRef);

		if(!docSnap.exists())
		{
			return undefined;
		}

		return docSnap.data() as T;
	}

	public async select<T = unknown>(opts: {
		itemId?: string;
		itemType: string;
		filters?: DbFilters;
	}): Promise<T | undefined>
	{
		const { results } = await this.selectMultiple({
			itemType: opts.itemType,
			itemIds: opts.itemId ? [opts.itemId] : undefined,
			filters: opts.filters,
			pagination: {
				page: 1,
				pageSize: 1
			}
		});

		return (results?.[0] || undefined) as T;
	}

	public async selectMultiple<T = unknown>(opts: {
		itemIds?: string[] | undefined;
		itemType: string;
		filters?: DbFilters;
		pagination?: DbPaginationOpts;
	}): Promise<PaginatedItemResponse<T>>
	{
		const { itemType, itemIds, filters, pagination } = opts;

		const response: PaginatedItemResponse<T> = {
			results: [],
			hasMore: false,
			totalItems: 0,
			pagination: pagination || {}
		};

		if(!(itemType))
		{
			return response;
		}

		if(this.isDebugMode)
		{
			return response;
		}

		console.log(`Firestore: select: ${itemType} / ${itemIds?.join(',')}`);

		const dbInstance = await this.getDb();

		if(!dbInstance)
		{
			return response;
		}

		const colRef = collection(dbInstance, itemType);

		const wheres: Array<(
			QueryCompositeFilterConstraint |
			QueryConstraint |
			any
		)> = [];

		if(Array.isArray(filters) && filters.length)
		{
			const convertFilterToFirebase = (filter: DbFilters[number]): Array<any> =>
			{
				if(isGroupFilter(filter))
				{
					if(filter.group === 'or')
					{
						return [
							or(...(filter.children.map((f) => convertFilterToFirebase(f)).flat()))
						]
					}
					else if(filter.group === 'and')
					{
						return [
							and(...(filter.children.map((f) => convertFilterToFirebase(f)).flat()))
						]
					}
				}
				else if(filter.key && filter.operator)
				{
					let valueToUse = filter.value;

					// if it's a number, make it a number, or search will fail
					if(
						valueToUse &&
						typeof valueToUse === 'string' &&
						`${parseInt(valueToUse, 10)}` === valueToUse
					)
					{
						valueToUse = parseInt(valueToUse, 10);
					}

					return [
						where(
							filter.key,
							filter.operator as any,
							valueToUse
						)
					];
				}

				return [];
			};

			filters.forEach((filter) =>
			{
				wheres.push(...convertFilterToFirebase(filter));
			});
		}

		const q = query(colRef, ...wheres);

		const qSnap = await getDocs(q);

		const results: Record<string, T> = {};

		qSnap.forEach((doc: any) =>
		{
			if(typeof doc.id === 'string')
			{
				results[doc.id] = { ...doc.data() };
			}
		});

		response.results = Object.values(results) as Array<T>;

		return response;
	}

	public async remove(opts: {
		tableName: string;
		itemId: UUID | string;
		itemType: string;
	}): Promise<void>
	{
		const { tableName, itemId } = opts;

		const dbInstance = await this.getDb();

		if(!dbInstance)
		{
			throw new Error(`Cannot delete ${itemId}: No db available`);
		}

		const docRef = doc(dbInstance, tableName, itemId);
		const docSnap = await getDoc(docRef);

		if(!docSnap.exists())
		{
			throw new Error(`Cannot delete ${itemId}: Does not exist`);
		}

		await deleteDoc(docRef);
	}
}
