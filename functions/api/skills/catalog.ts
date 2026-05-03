// GET /api/skills/catalog — return skill catalog
import { Env, json, options } from '../_helpers';

export const onRequestOptions: PagesFunction<Env> = async () => options();

export const onRequestGet: PagesFunction<Env> = async () => {
  // Static skill catalog — same structure the frontend expects
  return json([
    {
      category: 'Cloud & Infrastructure',
      tags: [
        { name: 'Azure', skills: [
          { id: 'az01', name: 'azure_list_vms', description: 'List Azure Virtual Machines' },
          { id: 'az02', name: 'azure_get_metrics', description: 'Get Azure resource metrics' },
        ]},
        { name: 'AWS', skills: [
          { id: 'aws01', name: 'aws_list_ec2', description: 'List EC2 instances' },
          { id: 'aws02', name: 'aws_s3_list', description: 'List S3 buckets' },
        ]},
      ],
    },
    {
      category: 'Communication',
      tags: [
        { name: 'Slack', skills: [
          { id: 'sl01', name: 'slack_send_message', description: 'Send Slack message' },
          { id: 'sl02', name: 'slack_list_channels', description: 'List Slack channels' },
        ]},
        { name: 'Email', skills: [
          { id: 'em01', name: 'send_email', description: 'Send email via SMTP' },
        ]},
      ],
    },
    {
      category: 'ITSM & Ticketing',
      tags: [
        { name: 'Jira', skills: [
          { id: 'jr01', name: 'jira_create_issue', description: 'Create Jira issue' },
          { id: 'jr02', name: 'jira_search', description: 'Search Jira issues' },
        ]},
        { name: 'ServiceNow', skills: [
          { id: 'sn01', name: 'snow_create_incident', description: 'Create ServiceNow incident' },
        ]},
      ],
    },
    {
      category: 'Data & Analytics',
      tags: [
        { name: 'Database', skills: [
          { id: 'db01', name: 'sql_query', description: 'Run SQL query' },
          { id: 'db02', name: 'mongo_query', description: 'Run MongoDB query' },
        ]},
        { name: 'Web', skills: [
          { id: 'wb01', name: 'web_scraper', description: 'Scrape web pages' },
          { id: 'wb02', name: 'api_call', description: 'Make REST API call' },
        ]},
      ],
    },
  ]);
};
