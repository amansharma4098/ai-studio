// GET /api/api-keys/scopes — list available scopes
import { json, options } from '../_helpers';

export const onRequestOptions: PagesFunction = async () => options();

export const onRequestGet: PagesFunction = async () => {
  return json([
    { id: 'agents:read', name: 'Read Agents', description: 'List and view agents' },
    { id: 'agents:write', name: 'Write Agents', description: 'Create, update, delete agents' },
    { id: 'agents:run', name: 'Run Agents', description: 'Execute agent runs' },
    { id: 'threads:read', name: 'Read Threads', description: 'List and view threads' },
    { id: 'threads:write', name: 'Write Threads', description: 'Create threads and send messages' },
    { id: 'skills:read', name: 'Read Skills', description: 'List and view skills' },
    { id: 'skills:write', name: 'Write Skills', description: 'Create and manage skills' },
    { id: 'credentials:read', name: 'Read Credentials', description: 'List credentials' },
    { id: 'credentials:write', name: 'Write Credentials', description: 'Manage credentials' },
    { id: 'documents:read', name: 'Read Documents', description: 'List and query documents' },
    { id: 'documents:write', name: 'Write Documents', description: 'Upload and delete documents' },
    { id: 'workflows:read', name: 'Read Workflows', description: 'List workflows' },
    { id: 'workflows:write', name: 'Write Workflows', description: 'Create and run workflows' },
    { id: 'monitoring:read', name: 'Read Monitoring', description: 'View runs and stats' },
    { id: 'teams:manage', name: 'Manage Teams', description: 'Create and manage teams' },
    { id: 'billing:read', name: 'Read Billing', description: 'View billing and usage' },
  ]);
};
