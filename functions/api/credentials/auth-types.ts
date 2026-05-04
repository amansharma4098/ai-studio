// GET /api/credentials/auth-types — list credential auth types
import { json, options } from '../_helpers';

export const onRequestOptions: PagesFunction = async () => options();

export const onRequestGet: PagesFunction = async () => {
  return json([
    {
      category: 'Cloud Platforms',
      types: [
        { id: 'azure_sp', name: 'Azure Service Principal', fields: ['tenant_id', 'client_id', 'client_secret'] },
        { id: 'aws_iam', name: 'AWS IAM Credentials', fields: ['access_key_id', 'secret_access_key', 'region'] },
        { id: 'gcp_sa', name: 'GCP Service Account', fields: ['project_id', 'service_account_json'] },
      ],
    },
    {
      category: 'Communication',
      types: [
        { id: 'slack_bot', name: 'Slack Bot Token', fields: ['bot_token', 'signing_secret'] },
        { id: 'smtp', name: 'SMTP Email', fields: ['host', 'port', 'username', 'password'] },
        { id: 'teams_webhook', name: 'MS Teams Webhook', fields: ['webhook_url'] },
      ],
    },
    {
      category: 'DevOps & ITSM',
      types: [
        { id: 'jira_api', name: 'Jira API Token', fields: ['domain', 'email', 'api_token'] },
        { id: 'github_pat', name: 'GitHub PAT', fields: ['token'] },
        { id: 'servicenow', name: 'ServiceNow', fields: ['instance_url', 'username', 'password'] },
      ],
    },
    {
      category: 'Databases',
      types: [
        { id: 'postgres', name: 'PostgreSQL', fields: ['host', 'port', 'database', 'username', 'password'] },
        { id: 'mongodb', name: 'MongoDB', fields: ['connection_string'] },
        { id: 'sql_server', name: 'SQL Server', fields: ['host', 'port', 'database', 'username', 'password'] },
      ],
    },
    {
      category: 'AI Providers',
      types: [
        { id: 'openai', name: 'OpenAI API Key', fields: ['api_key'] },
        { id: 'anthropic', name: 'Anthropic API Key', fields: ['api_key'] },
        { id: 'google_ai', name: 'Google AI API Key', fields: ['api_key'] },
      ],
    },
    {
      category: 'Generic',
      types: [
        { id: 'api_key', name: 'API Key', fields: ['api_key'] },
        { id: 'basic_auth', name: 'Basic Auth', fields: ['username', 'password'] },
        { id: 'bearer_token', name: 'Bearer Token', fields: ['token'] },
        { id: 'oauth2', name: 'OAuth2', fields: ['client_id', 'client_secret', 'token_url', 'scope'] },
      ],
    },
  ]);
};
