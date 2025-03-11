import { initializeApp } from '@firebase/app';
import { getAuth, signInWithEmailAndPassword, User, UserCredential } from '@firebase/auth';
import { generateUuid } from '../../utils/uuid';
import { isPopulatedObject } from '../../utils/generic';
import { configDotenv } from 'dotenv';

export type FirebaseConfig = {
	apiKey: string;
	authDomain: `${string}.firebaseapp.com`;
	databaseURL: `https://${string}.firebaseio.com`;
	projectId: string;
	storageBucket: string;
	messagingSenderId: `${number}`;
	appId: string;
};
export type UserCredentials = {
	email: string;
	password: string;
};
export type UserAuth = {
	accessToken: string | undefined;
	expires: number | undefined;
};
export type FirebaseAuthOpts = {
	userAccount: UserCredentials;
	customConfig?: FirebaseConfig;
	isDebugMode?: boolean;
};

export class FirebaseAuth
{
	private isDebugMode = false;
	private userAccount?: UserCredentials;
	private user?: User;
	public isInitialised: boolean;
	public isAuthorising: boolean;
	private authWaitInterval: ReturnType<typeof setInterval> | undefined;
	private app: any;
	private token: string | undefined;
	private config: FirebaseConfig;
	private instanceDebugId: string = generateUuid().split('-')[0];

	// accept credentials && service account
	// provide: login, logout, authenticate, generate token, verify token
	constructor(opts: FirebaseAuthOpts)
	{
		this.isDebugMode = !!opts.isDebugMode;
		this.userAccount = opts.userAccount;
		this.isInitialised = false;
		this.isAuthorising = false;

		if(opts.customConfig)
		{
			this.config = opts.customConfig;
		}
		else
		{
			configDotenv();

			this.config = {
				apiKey: process.env.FIREBASE_API_KEY,
				authDomain: process.env.FIREBASE_AUTH_DOMAIN,
				databaseURL: process.env.FIREBASE_DATABASE_URL,
				projectId: process.env.FIREBASE_PROJECT_ID,
				storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
				messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
				appId: process.env.FIREBASE_APP_ID,
			} as FirebaseConfig;
		}
	}

	protected $log(...msgs: any[])
	{
		console.log(`FirebaseAuth ${this.instanceDebugId}:`, ...msgs);
	}

	private validateCredentials(credentials: unknown)
	{
		try
		{
			if(!isPopulatedObject(credentials))
			{
				return false;
			}

			if(!credentials)
			{
				throw new Error('No credentials found.');
			}

			if(!credentials.accessToken)
			{
				throw new Error('Access token missing or invalid.');
			}

			if(
				typeof credentials.expires === 'number' &&
				(credentials.expires < Date.now())
			)
			{
				throw new Error('Access token is expired.');
			}

			return true;
		}
		catch(e)
		{
			console.warn(e);

			return false;
		}
	}

	private async login(user: UserCredentials): Promise<User | undefined>
	{
		this.$log('login');
		if(this.isDebugMode)
		{
			console.warn('Authentication (DEBUG):', user?.email);

			return undefined;
		}

		console.log('logging in...');

		const auth = getAuth();

		return new Promise((resolve, reject) =>
		{
			signInWithEmailAndPassword(auth, user.email, user.password)
				.then((userCredential: UserCredential) =>
				{
					console.log(`logged in as ${user.email}`);
					// Signed in
					resolve(userCredential.user);
				})
				.catch((error: Error) =>
				{
					console.error(error);
					reject(undefined);
				});
		});
	}

	private async getToken(): Promise<string | undefined>
	{
		try
		{
			// if no existing valid token, try to get a new one
			if(!this.user || !this.validateCredentials(this.user))
			{
				console.warn('User not verified:', this.userAccount?.email);

				return undefined;
			}

			// return the token
			return this.user.accessToken;
		}
		catch(e)
		{
			console.error(e);

			return undefined;
		}
	}

	private async waitUntilCurrentRequestIsDone(): Promise<void>
	{
		return new Promise((resolve, reject) =>
		{
			if(this.authWaitInterval)
			{
				clearInterval(this.authWaitInterval);
			}

			this.authWaitInterval = setInterval(() =>
			{
				if(!this.isAuthorising)
				{
					clearInterval(this.authWaitInterval);
					resolve();
				}
			}, 250);
		});
	}

	public async authorize(): Promise<void>
	{
		if(this.isInitialised || !this.config)
		{
			return;
		}

		if(this.isAuthorising)
		{
			// wait until current request is done
			this.$log('Aborting duplicate request');

			return this.waitUntilCurrentRequestIsDone();
		}

		this.isAuthorising = true;

		console.log('initializeApp(<config>)');

		this.app = initializeApp(this.config);

		if(!this.userAccount)
		{
			throw new Error('No user account found');
		}

		if(!this.token)
		{
			this.user = await this.login(this.userAccount);

			if(!this.user)
			{
				return;
			}

			this.token = await this.getToken();
		}

		this.isInitialised = true;
		this.isAuthorising = false;
	}

	public getData(): { app: FirebaseAuth['app']; user: UserAuth; }
	{
		return {
			app: this.app,
			user: {
				accessToken: this.user?.accessToken,
				expires: this.user?.expires
			}
		};
	}
}
