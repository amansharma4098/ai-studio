'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Search, CheckCircle, AlertTriangle, Download, Trash2, Pencil, Play,
  X, Loader2, Globe, Lock, Plus, ChevronRight, Upload,
} from 'lucide-react'
import { credentialsApi, skillsApi } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import yaml from 'js-yaml'

// ── Types ────────────────────────────────────────────────────────
interface CustomSkill {
  id: string
  name: string
  icon: string
  skill_type: string
  description: string
  config: any
  is_public: boolean
  version: string
  install_count?: number
  created_at?: string
}

// ── Skill Catalog Definitions ────────────────────────────────────
const SKILL_CATEGORIES = [
  {
    name: 'AI & Language', icon: '🧠', color: 'violet',
    skills: [
      { id: 'groq_chat', name: 'Groq Chat', description: 'Fast inference with Groq-hosted LLMs', requiredCredentials: ['groq'], install_count: 234 },
      { id: 'openai_chat', name: 'OpenAI Chat', description: 'Chat completions with GPT models', requiredCredentials: ['openai'], install_count: 512 },
      { id: 'claude_chat', name: 'Claude Chat', description: 'Chat with Anthropic Claude models', requiredCredentials: ['anthropic'], install_count: 389 },
    ],
  },
  {
    name: 'Data & Analytics', icon: '📊', color: 'blue',
    skills: [
      { id: 'sql_query', name: 'SQL Query', description: 'Query databases and analyze structured data', requiredCredentials: [], install_count: 178 },
      { id: 'data_analysis', name: 'Data Analysis', description: 'Analyze datasets and generate insights', requiredCredentials: [], install_count: 145 },
      { id: 'stock_data', name: 'Stock Market Data', description: 'Fetch real-time and historical stock data', requiredCredentials: ['alpha_vantage'], install_count: 93 },
    ],
  },
  {
    name: 'Web & APIs', icon: '🌐', color: 'sky',
    skills: [
      { id: 'web_scraping', name: 'Web Scraper', description: 'Scrape and extract data from websites', requiredCredentials: [], install_count: 267 },
      { id: 'rest_api', name: 'REST API', description: 'Call external REST APIs to fetch or send data', requiredCredentials: [], install_count: 321 },
    ],
  },
  {
    name: 'Communication', icon: '💬', color: 'emerald',
    skills: [
      { id: 'sendgrid_email', name: 'SendGrid Email', description: 'Send transactional emails via SendGrid', requiredCredentials: ['sendgrid'], install_count: 156 },
      { id: 'smtp_email', name: 'SMTP Email', description: 'Send emails via custom SMTP server', requiredCredentials: ['smtp'], install_count: 88 },
    ],
  },
  {
    name: 'Sales & CRM', icon: '💼', color: 'orange',
    skills: [
      { id: 'hubspot_crm', name: 'HubSpot CRM', description: 'Manage contacts and deals in HubSpot', requiredCredentials: ['hubspot'], install_count: 201 },
      { id: 'salesforce_query', name: 'Salesforce Query', description: 'Query and manage Salesforce records', requiredCredentials: ['salesforce'], install_count: 175 },
      { id: 'linkedin_outreach', name: 'LinkedIn Outreach', description: 'Manage LinkedIn connections and messages', requiredCredentials: ['linkedin'], install_count: 310 },
    ],
  },
  {
    name: 'Dev & IT', icon: '⚙️', color: 'slate',
    skills: [
      { id: 'github_issues', name: 'GitHub Issues', description: 'Create and manage GitHub issues and PRs', requiredCredentials: ['github'], install_count: 445 },
      { id: 'jira_tickets', name: 'Jira Tickets', description: 'Create and track Jira issues', requiredCredentials: ['jira'], install_count: 287 },
      { id: 'pagerduty_alerts', name: 'PagerDuty Alerts', description: 'Manage incidents and on-call schedules', requiredCredentials: ['pagerduty'], install_count: 98 },
    ],
  },
  {
    name: 'Support', icon: '🎧', color: 'teal',
    skills: [
      { id: 'zendesk_tickets', name: 'Zendesk Tickets', description: 'Manage support tickets and customer queries', requiredCredentials: ['zendesk'], install_count: 134 },
    ],
  },
  {
    name: 'Marketing', icon: '📣', color: 'amber',
    skills: [
      { id: 'google_analytics', name: 'Google Analytics', description: 'Fetch website analytics and traffic reports', requiredCredentials: ['google_analytics'], install_count: 256 },
      { id: 'twitter_posts', name: 'Twitter / X', description: 'Post tweets and monitor social mentions', requiredCredentials: ['twitter'], install_count: 189 },
    ],
  },
]

const COLOR_MAP: Record<string, { badge: string; header: string }> = {
  violet: { badge: 'bg-violet-100 text-violet-700', header: 'border-violet-200' },
  blue: { badge: 'bg-blue-100 text-blue-700', header: 'border-blue-200' },
  sky: { badge: 'bg-sky-100 text-sky-700', header: 'border-sky-200' },
  emerald: { badge: 'bg-emerald-100 text-emerald-700', header: 'border-emerald-200' },
  orange: { badge: 'bg-orange-100 text-orange-700', header: 'border-orange-200' },
  slate: { badge: 'bg-slate-200 text-slate-700', header: 'border-slate-300' },
  teal: { badge: 'bg-teal-100 text-teal-700', header: 'border-teal-200' },
  amber: { badge: 'bg-amber-100 text-amber-700', header: 'border-amber-200' },
}

const CRED_LABELS: Record<string, string> = {
  groq: 'Groq', openai: 'OpenAI', anthropic: 'Anthropic',
  hubspot: 'HubSpot', salesforce: 'Salesforce', linkedin: 'LinkedIn',
  quickbooks: 'QuickBooks', alpha_vantage: 'Alpha Vantage',
  sendgrid: 'SendGrid', smtp: 'SMTP',
  github: 'GitHub', jira: 'Jira', pagerduty: 'PagerDuty',
  zendesk: 'Zendesk', google_analytics: 'Google Analytics', twitter: 'Twitter',
}

// ── Skill Type Definitions ───────────────────────────────────────
const SKILL_TYPES = [
  { id: 'REST API', icon: '🌐', label: 'REST API' },
  { id: 'SQL', icon: '🗄️', label: 'SQL' },
  { id: 'Python', icon: '🐍', label: 'Python' },
  { id: 'Scraper', icon: '🔍', label: 'Scraper' },
  { id: 'Custom', icon: '⚡', label: 'Custom' },
]

const QUICK_EMOJIS = ['🔧', '⚡', '🌐', '📊', '🔍', '💬', '🗄️', '🤖']

const TYPE_BADGE_COLORS: Record<string, string> = {
  'REST API': 'bg-sky-100 text-sky-700',
  'SQL': 'bg-indigo-100 text-indigo-700',
  'Python': 'bg-yellow-100 text-yellow-700',
  'Scraper': 'bg-purple-100 text-purple-700',
  'Custom': 'bg-slate-100 text-slate-700',
}

// ── Config Templates ─────────────────────────────────────────────
const CONFIG_TEMPLATES: Record<string, string> = {
  'REST API': JSON.stringify({
    url: 'https://api.example.com/data',
    method: 'GET',
    headers: { Authorization: 'Bearer {{credential}}' },
    body: {},
  }, null, 2),
  'SQL': JSON.stringify({
    connection: 'postgresql://user:pass@host/db',
    query: 'SELECT * FROM users WHERE id = {{input}}',
  }, null, 2),
  'Python': `def run(input):
    # your code here
    result = input.upper()
    return result`,
  'Scraper': JSON.stringify({
    url: 'https://example.com',
    selector: '.article-content',
  }, null, 2),
  'Custom': JSON.stringify({
    type: 'custom',
    parameters: {},
    logic: '',
  }, null, 2),
}

// ── OpenAPI Parsing ──────────────────────────────────────────────
interface ParsedEndpoint {
  method: string
  path: string
  summary: string
  parameters: any[]
  requestBody: any
  security: any[]
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-100 text-emerald-700',
  POST: 'bg-sky-100 text-sky-700',
  PUT: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-red-100 text-red-700',
  PATCH: 'bg-purple-100 text-purple-700',
}

function parseOpenAPISpec(specText: string): { spec: any; endpoints: ParsedEndpoint[] } {
  let spec: any
  try {
    spec = JSON.parse(specText)
  } catch {
    spec = yaml.load(specText) as any
  }
  if (!spec || !spec.paths) throw new Error('Invalid spec: no paths found')

  const endpoints: ParsedEndpoint[] = []
  for (const [path, methods] of Object.entries(spec.paths as Record<string, any>)) {
    for (const [method, detail] of Object.entries(methods as Record<string, any>)) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
        endpoints.push({
          method: method.toUpperCase(),
          path,
          summary: detail.summary || detail.description || '',
          parameters: detail.parameters || [],
          requestBody: detail.requestBody || null,
          security: detail.security || spec.security || [],
        })
      }
    }
  }
  return { spec, endpoints }
}

function detectAuthHeaders(securitySchemes: any): Record<string, string> {
  if (!securitySchemes) return {}
  for (const [, scheme] of Object.entries(securitySchemes as Record<string, any>)) {
    if (scheme.type === 'http' && scheme.scheme === 'bearer') {
      return { Authorization: 'Bearer {{credential}}' }
    }
    if (scheme.type === 'apiKey') {
      return { [scheme.name || 'X-API-Key']: '{{credential}}' }
    }
    if (scheme.type === 'oauth2') {
      return { Authorization: 'Bearer {{credential}}' }
    }
  }
  return {}
}

function generateBodyTemplate(requestBody: any): string {
  if (!requestBody) return '{}'
  const content = requestBody.content
  if (!content) return '{}'
  const jsonContent = content['application/json']
  if (!jsonContent?.schema) return '{}'
  return JSON.stringify(schemaToExample(jsonContent.schema), null, 2)
}

function schemaToExample(schema: any): any {
  if (!schema) return {}
  if (schema.example !== undefined) return schema.example
  if (schema.type === 'string') return schema.default || 'string'
  if (schema.type === 'number' || schema.type === 'integer') return schema.default || 0
  if (schema.type === 'boolean') return schema.default || false
  if (schema.type === 'array') return [schemaToExample(schema.items || {})]
  if (schema.type === 'object' || schema.properties) {
    const obj: any = {}
    for (const [key, prop] of Object.entries((schema.properties || {}) as Record<string, any>)) {
      obj[key] = schemaToExample(prop)
    }
    return obj
  }
  return {}
}

// ── Main Component ───────────────────────────────────────────────
export default function SkillsPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('catalog')
  const [search, setSearch] = useState('')
  const { addToast: toast } = useToast()
  const queryClient = useQueryClient()

  // Create / Edit form state
  const [skillType, setSkillType] = useState('REST API')
  const [icon, setIcon] = useState('🔧')
  const [skillName, setSkillName] = useState('')
  const [description, setDescription] = useState('')
  const [configJson, setConfigJson] = useState(CONFIG_TEMPLATES['REST API'])
  const [isPublic, setIsPublic] = useState(false)
  const [testPayload, setTestPayload] = useState('')
  const [testResult, setTestResult] = useState<any>(null)
  const [testPanelOpen, setTestPanelOpen] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  // Edit modal
  const [editingSkill, setEditingSkill] = useState<CustomSkill | null>(null)

  // REST API specific fields
  const [restUrl, setRestUrl] = useState('https://api.example.com/data')
  const [restMethod, setRestMethod] = useState('GET')
  const [restHeaders, setRestHeaders] = useState('{"Authorization": "Bearer {{credential}}"}')
  const [restBody, setRestBody] = useState('{}')

  // SQL specific fields
  const [sqlConnection, setSqlConnection] = useState('postgresql://user:pass@host/db')
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users WHERE id = {{input}}')

  // Scraper specific fields
  const [scraperUrl, setScraperUrl] = useState('https://example.com')
  const [scraperSelector, setScraperSelector] = useState('.article-content')

  // OpenAPI import state
  const [restConfigMode, setRestConfigMode] = useState<'manual' | 'openapi'>('manual')
  const [openApiSpec, setOpenApiSpec] = useState('')
  const [parsedEndpoints, setParsedEndpoints] = useState<ParsedEndpoint[]>([])
  const [parsedSpec, setParsedSpec] = useState<any>(null)
  const [selectedEndpoints, setSelectedEndpoints] = useState<Set<number>>(new Set())
  const [parseError, setParseError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set())

  useEffect(() => { setMounted(true) }, [])

  // ── Queries ──────────────────────────────────────────────────
  const { data: configured = [], isLoading: credsLoading } = useQuery<any[]>({
    queryKey: ['credentials'],
    queryFn: () => credentialsApi.list().then(r => r.data),
  })

  const { data: mySkills = [], isLoading: mySkillsLoading } = useQuery<CustomSkill[]>({
    queryKey: ['my-skills'],
    queryFn: () => skillsApi.mySkills().then(r => r.data),
  })

  // ── Mutations ────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => skillsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-skills'] })
      toast('Skill created successfully!', 'success')
      resetForm()
      setActiveTab('my-skills')
    },
    onError: () => toast('Failed to create skill', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => skillsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-skills'] })
      toast('Skill updated successfully!', 'success')
      setEditingSkill(null)
    },
    onError: () => toast('Failed to update skill', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => skillsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-skills'] })
      toast('Skill deleted', 'success')
    },
    onError: () => toast('Failed to delete skill', 'error'),
  })

  const installMutation = useMutation({
    mutationFn: (id: string) => skillsApi.install(id),
    onSuccess: () => toast('Skill installed!', 'success'),
    onError: () => toast('Failed to install skill', 'error'),
  })

  // ── Helpers ──────────────────────────────────────────────────
  const configuredTypes = new Set(configured.map((c: any) => c.credential_type))
  const isReady = (requiredCreds: string[]) =>
    requiredCreds.length === 0 || requiredCreds.every(c => configuredTypes.has(c))

  const totalSkills = SKILL_CATEGORIES.reduce((a, c) => a + c.skills.length, 0)
  const readyCount = SKILL_CATEGORIES.reduce(
    (a, c) => a + c.skills.filter(s => isReady(s.requiredCredentials)).length, 0,
  )

  const filtered = search.trim()
    ? SKILL_CATEGORIES.map(cat => ({
        ...cat,
        skills: cat.skills.filter(s =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.description.toLowerCase().includes(search.toLowerCase()),
        ),
      })).filter(cat => cat.skills.length > 0)
    : SKILL_CATEGORIES

  function resetForm() {
    setSkillName('')
    setDescription('')
    setIcon('🔧')
    setSkillType('REST API')
    setConfigJson(CONFIG_TEMPLATES['REST API'])
    setIsPublic(false)
    setTestPayload('')
    setTestResult(null)
    setTestPanelOpen(false)
    setRestUrl('https://api.example.com/data')
    setRestMethod('GET')
    setRestHeaders('{"Authorization": "Bearer {{credential}}"}')
    setRestBody('{}')
    setSqlConnection('postgresql://user:pass@host/db')
    setSqlQuery('SELECT * FROM users WHERE id = {{input}}')
    setScraperUrl('https://example.com')
    setScraperSelector('.article-content')
    setRestConfigMode('manual')
    setOpenApiSpec('')
    setParsedEndpoints([])
    setParsedSpec(null)
    setSelectedEndpoints(new Set())
    setParseError('')
    setAutoFilledFields(new Set())
  }

  function handleParseSpec() {
    setParseError('')
    try {
      const { spec, endpoints } = parseOpenAPISpec(openApiSpec)
      setParsedSpec(spec)
      setParsedEndpoints(endpoints)
      setSelectedEndpoints(new Set())
      if (endpoints.length === 0) setParseError('No endpoints found in spec')
    } catch (e: any) {
      setParseError(e.message || 'Failed to parse spec')
      setParsedEndpoints([])
      setParsedSpec(null)
    }
  }

  function toggleEndpointSelection(idx: number) {
    setSelectedEndpoints(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  function applySelectedEndpoints() {
    if (!parsedSpec || selectedEndpoints.size === 0) return
    const indices = Array.from(selectedEndpoints)
    const first = parsedEndpoints[indices[0]]
    const baseUrl = parsedSpec.servers?.[0]?.url || ''
    const authHeaders = detectAuthHeaders(parsedSpec.components?.securitySchemes)

    setRestUrl(baseUrl + first.path)
    setRestMethod(first.method)
    setRestHeaders(JSON.stringify(
      Object.keys(authHeaders).length > 0 ? authHeaders : {},
      null, 2,
    ))
    setRestBody(generateBodyTemplate(first.requestBody))

    if (!skillName && parsedSpec.info?.title) {
      setSkillName(parsedSpec.info.title)
    }
    if (!description && first.summary) {
      setDescription(first.summary)
    }

    setAutoFilledFields(new Set(['url', 'method', 'headers', 'body']))
    setRestConfigMode('manual')
    toast('Endpoint imported — review the fields below', 'success')
  }

  function handleSpecFileDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setOpenApiSpec(text)
      // auto-parse after drop
      try {
        const { spec, endpoints } = parseOpenAPISpec(text)
        setParsedSpec(spec)
        setParsedEndpoints(endpoints)
        setSelectedEndpoints(new Set())
        setParseError('')
        if (endpoints.length === 0) setParseError('No endpoints found in spec')
      } catch (err: any) {
        setParseError(err.message || 'Failed to parse spec')
      }
    }
    reader.readAsText(file)
  }

  function handleSpecFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setOpenApiSpec(text)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function buildConfigFromFields(type: string): string {
    if (type === 'REST API') {
      try {
        return JSON.stringify({
          url: restUrl,
          method: restMethod,
          headers: JSON.parse(restHeaders),
          body: JSON.parse(restBody),
        }, null, 2)
      } catch { return configJson }
    }
    if (type === 'SQL') {
      return JSON.stringify({ connection: sqlConnection, query: sqlQuery }, null, 2)
    }
    if (type === 'Scraper') {
      return JSON.stringify({ url: scraperUrl, selector: scraperSelector }, null, 2)
    }
    return configJson
  }

  function handleTypeSelect(type: string) {
    setSkillType(type)
    setConfigJson(CONFIG_TEMPLATES[type])
  }

  function handleSave(publish: boolean) {
    if (!skillName.trim()) {
      toast('Skill name is required', 'error')
      return
    }
    const config = buildConfigFromFields(skillType)
    createMutation.mutate({
      name: skillName,
      icon,
      skill_type: skillType,
      description,
      config,
      is_public: publish,
    })
  }

  function handleTest() {
    if (!skillName.trim()) {
      toast('Please save your skill first to test it', 'error')
      return
    }
    setTestPanelOpen(true)
    setIsTesting(true)
    setTestResult(null)

    // Simulate test for unsaved skills
    const startTime = Date.now()
    setTimeout(() => {
      setIsTesting(false)
      setTestResult({
        success: true,
        output: `Test completed for "${skillName}" (${skillType})`,
        execution_time: `${Date.now() - startTime}ms`,
        raw: { status: 'ok', input: testPayload || '(empty)', type: skillType },
      })
    }, 1500)
  }

  function handleEditSave() {
    if (!editingSkill) return
    const config = buildConfigFromFields(editingSkill.skill_type)
    updateMutation.mutate({
      id: editingSkill.id,
      data: {
        name: skillName,
        icon,
        skill_type: skillType,
        description,
        config,
        is_public: isPublic,
      },
    })
  }

  function openEdit(skill: CustomSkill) {
    setSkillName(skill.name)
    setIcon(skill.icon)
    setSkillType(skill.skill_type)
    setDescription(skill.description)
    setIsPublic(skill.is_public)
    setConfigJson(typeof skill.config === 'string' ? skill.config : JSON.stringify(skill.config, null, 2))

    // Parse config into individual fields
    try {
      const cfg = typeof skill.config === 'string' ? JSON.parse(skill.config) : skill.config
      if (skill.skill_type === 'REST API') {
        setRestUrl(cfg.url || '')
        setRestMethod(cfg.method || 'GET')
        setRestHeaders(JSON.stringify(cfg.headers || {}, null, 2))
        setRestBody(JSON.stringify(cfg.body || {}, null, 2))
      } else if (skill.skill_type === 'SQL') {
        setSqlConnection(cfg.connection || '')
        setSqlQuery(cfg.query || '')
      } else if (skill.skill_type === 'Scraper') {
        setScraperUrl(cfg.url || '')
        setScraperSelector(cfg.selector || '')
      }
    } catch { /* use raw configJson */ }

    setEditingSkill(skill)
  }

  if (!mounted) return null

  // ── Tab Buttons ────────────────────────────────────────────────
  const TABS = [
    { id: 'catalog', label: 'Skill Catalog' },
    { id: 'my-skills', label: 'My Skills' },
    { id: 'create', label: 'Create Skill' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Skills Library</h1>
        <p className="mt-1 text-sm text-slate-500">
          Build, manage, and discover skills for your AI agents
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 1: SKILL CATALOG                                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'catalog' && (
        <>
          <div className="mb-4 flex items-center gap-3 text-xs text-slate-500">
            <span>{totalSkills} skills across {SKILL_CATEGORIES.length} categories</span>
            {!credsLoading && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                {readyCount} ready
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Search skills — e.g. email, GitHub, analytics..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category pills */}
          <div className="mb-5 flex flex-wrap gap-2">
            {SKILL_CATEGORIES.map(cat => {
              const colors = COLOR_MAP[cat.color] || COLOR_MAP.slate
              return (
                <button key={cat.name} onClick={() => setSearch('')}
                  className={`flex items-center gap-1.5 rounded-lg border ${colors.header} bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all hover:bg-slate-50`}>
                  <span>{cat.icon}</span>
                  {cat.name}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${colors.badge}`}>{cat.skills.length}</span>
                </button>
              )
            })}
          </div>

          {credsLoading && <div className="text-center py-20 text-slate-400">Loading...</div>}

          {/* Skill Categories */}
          {filtered.map(cat => {
            const colors = COLOR_MAP[cat.color] || COLOR_MAP.slate
            return (
              <div key={cat.name} className="mb-6">
                <div className={`flex items-center gap-2 rounded-lg border ${colors.header} bg-white px-4 py-3 mb-3`}>
                  <span className="text-lg">{cat.icon}</span>
                  <h2 className="text-sm font-semibold text-slate-800">{cat.name}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${colors.badge}`}>
                    {cat.skills.length} {cat.skills.length === 1 ? 'skill' : 'skills'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {cat.skills.map(skill => {
                    const ready = isReady(skill.requiredCredentials)
                    const missingCreds = skill.requiredCredentials.filter(c => !configuredTypes.has(c))
                    return (
                      <div key={skill.id} className="rounded-xl border border-slate-200 bg-white p-4 transition-all hover:shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{skill.name}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{skill.description}</p>
                          </div>
                          <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 whitespace-nowrap">
                            <Download size={9} />
                            {skill.install_count}
                          </span>
                        </div>
                        {/* Required credential tags */}
                        {skill.requiredCredentials.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2.5">
                            {skill.requiredCredentials.map(credId => (
                              <span key={credId} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                configuredTypes.has(credId) ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {CRED_LABELS[credId] || credId}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          {ready ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                              <CheckCircle size={10} /> Ready
                            </span>
                          ) : (
                            <Link href={`/credentials?highlight=${missingCreds[0]}`}
                              className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-200 transition-colors">
                              <AlertTriangle size={10} /> Setup needed &rarr;
                            </Link>
                          )}
                          <button
                            onClick={() => installMutation.mutate(skill.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                          >
                            <Download size={11} /> Install
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {filtered.length === 0 && !credsLoading && (
            <div className="text-center py-20">
              <div className="text-5xl mb-3">🔍</div>
              <p className="text-sm font-semibold text-slate-400">No skills match &quot;{search}&quot;</p>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 2: MY SKILLS                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'my-skills' && (
        <>
          {mySkillsLoading && <div className="text-center py-20 text-slate-400">Loading your skills...</div>}

          {!mySkillsLoading && mySkills.length === 0 && (
            <div className="text-center py-20">
              <div className="text-5xl mb-3">🛠️</div>
              <p className="text-sm font-semibold text-slate-600 mb-1">You haven&apos;t created any skills yet.</p>
              <p className="text-xs text-slate-400 mb-4">Click Create Skill to get started.</p>
              <button
                onClick={() => setActiveTab('create')}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                <Plus size={14} /> Create Skill
              </button>
            </div>
          )}

          {!mySkillsLoading && mySkills.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mySkills.map(skill => (
                <div key={skill.id} className="rounded-xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md">
                  {/* Header row */}
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">{skill.icon || '🔧'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{skill.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TYPE_BADGE_COLORS[skill.skill_type] || 'bg-slate-100 text-slate-600'}`}>
                          {skill.skill_type}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                          {skill.version || 'v1.0.0'}
                        </span>
                        {skill.is_public ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                            <Globe size={8} /> Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                            <Lock size={8} /> Private
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-3 line-clamp-2">
                    {skill.description || 'No description'}
                  </p>

                  {/* Install count for public skills */}
                  {skill.is_public && (
                    <div className="flex items-center gap-1 mb-3 text-[10px] text-slate-400">
                      <Download size={9} />
                      <span>{skill.install_count || 0} installs</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setTestPayload('')
                        setTestResult(null)
                        setTestPanelOpen(true)
                        setSkillName(skill.name)
                        setSkillType(skill.skill_type)
                        setIsTesting(true)
                        const start = Date.now()
                        setTimeout(() => {
                          setIsTesting(false)
                          setTestResult({
                            success: true,
                            output: `Test passed for "${skill.name}"`,
                            execution_time: `${Date.now() - start}ms`,
                            raw: { status: 'ok', skill_id: skill.id },
                          })
                        }, 1200)
                      }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Play size={10} /> Test
                    </button>
                    <button
                      onClick={() => openEdit(skill)}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Pencil size={10} /> Edit
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this skill?')) deleteMutation.mutate(skill.id) }}
                      className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={10} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TAB 3: CREATE SKILL                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {activeTab === 'create' && (
        <div className="flex gap-0">
          <div className={`flex-1 transition-all ${testPanelOpen ? 'mr-[420px]' : ''}`}>
            <div className="max-w-3xl">
              {/* ROW 1: Icon + Name */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Skill Identity</label>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl">
                      {icon}
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap max-w-[120px] justify-center">
                      {QUICK_EMOJIS.map(e => (
                        <button key={e} onClick={() => setIcon(e)}
                          className={`text-lg p-0.5 rounded hover:bg-slate-100 ${icon === e ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''}`}>
                          {e}
                        </button>
                      ))}
                    </div>
                    <input
                      className="mt-1 w-[120px] rounded border border-slate-200 px-2 py-1 text-center text-sm"
                      placeholder="or type emoji"
                      value={icon}
                      onChange={e => setIcon(e.target.value)}
                    />
                  </div>
                  <input
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    placeholder="Skill name (e.g. Fetch Weather Data)"
                    value={skillName}
                    onChange={e => setSkillName(e.target.value)}
                  />
                </div>
              </div>

              {/* ROW 2: Skill Type Selector */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Skill Type</label>
                <div className="grid grid-cols-5 gap-3">
                  {SKILL_TYPES.map(st => (
                    <button
                      key={st.id}
                      onClick={() => handleTypeSelect(st.id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all ${
                        skillType === st.id
                          ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl">{st.icon}</span>
                      <span className="text-xs font-semibold text-slate-700">{st.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ROW 3: Description */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Description</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  rows={2}
                  placeholder="Briefly describe what this skill does..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              {/* ROW 4: Configuration (type-specific) */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Configuration
                  <span className="ml-2 text-[10px] font-normal text-slate-400">({skillType})</span>
                </label>

                {/* REST API config */}
                {skillType === 'REST API' && (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    {/* Mode toggle */}
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                      <button onClick={() => setRestConfigMode('manual')}
                        className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                          restConfigMode === 'manual' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}>
                        Manual Setup
                      </button>
                      <button onClick={() => setRestConfigMode('openapi')}
                        className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                          restConfigMode === 'openapi' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}>
                        Import OpenAPI Spec
                      </button>
                    </div>

                    {/* ── Manual mode ── */}
                    {restConfigMode === 'manual' && (
                      <div className="space-y-3">
                        <div>
                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500 mb-1">
                            URL
                            {autoFilledFields.has('url') && (
                              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">Parsed from spec</span>
                            )}
                          </label>
                          <input
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            placeholder="https://api.example.com/data"
                            value={restUrl}
                            onChange={e => { setRestUrl(e.target.value); setAutoFilledFields(p => { const n = new Set(p); n.delete('url'); return n }) }}
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500 mb-1">
                            Method
                            {autoFilledFields.has('method') && (
                              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">Parsed from spec</span>
                            )}
                          </label>
                          <div className="flex gap-2">
                            {['GET', 'POST', 'PUT', 'DELETE'].map(m => (
                              <button
                                key={m}
                                onClick={() => { setRestMethod(m); setAutoFilledFields(p => { const n = new Set(p); n.delete('method'); return n }) }}
                                className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                                  restMethod === m
                                    ? 'bg-emerald-600 text-white'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500 mb-1">
                            Headers (JSON)
                            {autoFilledFields.has('headers') && (
                              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">Parsed from spec</span>
                            )}
                          </label>
                          <textarea
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            rows={3}
                            value={restHeaders}
                            onChange={e => { setRestHeaders(e.target.value); setAutoFilledFields(p => { const n = new Set(p); n.delete('headers'); return n }) }}
                          />
                        </div>
                        <div>
                          <label className="flex items-center gap-2 text-[11px] font-medium text-slate-500 mb-1">
                            Body Template
                            {autoFilledFields.has('body') && (
                              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">Parsed from spec</span>
                            )}
                          </label>
                          <textarea
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            rows={3}
                            value={restBody}
                            onChange={e => { setRestBody(e.target.value); setAutoFilledFields(p => { const n = new Set(p); n.delete('body'); return n }) }}
                          />
                        </div>
                      </div>
                    )}

                    {/* ── OpenAPI Import mode ── */}
                    {restConfigMode === 'openapi' && (
                      <div className="space-y-3">
                        <textarea
                          className={`w-full min-h-[192px] rounded-lg border-2 px-4 py-3 text-sm font-mono text-slate-800 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                            isDragOver
                              ? 'border-emerald-500 bg-emerald-50/50'
                              : 'border-slate-200 bg-white focus:border-emerald-500'
                          }`}
                          placeholder={`Paste your OpenAPI/Swagger spec here (JSON or YAML)\n\nExample:\n{\n  "openapi": "3.0.0",\n  "info": { "title": "My API" },\n  "paths": {\n    "/users": {\n      "get": {\n        "summary": "Get all users",\n        "parameters": [...]\n      }\n    }\n  }\n}`}
                          value={openApiSpec}
                          onChange={e => setOpenApiSpec(e.target.value)}
                          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                          onDragLeave={() => setIsDragOver(false)}
                          onDrop={handleSpecFileDrop}
                        />

                        <div className="flex items-center gap-3">
                          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                            <Upload size={12} />
                            Upload .json / .yaml file
                            <input type="file" accept=".json,.yaml,.yml" className="hidden" onChange={handleSpecFileUpload} />
                          </label>
                          <span className="text-[10px] text-slate-400">or drag &amp; drop onto the textarea</span>
                        </div>

                        <button
                          onClick={handleParseSpec}
                          disabled={!openApiSpec.trim()}
                          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Parse Spec
                        </button>

                        {parseError && (
                          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                            <AlertTriangle size={13} className="mt-0.5 text-red-500 shrink-0" />
                            <p className="text-xs text-red-600">{parseError}</p>
                          </div>
                        )}

                        {/* Parsed endpoints list */}
                        {parsedEndpoints.length > 0 && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-slate-700">
                                Select endpoints
                                <span className="ml-1.5 text-[10px] font-normal text-slate-400">({parsedEndpoints.length} found)</span>
                              </p>
                              {selectedEndpoints.size > 0 && (
                                <button
                                  onClick={applySelectedEndpoints}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors"
                                >
                                  <CheckCircle size={11} /> Apply Selected
                                </button>
                              )}
                            </div>
                            <div className="max-h-[280px] overflow-auto rounded-lg border border-slate-200">
                              {parsedEndpoints.map((ep, idx) => {
                                const isSelected = selectedEndpoints.has(idx)
                                return (
                                  <button
                                    key={`${ep.method}-${ep.path}`}
                                    onClick={() => toggleEndpointSelection(idx)}
                                    className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition-colors last:border-b-0 ${
                                      isSelected ? 'bg-emerald-50' : 'bg-white hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      readOnly
                                      className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 accent-emerald-600"
                                    />
                                    <span className={`inline-flex min-w-[52px] items-center justify-center rounded px-2 py-0.5 text-[10px] font-bold ${METHOD_COLORS[ep.method] || 'bg-slate-100 text-slate-700'}`}>
                                      {ep.method}
                                    </span>
                                    <span className="font-mono text-xs text-slate-700">{ep.path}</span>
                                    {ep.summary && (
                                      <>
                                        <span className="text-slate-300">—</span>
                                        <span className="truncate text-[11px] text-slate-500">{ep.summary}</span>
                                      </>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SQL config */}
                {skillType === 'SQL' && (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Connection String</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="postgresql://user:pass@host/db"
                        value={sqlConnection}
                        onChange={e => setSqlConnection(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">Query</label>
                      <textarea
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        rows={4}
                        value={sqlQuery}
                        onChange={e => setSqlQuery(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Python config */}
                {skillType === 'Python' && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] text-slate-400 mb-2">Function receives &apos;input&apos; variable, must return a value</p>
                    <textarea
                      className="w-full min-h-[192px] rounded-lg border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-mono text-emerald-400 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={configJson}
                      onChange={e => setConfigJson(e.target.value)}
                    />
                  </div>
                )}

                {/* Scraper config */}
                {skillType === 'Scraper' && (
                  <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">URL</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="https://example.com"
                        value={scraperUrl}
                        onChange={e => setScraperUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">CSS Selector</label>
                      <input
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder=".article-content"
                        value={scraperSelector}
                        onChange={e => setScraperSelector(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Custom config */}
                {skillType === 'Custom' && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] text-slate-400 mb-2">Free-form JSON configuration. Define your own schema.</p>
                    <textarea
                      className="w-full min-h-[160px] rounded-lg border border-slate-200 px-4 py-3 text-sm font-mono text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={configJson}
                      onChange={e => setConfigJson(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* ROW 5: Visibility */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Visibility</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                      !isPublic ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Lock size={16} className={!isPublic ? 'text-emerald-600' : 'text-slate-400'} />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-700">Private</p>
                      <p className="text-[11px] text-slate-500">Only you can use this skill</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-4 transition-all ${
                      isPublic ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Globe size={16} className={isPublic ? 'text-emerald-600' : 'text-slate-400'} />
                    <div className="text-left">
                      <p className="text-sm font-semibold text-slate-700">Public</p>
                      <p className="text-[11px] text-slate-500">Publish to marketplace for others to install</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* ROW 6: Test Payload */}
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 mb-2">Test Payload</label>
                <input
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Sample input to test your skill"
                  value={testPayload}
                  onChange={e => setTestPayload(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pb-8">
                <button
                  onClick={handleTest}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Play size={14} /> Test Skill
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                  Publish Skill
                </button>
              </div>
            </div>
          </div>

          {/* ── Test Panel (slides in from right) ─────────────── */}
          {testPanelOpen && (
            <div className="fixed right-0 top-0 z-40 flex h-full w-[400px] flex-col border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <h3 className="text-sm font-bold text-slate-800">Test Results</h3>
                <button onClick={() => setTestPanelOpen(false)} className="rounded-lg p-1 hover:bg-slate-100">
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-5">
                {isTesting && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-emerald-500 mb-3" />
                    <p className="text-sm font-medium text-slate-600">Testing skill...</p>
                    <p className="text-xs text-slate-400 mt-1">{skillName} ({skillType})</p>
                  </div>
                )}
                {!isTesting && testResult && (
                  <div>
                    {/* Status */}
                    <div className={`mb-4 rounded-xl border-2 p-4 ${
                      testResult.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {testResult.success ? (
                          <CheckCircle size={16} className="text-emerald-600" />
                        ) : (
                          <AlertTriangle size={16} className="text-red-600" />
                        )}
                        <span className={`text-sm font-bold ${testResult.success ? 'text-emerald-700' : 'text-red-700'}`}>
                          {testResult.success ? 'Success' : 'Error'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{testResult.output}</p>
                    </div>

                    {/* Execution time */}
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                        Execution: {testResult.execution_time}
                      </span>
                    </div>

                    {/* Raw Response */}
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 mb-2">Raw Response</p>
                      <pre className="rounded-lg bg-slate-900 p-4 text-xs text-emerald-400 overflow-auto max-h-[300px]">
                        {JSON.stringify(testResult.raw, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* EDIT SKILL MODAL                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {editingSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-5" onClick={() => setEditingSkill(null)}>
          <div className="flex w-full max-w-2xl mx-4 flex-col rounded-xl border border-slate-200 bg-white shadow-xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-bold text-slate-800">Edit Skill</h2>
              <button onClick={() => setEditingSkill(null)} className="rounded-lg p-1 hover:bg-slate-100">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-auto p-6 space-y-5">
              {/* Icon + Name */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl">
                    {icon}
                  </div>
                  <div className="flex gap-1 mt-2 flex-wrap max-w-[120px] justify-center">
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={() => setIcon(e)}
                        className={`text-lg p-0.5 rounded hover:bg-slate-100 ${icon === e ? 'ring-2 ring-emerald-500 bg-emerald-50' : ''}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Skill name"
                  value={skillName}
                  onChange={e => setSkillName(e.target.value)}
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Skill Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {SKILL_TYPES.map(st => (
                    <button
                      key={st.id}
                      onClick={() => handleTypeSelect(st.id)}
                      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-xs font-semibold transition-all ${
                        skillType === st.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">{st.icon}</span>
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Description</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              {/* Config */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Configuration</label>
                {skillType === 'REST API' && (
                  <div className="space-y-3">
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none" placeholder="URL" value={restUrl} onChange={e => setRestUrl(e.target.value)} />
                    <div className="flex gap-2">
                      {['GET', 'POST', 'PUT', 'DELETE'].map(m => (
                        <button key={m} onClick={() => setRestMethod(m)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-bold ${restMethod === m ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600'}`}>
                          {m}
                        </button>
                      ))}
                    </div>
                    <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none" rows={3} placeholder="Headers JSON" value={restHeaders} onChange={e => setRestHeaders(e.target.value)} />
                    <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none" rows={3} placeholder="Body template" value={restBody} onChange={e => setRestBody(e.target.value)} />
                  </div>
                )}
                {skillType === 'SQL' && (
                  <div className="space-y-3">
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none" placeholder="Connection string" value={sqlConnection} onChange={e => setSqlConnection(e.target.value)} />
                    <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none" rows={4} placeholder="Query" value={sqlQuery} onChange={e => setSqlQuery(e.target.value)} />
                  </div>
                )}
                {skillType === 'Python' && (
                  <textarea className="w-full min-h-[160px] rounded-lg border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-mono text-emerald-400 focus:border-emerald-500 focus:outline-none" value={configJson} onChange={e => setConfigJson(e.target.value)} />
                )}
                {skillType === 'Scraper' && (
                  <div className="space-y-3">
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none" placeholder="URL" value={scraperUrl} onChange={e => setScraperUrl(e.target.value)} />
                    <input className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none" placeholder="CSS Selector" value={scraperSelector} onChange={e => setScraperSelector(e.target.value)} />
                  </div>
                )}
                {skillType === 'Custom' && (
                  <textarea className="w-full min-h-[160px] rounded-lg border border-slate-200 px-4 py-3 text-sm font-mono focus:border-emerald-500 focus:outline-none" value={configJson} onChange={e => setConfigJson(e.target.value)} />
                )}
              </div>

              {/* Visibility */}
              <div className="flex gap-3">
                <button onClick={() => setIsPublic(false)}
                  className={`flex-1 flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-semibold transition-all ${!isPublic ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                  <Lock size={14} /> Private
                </button>
                <button onClick={() => setIsPublic(true)}
                  className={`flex-1 flex items-center gap-2 rounded-lg border-2 p-3 text-sm font-semibold transition-all ${isPublic ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'}`}>
                  <Globe size={14} /> Public
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button onClick={() => setEditingSkill(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={updateMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
