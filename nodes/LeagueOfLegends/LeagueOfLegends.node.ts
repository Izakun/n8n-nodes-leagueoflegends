import {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
} from 'n8n-workflow';

/**
 * Platform hosts (used for summoner / spectator / league / champion-mastery).
 * e.g. euw1.api.riotgames.com
 */
const PLATFORMS = [
	{ name: 'Europe West', value: 'euw1' },
	{ name: 'Europe Nordic & East', value: 'eun1' },
	{ name: 'North America', value: 'na1' },
	{ name: 'Korea', value: 'kr' },
	{ name: 'Brazil', value: 'br1' },
	{ name: 'Japan', value: 'jp1' },
	{ name: 'Latin America North', value: 'la1' },
	{ name: 'Latin America South', value: 'la2' },
	{ name: 'Oceania', value: 'oc1' },
	{ name: 'Turkey', value: 'tr1' },
	{ name: 'Russia', value: 'ru' },
	{ name: 'Middle East', value: 'me1' },
	{ name: 'Philippines', value: 'ph2' },
	{ name: 'Singapore', value: 'sg2' },
	{ name: 'Thailand', value: 'th2' },
	{ name: 'Taiwan', value: 'tw2' },
	{ name: 'Vietnam', value: 'vn2' },
];

/**
 * Regional "continent" routing (used for account-v1 and match-v5).
 * e.g. europe.api.riotgames.com
 */
const PLATFORM_TO_CONTINENT: Record<string, string> = {
	na1: 'americas',
	br1: 'americas',
	la1: 'americas',
	la2: 'americas',
	euw1: 'europe',
	eun1: 'europe',
	tr1: 'europe',
	ru: 'europe',
	me1: 'europe',
	kr: 'asia',
	jp1: 'asia',
	oc1: 'sea',
	ph2: 'sea',
	sg2: 'sea',
	th2: 'sea',
	tw2: 'sea',
	vn2: 'sea',
};

function matchContinent(platform: string): string {
	return PLATFORM_TO_CONTINENT[platform] ?? 'europe';
}

function accountContinent(platform: string): string {
	// account-v1 only serves americas / asia / europe — fold SEA into asia.
	const c = PLATFORM_TO_CONTINENT[platform] ?? 'europe';
	return c === 'sea' ? 'asia' : c;
}

export class LeagueOfLegends implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'League of Legends',
		name: 'leagueOfLegends',
		icon: { light: 'file:logo.svg', dark: 'file:logo.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + " : " + $parameter["resource"]}}',
		description: 'Interact with the Riot Games / League of Legends API',
		usableAsTool: true,
		defaults: {
			name: 'League of Legends',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'riotGamesApi',
				required: true,
			},
		],
		properties: [
			// ----------------------------------
			//          Platform / Region
			// ----------------------------------
			{
				displayName: 'Platform',
				name: 'platform',
				type: 'options',
				options: PLATFORMS,
				default: 'euw1',
				description:
					'The game region of the player. Regional (continent) routing for account & match endpoints is derived automatically.',
			},

			// ----------------------------------
			//              Resource
			// ----------------------------------
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Champion Mastery', value: 'championMastery' },
					{ name: 'League (Ranked)', value: 'league' },
					{ name: 'Match', value: 'match' },
					{ name: 'Spectator (Current Game)', value: 'spectator' },
					{ name: 'Summoner', value: 'summoner' },
				],
				default: 'account',
			},

			// ----------------------------------
			//          Account operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get by Riot ID',
						value: 'getByRiotId',
						action: 'Get an account by game name and tag',
					},
					{
						name: 'Get by PUUID',
						value: 'getByPuuid',
						action: 'Get an account by PUUID',
					},
				],
				default: 'getByRiotId',
			},

			// ----------------------------------
			//          Summoner operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['summoner'] } },
				options: [
					{
						name: 'Get by PUUID',
						value: 'getByPuuid',
						action: 'Get a summoner by PUUID',
					},
				],
				default: 'getByPuuid',
			},

			// ----------------------------------
			//          Spectator operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['spectator'] } },
				options: [
					{
						name: 'Get Current Game',
						value: 'getCurrentGame',
						action: 'Get the active game a player is currently in',
					},
				],
				default: 'getCurrentGame',
			},

			// ----------------------------------
			//          Match operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['match'] } },
				options: [
					{
						name: 'Get Many (History)',
						value: 'getMany',
						action: 'Get many matches for a player',
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get full details of a match',
					},
					{
						name: 'Get Timeline',
						value: 'getTimeline',
						action: 'Get the timeline of a match',
					},
				],
				default: 'getMany',
			},

			// ----------------------------------
			//          League operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['league'] } },
				options: [
					{
						name: 'Get Ranked Entries',
						value: 'getEntries',
						action: 'Get the ranked entries of a player',
					},
				],
				default: 'getEntries',
			},

			// ----------------------------------
			//       Champion Mastery operations
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['championMastery'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get champion mastery for every champion of a player',
					},
					{
						name: 'Get Top',
						value: 'getTop',
						action: 'Get the top champion masteries of a player',
					},
				],
				default: 'getTop',
			},

			// ----------------------------------
			//              Fields
			// ----------------------------------
			{
				displayName: 'Game Name',
				name: 'gameName',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'Faker',
				description: 'The in-game name part of the Riot ID (the part before the #)',
				displayOptions: { show: { resource: ['account'], operation: ['getByRiotId'] } },
			},
			{
				displayName: 'Tag Line',
				name: 'tagLine',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'EUW',
				description: 'The tag part of the Riot ID (the part after the #), without the #',
				displayOptions: { show: { resource: ['account'], operation: ['getByRiotId'] } },
			},
			{
				displayName: 'PUUID',
				name: 'puuid',
				type: 'string',
				required: true,
				default: '',
				description: 'The encrypted PUUID of the player (get it via Account → Get by Riot ID)',
				displayOptions: {
					show: {
						resource: ['account', 'summoner', 'spectator', 'match', 'league', 'championMastery'],
						operation: [
							'getByPuuid',
							'getCurrentGame',
							'getMany',
							'getEntries',
							'getAll',
							'getTop',
						],
					},
				},
			},
			{
				displayName: 'Match ID',
				name: 'matchId',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'EUW1_1234567890',
				displayOptions: { show: { resource: ['match'], operation: ['get', 'getTimeline'] } },
			},

			// --- Match: Get Many ---
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: { show: { resource: ['match'], operation: ['getMany'] } },
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 50,
				description: 'Max number of results to return',
				displayOptions: {
					show: { resource: ['match'], operation: ['getMany'], returnAll: [false] },
				},
			},
			{
				displayName: 'Filters',
				name: 'matchFilters',
				type: 'collection',
				placeholder: 'Add Filter',
				default: {},
				displayOptions: { show: { resource: ['match'], operation: ['getMany'] } },
				options: [
					{
						displayName: 'Queue ID',
						name: 'queue',
						type: 'number',
						default: 420,
						description:
							'Filter by queue ID (e.g. 420 = Ranked Solo/Duo, 440 = Ranked Flex, 400 = Normal Draft). Cannot be combined with Type.',
					},
					{
						displayName: 'Type',
						name: 'type',
						type: 'options',
						default: 'ranked',
						options: [
							{ name: 'Ranked', value: 'ranked' },
							{ name: 'Normal', value: 'normal' },
							{ name: 'Tourney', value: 'tourney' },
							{ name: 'Tutorial', value: 'tutorial' },
						],
						description: 'Filter by match type. Cannot be combined with Queue ID.',
					},
					{
						displayName: 'Start Time (Epoch Seconds)',
						name: 'startTime',
						type: 'number',
						default: 0,
						description: 'Only matches started after this UNIX timestamp (in seconds)',
					},
					{
						displayName: 'End Time (Epoch Seconds)',
						name: 'endTime',
						type: 'number',
						default: 0,
						description: 'Only matches started before this UNIX timestamp (in seconds)',
					},
				],
			},

			// --- Champion Mastery: Get Top ---
			{
				displayName: 'Count',
				name: 'count',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 3,
				description: 'Number of top champions to return',
				displayOptions: { show: { resource: ['championMastery'], operation: ['getTop'] } },
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const request = async (
			host: string,
			endpoint: string,
			qs?: Record<string, string | number>,
		): Promise<unknown> => {
			const options: IHttpRequestOptions = {
				method: 'GET' as IHttpRequestMethods,
				baseURL: `https://${host}.api.riotgames.com`,
				url: endpoint,
				qs,
				json: true,
			};
			return this.helpers.httpRequestWithAuthentication.call(this, 'riotGamesApi', options);
		};

		for (let i = 0; i < items.length; i++) {
			try {
				const platform = this.getNodeParameter('platform', i) as string;
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				const param = <T>(name: string, fallback?: T) =>
					this.getNodeParameter(name, i, fallback as T) as T;

				// Sentinel returned by a handler to emit nothing for this item.
				const SKIP = Symbol('skip');

				const getCurrentGame = async (): Promise<unknown> => {
					const puuid = param<string>('puuid');
					try {
						return await request(platform, `/lol/spectator/v5/active-games/by-summoner/${puuid}`);
					} catch (error) {
						// Riot returns 404 when the player is simply not in a game right now.
						// That is an expected "no data" case, not a failure: emit nothing.
						const e = error as {
							httpCode?: unknown;
							statusCode?: unknown;
							response?: { statusCode?: unknown; status?: unknown };
							message?: string;
						};
						const status = String(
							e.httpCode ?? e.statusCode ?? e.response?.statusCode ?? e.response?.status ?? '',
						);
						if (status === '404' || (e.message ?? '').includes('404')) {
							return SKIP;
						}
						throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
					}
				};

				const getManyMatches = async (): Promise<unknown> => {
					const puuid = param<string>('puuid');
					const returnAll = param<boolean>('returnAll');
					const filters = param<{
						queue?: number;
						type?: string;
						startTime?: number;
						endTime?: number;
					}>('matchFilters', {});

					const baseQs: Record<string, string | number> = {};
					if (filters.queue) baseQs.queue = filters.queue;
					if (filters.type) baseQs.type = filters.type;
					if (filters.startTime) baseQs.startTime = filters.startTime;
					if (filters.endTime) baseQs.endTime = filters.endTime;

					const endpoint = `/lol/match/v5/matches/by-puuid/${puuid}/ids`;
					const continent = matchContinent(platform);
					let matchIds: string[] = [];

					if (returnAll) {
						const pageSize = 100;
						let start = 0;
						// Riot caps count at 100 per call, so page until a short page.
						// eslint-disable-next-line no-constant-condition
						while (true) {
							const page = (await request(continent, endpoint, {
								...baseQs,
								start,
								count: pageSize,
							})) as string[];
							matchIds = matchIds.concat(page);
							if (page.length < pageSize) break;
							start += pageSize;
						}
					} else {
						const limit = param<number>('limit');
						matchIds = (await request(continent, endpoint, {
							...baseQs,
							start: 0,
							count: Math.min(limit, 100),
						})) as string[];
						matchIds = matchIds.slice(0, limit);
					}

					// Returned as an array so the normaliser emits one item per match ID.
					return matchIds.map((matchId) => ({ matchId }));
				};

				const handlers: Record<string, () => Promise<unknown>> = {
					'account:getByRiotId': () =>
						request(
							accountContinent(platform),
							`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
								param<string>('gameName'),
							)}/${encodeURIComponent(param<string>('tagLine'))}`,
						),
					'account:getByPuuid': () =>
						request(
							accountContinent(platform),
							`/riot/account/v1/accounts/by-puuid/${param<string>('puuid')}`,
						),
					'summoner:getByPuuid': () =>
						request(platform, `/lol/summoner/v4/summoners/by-puuid/${param<string>('puuid')}`),
					'spectator:getCurrentGame': getCurrentGame,
					'league:getEntries': () =>
						request(platform, `/lol/league/v4/entries/by-puuid/${param<string>('puuid')}`),
					'championMastery:getTop': () =>
						request(
							platform,
							`/lol/champion-mastery/v4/champion-masteries/by-puuid/${param<string>('puuid')}/top`,
							{ count: param<number>('count') },
						),
					'championMastery:getAll': () =>
						request(
							platform,
							`/lol/champion-mastery/v4/champion-masteries/by-puuid/${param<string>('puuid')}`,
						),
					'match:get': () =>
						request(matchContinent(platform), `/lol/match/v5/matches/${param<string>('matchId')}`),
					'match:getTimeline': () =>
						request(
							matchContinent(platform),
							`/lol/match/v5/matches/${param<string>('matchId')}/timeline`,
						),
					'match:getMany': getManyMatches,
				};

				const handler = handlers[`${resource}:${operation}`];
				if (!handler) {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation: ${resource} / ${operation}`,
						{ itemIndex: i },
					);
				}

				const response = await handler();
				if (response === SKIP) {
					continue;
				}

				// Normalise: arrays -> one item per element, objects -> single item.
				if (Array.isArray(response)) {
					for (const element of response) {
						returnData.push({
							json: element as IDataObject,
							pairedItem: { item: i },
						});
					}
				} else {
					returnData.push({
						json: response as IDataObject,
						pairedItem: { item: i },
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
