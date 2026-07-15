import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class RiotGamesApi implements ICredentialType {
	name = 'riotGamesApi';

	displayName = 'Riot Games API';

	documentationUrl = 'https://developer.riotgames.com/';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your Riot API key (starts with "RGAPI-"). Get a development key at https://developer.riotgames.com/. Development keys expire every 24h — for production, request a "Personal" or "Production" key.',
		},
	];

	// Riot expects the key in the X-Riot-Token header on every request.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-Riot-Token': '={{$credentials.apiKey}}',
			},
		},
	};

	// Cheap authenticated endpoint used by n8n's "Test credential" button.
	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://euw1.api.riotgames.com',
			url: '/lol/status/v4/platform-data',
		},
	};
}
