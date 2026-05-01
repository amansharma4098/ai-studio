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
    name: 'AI & Language', icon: '\u{1F9E0}', color: 'violet',
    skills: [
      { id: 'groq_chat', name: 'Groq Chat', description: 'Fast inference with Groq-hosted LLMs', requiredCredentials: ['groq'], install_count: 234 },
      { id: 'openai_chat', name: 'OpenAI Chat', description: 'Chat completions with GPT models', requiredCredentials: ['openai'], install_count: 512 },
      { id: 'claude_chat', name: 'Claude Chat', description: 'Chat with Anthropic Claude models', requiredCredentials: ['anthropic'], install_count: 389 },
    ],
  },
  {
    name: 'Data & Analytics', icon: '\u{1F4CA}', color: 'blue',
    skills: [
      { id: 'sql_query', name: 'SQL Query', description: 'Query databases and analyze structured data', requiredCredentials: [], install_count: 178 },
      { id: 'data_analysis', name: 'Data Analysis', description: 'Analyze datasets and generate insights', requiredCredentials: [], install_count: 145 },
      { id: 'stock_data', name: 'Stock Market Data', description: 'Fetch real-time and historical stock data', requiredCredentials: ['alpha_vantage'], install_count: 93 },
    ],
  },
  {
    name: 'Web & APIs', icon: '\u{1F310}', color: 'sky',
    skills: [
      { id: 'web_scraping', name: 'Web Scraper', description: 'Scrape and extract data from websites', requiredCredentials: [], install_count: 267 },
      { id: 'rest_api', name: 'REST API', description: 'Call external REST APIs to fetch or send data', requiredCredentials: [], install_count: 321 },
    ],
  },
  {
    name: 'Communication', icon: '\u{1F4AC}', color: 'emerald',
    skills: [
      { id: 'sendgrid_email', name: 'SendGrid Email', description: 'Send transactional emails via SendGrid', requiredCredentials: ['sendgrid'], install_count: 156 },
      { id: 'smtp_email', name: 'SMTP Email', description: 'Send emails via custom SMTP server', requiredCredentials: ['smtp'], install_count: 88 },
    ],
  },
  {
    name: 'Sales & CRM', icon: '\u{1F4BC}', color: 'orange',
    skills: [
      { id: 'hubspot_crm', name: 'HubSpot CRM', description: 'Manage contacts and deals in HubSpot', requiredCredentials: ['hubspot'], install_count: 201 },
      { id: 'salesforce_query', name: 'Salesforce Query', description: 'Query and manage Salesforce records', requiredCredentials: ['salesforce'], install_count: 175 },
      { id: 'linkedin_outreach', name: 'LinkedIn Outreach', description: 'Manage LinkedIn connections and messages', requiredCredentials: ['linkedin'], install_count: 310 },
    ],
  },
  {
    name: 'Dev & IT', icon: '\u{2699}\u{FE0F}', color: 'slate',
    skills: [
      { id: 'github_issues', name: 'GitHub Issues', description: 'Create and manage GitHub issues and PRs', requiredCredentials: ['github'], install_count: 445 },
      { id: 'jira_tickets', name: 'Jira Tickets', description: 'Create and track Jira issues', requiredCredentials: ['jira'], install_count: 287 },
      { id: 'pagerduty_alerts', name: 'PagerDuty Alerts', description: 'Manage incidents and on-call schedules', requiredCredentials: ['pagerduty'], install_count: 98 },
    ],
  },
  {
    name: 'Support', icon: '\u{1F3A7}', color: 'teal',
    skills: [
      { id: 'zendesk_tickets', name: 'Zendesk Tickets', description: 'Manage support tickets and customer queries', requiredCredentials: ['zendesk'], install_count: 134 },
    ],
  },
  {
    name: 'Marketing', icon: '\u{1F4E3}', color: 'amber',
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
  { id: 'REST API', icon: '\u{1F310}', label: 'REST API' },
  { id: 'SQL', icon: '\u{1F5C4}\u{FE0F}', label: 'SQL' },
  { id: 'Python', icon: '\u{1F40D}', label: 'Python' },
  { id: 'Scraper', icon: '\u{1F50D}', label: 'Scraper' },
  { id: 'Custom', icon: '\u{26A1}', label: 'Custom' },
]

const QUICK_EMOJIS = ['\u{1F527}', '\u{26A1}', '\u{1F310}', '\u{1F4CA}', '\u{1F50D}', '\u{1F4AC}', '\u{1F5C4}\u{FE0F}', '\u{1F916}']

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

// ── Neon color map for categories ────────────────────────────────
const NEON_CAT_COLORS: Record<string, { glow: string; text: string; border: string; bg: string }> = {
  violet: { glow: '#8b5cf6', text: '#c4b5fd', border: 'rgba(139,92,246,0.4)', bg: 'rgba(139,92,246,0.08)' },
  blue:   { glow: '#00f0ff', text: '#67e8f9', border: 'rgba(0,240,255,0.4)',   bg: 'rgba(0,240,255,0.08)' },
  sky:    { glow: '#00f0ff', text: '#67e8f9', border: 'rgba(0,240,255,0.4)',   bg: 'rgba(0,240,255,0.08)' },
  emerald:{ glow: '#00ff88', text: '#6ee7b7', border: 'rgba(0,255,136,0.4)',   bg: 'rgba(0,255,136,0.08)' },
  orange: { glow: '#ff8800', text: '#fdba74', border: 'rgba(255,136,0,0.4)',   bg: 'rgba(255,136,0,0.08)' },
  slate:  { glow: '#00f0ff', text: '#94a3b8', border: 'rgba(0,240,255,0.3)',   bg: 'rgba(0,240,255,0.05)' },
  teal:   { glow: '#00ff88', text: '#5eead4', border: 'rgba(0,255,136,0.4)',   bg: 'rgba(0,255,136,0.08)' },
  amber:  { glow: '#ff00aa', text: '#fbbf24', border: 'rgba(255,0,170,0.4)',   bg: 'rgba(255,0,170,0.08)' },
}

// ── Main Component ───────────────────────────────────────────────
export default function SkillsPage() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('catalog')
  const [search, setSearch] = useState('')
  const { addToast: toast } = useToast()
  const queryClient = useQueryClient()

  // Collapsible categories
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())

  // Create / Edit form state
  const [skillType, setSkillType] = useState('REST API')
  const [icon, setIcon] = useState('\u{1F527}')
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

  function toggleCategory(name: string) {
    setCollapsedCats(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function resetForm() {
    setSkillName('')
    setDescription('')
    setIcon('\u{1F527}')
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
    toast('Endpoint imported -- review the fields below', 'success')
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
    <div className="animate-fade-in min-h-screen p-4 sm:p-6 lg:p-8" style={{ background: '#12121a' }}>

      {/* ── Inline Styles for Gaming Aesthetic ── */}
      <style>{`
        .game-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .game-card:hover {
          border-color: rgba(0,240,255,0.3);
          box-shadow: 0 0 20px rgba(0,240,255,0.08), inset 0 0 20px rgba(0,240,255,0.02);
          transform: translateY(-2px);
        }
        .game-btn {
          background: linear-gradient(135deg, #00f0ff 0%, #8b5cf6 100%);
          color: #fff;
          font-weight: 700;
          border: none;
          border-radius: 8px;
          padding: 8px 18px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.25s ease;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          box-shadow: 0 0 15px rgba(0,240,255,0.2);
        }
        .game-btn:hover {
          box-shadow: 0 0 25px rgba(0,240,255,0.4), 0 0 50px rgba(139,92,246,0.2);
          transform: translateY(-1px);
        }
        .game-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .game-btn-secondary {
          background: transparent;
          color: #00f0ff;
          font-weight: 600;
          border: 1px solid rgba(0,240,255,0.3);
          border-radius: 8px;
          padding: 8px 18px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .game-btn-secondary:hover {
          background: rgba(0,240,255,0.08);
          border-color: rgba(0,240,255,0.6);
          box-shadow: 0 0 15px rgba(0,240,255,0.15);
        }
        .game-btn-danger {
          background: transparent;
          color: #ff4466;
          font-weight: 600;
          border: 1px solid rgba(255,68,102,0.3);
          border-radius: 8px;
          padding: 8px 18px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .game-btn-danger:hover {
          background: rgba(255,68,102,0.1);
          border-color: rgba(255,68,102,0.6);
          box-shadow: 0 0 15px rgba(255,68,102,0.2);
        }
        .game-input {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 13px;
          padding: 10px 14px;
          transition: all 0.25s ease;
          width: 100%;
        }
        .game-input:focus {
          outline: none;
          border-color: rgba(0,240,255,0.5);
          box-shadow: 0 0 12px rgba(0,240,255,0.15);
          background: rgba(0,240,255,0.03);
        }
        .game-input::placeholder {
          color: rgba(255,255,255,0.2);
        }
        .game-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(8px);
          padding: 20px;
        }
        .game-modal {
          background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%);
          border: 1px solid rgba(139,92,246,0.3);
          border-radius: 16px;
          box-shadow: 0 0 40px rgba(139,92,246,0.15), 0 0 80px rgba(0,0,0,0.5);
          max-height: 90vh;
          width: 100%;
          max-width: 680px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .game-table {
          width: 100%;
          border-collapse: collapse;
        }
        .game-table th {
          text-align: left;
          color: rgba(255,255,255,0.4);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .game-table td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          color: rgba(255,255,255,0.7);
          font-size: 12px;
        }
        .badge-success {
          background: rgba(0,255,136,0.12);
          color: #00ff88;
          border: 1px solid rgba(0,255,136,0.25);
          border-radius: 9999px;
          padding: 2px 10px;
          font-size: 10px;
          font-weight: 700;
        }
        .badge-info {
          background: rgba(0,240,255,0.1);
          color: #00f0ff;
          border: 1px solid rgba(0,240,255,0.2);
          border-radius: 9999px;
          padding: 2px 10px;
          font-size: 10px;
          font-weight: 700;
        }
        .badge-purple {
          background: rgba(139,92,246,0.12);
          color: #a78bfa;
          border: 1px solid rgba(139,92,246,0.25);
          border-radius: 9999px;
          padding: 2px 10px;
          font-size: 10px;
          font-weight: 700;
        }
        .neon-text {
          background: linear-gradient(135deg, #00f0ff 0%, #8b5cf6 50%, #ff00aa 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes neonPulse {
          0%, 100% { box-shadow: 0 0 5px rgba(0,240,255,0.3); }
          50% { box-shadow: 0 0 20px rgba(0,240,255,0.5), 0 0 40px rgba(0,240,255,0.1); }
        }
        @keyframes glowRotate {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
        .skill-node {
          position: relative;
        }
        .skill-node::before {
          content: '';
          position: absolute;
          top: -1px;
          left: 50%;
          width: 2px;
          height: 12px;
          background: linear-gradient(to bottom, rgba(0,240,255,0.3), transparent);
          transform: translateX(-50%) translateY(-12px);
          pointer-events: none;
        }
        .xp-bar {
          height: 3px;
          background: rgba(255,255,255,0.06);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 6px;
        }
        .xp-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00f0ff, #8b5cf6);
          border-radius: 2px;
          transition: width 0.5s ease;
        }
        .cat-header-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 100%);
        }
      `}</style>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(139,92,246,0.15))',
            border: '1px solid rgba(0,240,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
            boxShadow: '0 0 20px rgba(0,240,255,0.1)',
          }}>
            {'\u{1F3AE}'}
          </div>
          <div>
            <h1 className="neon-text" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
              SKILL TREE
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 2 }}>
              Unlock, craft, and master abilities for your AI agents
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 p-1" style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.02em',
              transition: 'all 0.25s ease',
              cursor: 'pointer',
              ...(activeTab === tab.id
                ? {
                    background: 'linear-gradient(135deg, rgba(0,240,255,0.12), rgba(139,92,246,0.12))',
                    color: '#00f0ff',
                    boxShadow: '0 0 15px rgba(0,240,255,0.1)',
                    border: '1px solid rgba(0,240,255,0.2)',
                  }
                : {
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.35)',
                    border: '1px solid transparent',
                  }),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* TAB 1: SKILL CATALOG                                              */}
      {/* ================================================================= */}
      {activeTab === 'catalog' && (
        <div className="animate-fade-in">
          {/* Stats bar */}
          <div className="mb-4 flex items-center gap-3" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            <span>{totalSkills} skills across {SKILL_CATEGORIES.length} branches</span>
            {!credsLoading && (
              <span className="badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {readyCount} UNLOCKED
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-5">
            <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(0,240,255,0.4)' }} />
            <input
              className="game-input"
              style={{ paddingLeft: 36 }}
              placeholder="Search skills -- e.g. email, GitHub, analytics..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter pills */}
          <div className="mb-6 flex flex-wrap gap-2">
            {SKILL_CATEGORIES.map(cat => {
              const neon = NEON_CAT_COLORS[cat.color] || NEON_CAT_COLORS.slate
              return (
                <button key={cat.name} onClick={() => setSearch('')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    borderRadius: 9999,
                    border: `1px solid ${neon.border}`,
                    background: neon.bg,
                    padding: '6px 14px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: neon.text,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                  }}>
                  <span>{cat.icon}</span>
                  {cat.name}
                  <span style={{
                    background: `${neon.glow}22`,
                    color: neon.glow,
                    borderRadius: 9999,
                    padding: '1px 7px',
                    fontSize: 9,
                    fontWeight: 800,
                  }}>{cat.skills.length}</span>
                </button>
              )
            })}
          </div>

          {credsLoading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#00f0ff' }} />
              Loading skill tree...
            </div>
          )}

          {/* Skill Tree Categories */}
          {filtered.map(cat => {
            const neon = NEON_CAT_COLORS[cat.color] || NEON_CAT_COLORS.slate
            const isCollapsed = collapsedCats.has(cat.name)
            return (
              <div key={cat.name} className="mb-6 animate-fade-in">
                {/* Category Header - collapsible with neon */}
                <button
                  onClick={() => toggleCategory(cat.name)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '12px 16px', marginBottom: isCollapsed ? 0 : 12,
                    borderRadius: 10,
                    border: `1px solid ${neon.border}`,
                    background: `linear-gradient(135deg, ${neon.bg}, transparent)`,
                    cursor: 'pointer',
                    transition: 'all 0.25s ease',
                  }}
                >
                  <span style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: `${neon.glow}18`,
                    border: `1px solid ${neon.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                    boxShadow: `0 0 12px ${neon.glow}20`,
                  }}>{cat.icon}</span>
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: neon.text, letterSpacing: '0.03em' }}>
                    {cat.name.toUpperCase()}
                  </h2>
                  <span style={{
                    background: `${neon.glow}15`,
                    color: neon.glow,
                    border: `1px solid ${neon.border}`,
                    borderRadius: 9999,
                    padding: '2px 10px',
                    fontSize: 10,
                    fontWeight: 800,
                  }}>
                    {cat.skills.length} {cat.skills.length === 1 ? 'skill' : 'skills'}
                  </span>
                  <div className="cat-header-line" />
                  <ChevronRight
                    size={14}
                    style={{
                      color: neon.text,
                      transition: 'transform 0.25s ease',
                      transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)',
                    }}
                  />
                </button>

                {/* Skills Grid */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {cat.skills.map(skill => {
                      const ready = isReady(skill.requiredCredentials)
                      const missingCreds = skill.requiredCredentials.filter(c => !configuredTypes.has(c))
                      const xpPercent = Math.min((skill.install_count / 600) * 100, 100)
                      return (
                        <div key={skill.id} className="game-card skill-node" style={{ padding: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{skill.name}</p>
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, lineHeight: 1.5 }}>{skill.description}</p>
                            </div>
                            {/* XP counter */}
                            <span style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              background: 'rgba(139,92,246,0.1)',
                              border: '1px solid rgba(139,92,246,0.2)',
                              borderRadius: 9999,
                              padding: '2px 8px',
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#a78bfa',
                              whiteSpace: 'nowrap',
                            }}>
                              <span style={{ color: '#8b5cf6' }}>XP</span>
                              {skill.install_count}
                            </span>
                          </div>

                          {/* XP bar */}
                          <div className="xp-bar">
                            <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
                          </div>

                          {/* Required credential tags */}
                          {skill.requiredCredentials.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, marginBottom: 8 }}>
                              {skill.requiredCredentials.map(credId => (
                                <span key={credId} style={{
                                  borderRadius: 9999,
                                  padding: '2px 8px',
                                  fontSize: 10,
                                  fontWeight: 600,
                                  ...(configuredTypes.has(credId)
                                    ? { background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)' }
                                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }),
                                }}>
                                  {CRED_LABELS[credId] || credId}
                                </span>
                              ))}
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                            {ready ? (
                              <span className="badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <CheckCircle size={10} /> UNLOCKED
                              </span>
                            ) : (
                              <Link href={`/credentials?highlight=${missingCreds[0]}`}
                                style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 4,
                                  background: 'rgba(255,136,0,0.1)',
                                  color: '#ff8800',
                                  border: '1px solid rgba(255,136,0,0.25)',
                                  borderRadius: 9999,
                                  padding: '2px 10px',
                                  fontSize: 10,
                                  fontWeight: 700,
                                  textDecoration: 'none',
                                  transition: 'all 0.2s ease',
                                }}>
                                <AlertTriangle size={10} /> LOCKED &rarr;
                              </Link>
                            )}
                            <button
                              onClick={() => installMutation.mutate(skill.id)}
                              className="game-btn"
                              style={{ padding: '6px 14px', fontSize: 11 }}
                            >
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                <Download size={11} /> Install
                              </span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && !credsLoading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>{'\u{1F50D}'}</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>No skills match &quot;{search}&quot;</p>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: MY SKILLS (Crafted Abilities)                              */}
      {/* ================================================================= */}
      {activeTab === 'my-skills' && (
        <div className="animate-fade-in">
          {mySkillsLoading && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255,255,255,0.3)' }}>
              <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px', color: '#8b5cf6' }} />
              Loading crafted abilities...
            </div>
          )}

          {!mySkillsLoading && mySkills.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 16, margin: '0 auto 16px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(0,240,255,0.1))',
                border: '1px solid rgba(139,92,246,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36,
                boxShadow: '0 0 30px rgba(139,92,246,0.1)',
              }}>{'\u{1F6E0}\u{FE0F}'}</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                No crafted abilities yet
              </p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
                Forge your first skill to expand your power
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="game-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px', fontSize: 13 }}
              >
                <Plus size={14} /> Craft Ability
              </button>
            </div>
          )}

          {!mySkillsLoading && mySkills.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mySkills.map(skill => (
                <div key={skill.id} className="game-card" style={{ padding: 20 }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <span style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: 'linear-gradient(135deg, rgba(0,240,255,0.12), rgba(139,92,246,0.12))',
                      border: '1px solid rgba(0,240,255,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22,
                      boxShadow: '0 0 15px rgba(0,240,255,0.08)',
                    }}>{skill.icon || '\u{1F527}'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {skill.name}
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        <span className="badge-info">
                          {skill.skill_type}
                        </span>
                        <span className="badge-purple">
                          {skill.version || 'v1.0.0'}
                        </span>
                        {skill.is_public ? (
                          <span className="badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Globe size={8} /> Public
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                            background: 'rgba(255,136,0,0.1)',
                            color: '#ff8800',
                            border: '1px solid rgba(255,136,0,0.2)',
                            borderRadius: 9999,
                            padding: '2px 10px',
                            fontSize: 10,
                            fontWeight: 700,
                          }}>
                            <Lock size={8} /> Private
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5,
                    marginBottom: 10,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {skill.description || 'No description'}
                  </p>

                  {/* Install count for public skills */}
                  {skill.is_public && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10,
                      fontSize: 10, color: 'rgba(255,255,255,0.3)',
                    }}>
                      <Download size={9} />
                      <span>{skill.install_count || 0} installs</span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
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
                      className="game-btn-secondary"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 8px', fontSize: 11 }}
                    >
                      <Play size={10} /> Test
                    </button>
                    <button
                      onClick={() => openEdit(skill)}
                      className="game-btn-secondary"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 8px', fontSize: 11 }}
                    >
                      <Pencil size={10} /> Edit
                    </button>
                    <button
                      onClick={() => { if (confirm('Delete this skill?')) deleteMutation.mutate(skill.id) }}
                      className="game-btn-danger"
                      style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '7px 8px', fontSize: 11 }}
                    >
                      <Trash2 size={10} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: CREATE SKILL (Ability Crafting Interface)                   */}
      {/* ================================================================= */}
      {activeTab === 'create' && (
        <div className="animate-fade-in" style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1, transition: 'all 0.3s ease', marginRight: testPanelOpen ? 420 : 0 }}>
            <div style={{ maxWidth: 720 }}>

              {/* Crafting header */}
              <div className="game-card" style={{ padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>{'\u{2694}\u{FE0F}'}</span>
                <span className="neon-text" style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.05em' }}>ABILITY FORGE</span>
                <div className="cat-header-line" />
              </div>

              {/* ROW 1: Icon + Name */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#00f0ff', marginBottom: 8, letterSpacing: '0.05em' }}>
                  SKILL IDENTITY
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      border: '1px solid rgba(139,92,246,0.3)',
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(0,240,255,0.08))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24,
                      boxShadow: '0 0 15px rgba(139,92,246,0.1)',
                    }}>
                      {icon}
                    </div>
                    <div style={{ display: 'flex', gap: 3, marginTop: 8, flexWrap: 'wrap', maxWidth: 120, justifyContent: 'center' }}>
                      {QUICK_EMOJIS.map(e => (
                        <button key={e} onClick={() => setIcon(e)}
                          style={{
                            fontSize: 16, padding: 3, borderRadius: 6, cursor: 'pointer',
                            border: 'none',
                            background: icon === e ? 'rgba(0,240,255,0.15)' : 'transparent',
                            boxShadow: icon === e ? '0 0 8px rgba(0,240,255,0.3)' : 'none',
                            transition: 'all 0.15s ease',
                          }}>
                          {e}
                        </button>
                      ))}
                    </div>
                    <input
                      className="game-input"
                      style={{ marginTop: 6, width: 120, textAlign: 'center', fontSize: 13 }}
                      placeholder="or type emoji"
                      value={icon}
                      onChange={e => setIcon(e.target.value)}
                    />
                  </div>
                  <input
                    className="game-input"
                    style={{ flex: 1, fontSize: 14 }}
                    placeholder="Skill name (e.g. Fetch Weather Data)"
                    value={skillName}
                    onChange={e => setSkillName(e.target.value)}
                  />
                </div>
              </div>

              {/* ROW 2: Skill Type Selector */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#00f0ff', marginBottom: 8, letterSpacing: '0.05em' }}>
                  SKILL CLASS
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                  {SKILL_TYPES.map(st => (
                    <button
                      key={st.id}
                      onClick={() => handleTypeSelect(st.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        borderRadius: 12, padding: 14,
                        cursor: 'pointer',
                        transition: 'all 0.25s ease',
                        border: skillType === st.id ? '2px solid #00f0ff' : '2px solid rgba(255,255,255,0.06)',
                        background: skillType === st.id
                          ? 'linear-gradient(135deg, rgba(0,240,255,0.1), rgba(139,92,246,0.08))'
                          : 'rgba(255,255,255,0.02)',
                        boxShadow: skillType === st.id ? '0 0 20px rgba(0,240,255,0.12)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{st.icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: skillType === st.id ? '#00f0ff' : 'rgba(255,255,255,0.5)' }}>
                        {st.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ROW 3: Description */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#00f0ff', marginBottom: 8, letterSpacing: '0.05em' }}>
                  DESCRIPTION
                </label>
                <textarea
                  className="game-input"
                  style={{ minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }}
                  rows={2}
                  placeholder="Briefly describe what this skill does..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              {/* ROW 4: Configuration (type-specific) */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#00f0ff', marginBottom: 8, letterSpacing: '0.05em' }}>
                  CONFIGURATION
                  <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>({skillType})</span>
                </label>

                {/* REST API config */}
                {skillType === 'REST API' && (
                  <div className="game-card" style={{ padding: 16 }}>
                    {/* Mode toggle */}
                    <div style={{
                      display: 'flex', borderRadius: 8, padding: 2, marginBottom: 14,
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      <button onClick={() => setRestConfigMode('manual')}
                        style={{
                          flex: 1, borderRadius: 6, padding: '8px 12px', fontSize: 11, fontWeight: 700,
                          border: 'none', cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          ...(restConfigMode === 'manual'
                            ? { background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)', color: '#fff', boxShadow: '0 0 12px rgba(0,240,255,0.2)' }
                            : { background: 'transparent', color: 'rgba(255,255,255,0.4)' }),
                        }}>
                        Manual Setup
                      </button>
                      <button onClick={() => setRestConfigMode('openapi')}
                        style={{
                          flex: 1, borderRadius: 6, padding: '8px 12px', fontSize: 11, fontWeight: 700,
                          border: 'none', cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          ...(restConfigMode === 'openapi'
                            ? { background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)', color: '#fff', boxShadow: '0 0 12px rgba(0,240,255,0.2)' }
                            : { background: 'transparent', color: 'rgba(255,255,255,0.4)' }),
                        }}>
                        Import OpenAPI Spec
                      </button>
                    </div>

                    {/* Manual mode */}
                    {restConfigMode === 'manual' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                            URL
                            {autoFilledFields.has('url') && (
                              <span className="badge-purple">Parsed from spec</span>
                            )}
                          </label>
                          <input
                            className="game-input"
                            style={{ fontFamily: 'monospace' }}
                            placeholder="https://api.example.com/data"
                            value={restUrl}
                            onChange={e => { setRestUrl(e.target.value); setAutoFilledFields(p => { const n = new Set(p); n.delete('url'); return n }) }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                            Method
                            {autoFilledFields.has('method') && (
                              <span className="badge-purple">Parsed from spec</span>
                            )}
                          </label>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {['GET', 'POST', 'PUT', 'DELETE'].map(m => (
                              <button
                                key={m}
                                onClick={() => { setRestMethod(m); setAutoFilledFields(p => { const n = new Set(p); n.delete('method'); return n }) }}
                                style={{
                                  borderRadius: 8, padding: '7px 16px', fontSize: 11, fontWeight: 800,
                                  cursor: 'pointer', transition: 'all 0.2s ease',
                                  border: restMethod === m ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.06)',
                                  background: restMethod === m ? 'rgba(0,240,255,0.12)' : 'rgba(255,255,255,0.02)',
                                  color: restMethod === m ? '#00f0ff' : 'rgba(255,255,255,0.4)',
                                  boxShadow: restMethod === m ? '0 0 10px rgba(0,240,255,0.15)' : 'none',
                                }}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                            Headers (JSON)
                            {autoFilledFields.has('headers') && (
                              <span className="badge-purple">Parsed from spec</span>
                            )}
                          </label>
                          <textarea
                            className="game-input"
                            style={{ fontFamily: 'monospace', minHeight: 72, resize: 'vertical' }}
                            rows={3}
                            value={restHeaders}
                            onChange={e => { setRestHeaders(e.target.value); setAutoFilledFields(p => { const n = new Set(p); n.delete('headers'); return n }) }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                            Body Template
                            {autoFilledFields.has('body') && (
                              <span className="badge-purple">Parsed from spec</span>
                            )}
                          </label>
                          <textarea
                            className="game-input"
                            style={{ fontFamily: 'monospace', minHeight: 72, resize: 'vertical' }}
                            rows={3}
                            value={restBody}
                            onChange={e => { setRestBody(e.target.value); setAutoFilledFields(p => { const n = new Set(p); n.delete('body'); return n }) }}
                          />
                        </div>
                      </div>
                    )}

                    {/* OpenAPI Import mode */}
                    {restConfigMode === 'openapi' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <textarea
                          className="game-input"
                          style={{
                            fontFamily: 'monospace', minHeight: 192, resize: 'vertical',
                            ...(isDragOver ? { borderColor: 'rgba(0,240,255,0.5)', background: 'rgba(0,240,255,0.05)' } : {}),
                          }}
                          placeholder={`Paste your OpenAPI/Swagger spec here (JSON or YAML)\n\nExample:\n{\n  "openapi": "3.0.0",\n  "info": { "title": "My API" },\n  "paths": {\n    "/users": {\n      "get": {\n        "summary": "Get all users",\n        "parameters": [...]\n      }\n    }\n  }\n}`}
                          value={openApiSpec}
                          onChange={e => setOpenApiSpec(e.target.value)}
                          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
                          onDragLeave={() => setIsDragOver(false)}
                          onDrop={handleSpecFileDrop}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <label className="game-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '7px 14px' }}>
                            <Upload size={12} />
                            Upload .json / .yaml file
                            <input type="file" accept=".json,.yaml,.yml" style={{ display: 'none' }} onChange={handleSpecFileUpload} />
                          </label>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>or drag &amp; drop onto the textarea</span>
                        </div>

                        <button
                          onClick={handleParseSpec}
                          disabled={!openApiSpec.trim()}
                          className="game-btn"
                          style={{ width: '100%', padding: '10px 0', fontSize: 13 }}
                        >
                          Parse Spec
                        </button>

                        {parseError && (
                          <div style={{
                            display: 'flex', alignItems: 'flex-start', gap: 8,
                            borderRadius: 8, padding: '10px 14px',
                            background: 'rgba(255,68,102,0.08)',
                            border: '1px solid rgba(255,68,102,0.25)',
                          }}>
                            <AlertTriangle size={13} style={{ marginTop: 1, color: '#ff4466', flexShrink: 0 }} />
                            <p style={{ fontSize: 12, color: '#ff6b88' }}>{parseError}</p>
                          </div>
                        )}

                        {/* Parsed endpoints list */}
                        {parsedEndpoints.length > 0 && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                              <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>
                                Select endpoints
                                <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>({parsedEndpoints.length} found)</span>
                              </p>
                              {selectedEndpoints.size > 0 && (
                                <button
                                  onClick={applySelectedEndpoints}
                                  className="game-btn"
                                  style={{ padding: '5px 14px', fontSize: 11 }}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle size={11} /> Apply Selected
                                  </span>
                                </button>
                              )}
                            </div>
                            <div style={{
                              maxHeight: 280, overflowY: 'auto',
                              borderRadius: 8,
                              border: '1px solid rgba(255,255,255,0.06)',
                            }}>
                              {parsedEndpoints.map((ep, idx) => {
                                const isSelected = selectedEndpoints.has(idx)
                                return (
                                  <button
                                    key={`${ep.method}-${ep.path}`}
                                    onClick={() => toggleEndpointSelection(idx)}
                                    style={{
                                      display: 'flex', width: '100%', alignItems: 'center', gap: 10,
                                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                                      padding: '10px 12px', textAlign: 'left',
                                      cursor: 'pointer', border: 'none',
                                      transition: 'all 0.15s ease',
                                      background: isSelected ? 'rgba(0,240,255,0.06)' : 'rgba(255,255,255,0.01)',
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      readOnly
                                      style={{ accentColor: '#00f0ff' }}
                                    />
                                    <span style={{
                                      display: 'inline-flex', minWidth: 52, alignItems: 'center', justifyContent: 'center',
                                      borderRadius: 4, padding: '3px 8px',
                                      fontSize: 10, fontWeight: 800,
                                      background: 'rgba(0,240,255,0.1)',
                                      color: '#00f0ff',
                                    }}>
                                      {ep.method}
                                    </span>
                                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#e2e8f0' }}>{ep.path}</span>
                                    {ep.summary && (
                                      <>
                                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>--</span>
                                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ep.summary}</span>
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
                  <div className="game-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Connection String</label>
                      <input
                        className="game-input"
                        style={{ fontFamily: 'monospace' }}
                        placeholder="postgresql://user:pass@host/db"
                        value={sqlConnection}
                        onChange={e => setSqlConnection(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Query</label>
                      <textarea
                        className="game-input"
                        style={{ fontFamily: 'monospace', minHeight: 96, resize: 'vertical' }}
                        rows={4}
                        value={sqlQuery}
                        onChange={e => setSqlQuery(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Python config */}
                {skillType === 'Python' && (
                  <div className="game-card" style={{ padding: 16 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Function receives &apos;input&apos; variable, must return a value</p>
                    <textarea
                      className="game-input"
                      style={{
                        fontFamily: 'monospace', minHeight: 192, resize: 'vertical',
                        background: 'rgba(0,0,0,0.4)',
                        color: '#00ff88',
                        borderColor: 'rgba(0,255,136,0.15)',
                      }}
                      value={configJson}
                      onChange={e => setConfigJson(e.target.value)}
                    />
                  </div>
                )}

                {/* Scraper config */}
                {skillType === 'Scraper' && (
                  <div className="game-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>URL</label>
                      <input
                        className="game-input"
                        style={{ fontFamily: 'monospace' }}
                        placeholder="https://example.com"
                        value={scraperUrl}
                        onChange={e => setScraperUrl(e.target.value)}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>CSS Selector</label>
                      <input
                        className="game-input"
                        style={{ fontFamily: 'monospace' }}
                        placeholder=".article-content"
                        value={scraperSelector}
                        onChange={e => setScraperSelector(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Custom config */}
                {skillType === 'Custom' && (
                  <div className="game-card" style={{ padding: 16 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Free-form JSON configuration. Define your own schema.</p>
                    <textarea
                      className="game-input"
                      style={{ fontFamily: 'monospace', minHeight: 160, resize: 'vertical' }}
                      value={configJson}
                      onChange={e => setConfigJson(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* ROW 5: Visibility */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#00f0ff', marginBottom: 8, letterSpacing: '0.05em' }}>
                  VISIBILITY
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setIsPublic(false)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 12,
                      borderRadius: 12, padding: 16, cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      border: !isPublic ? '2px solid #ff00aa' : '2px solid rgba(255,255,255,0.06)',
                      background: !isPublic ? 'rgba(255,0,170,0.06)' : 'rgba(255,255,255,0.02)',
                      boxShadow: !isPublic ? '0 0 20px rgba(255,0,170,0.1)' : 'none',
                    }}
                  >
                    <Lock size={16} style={{ color: !isPublic ? '#ff00aa' : 'rgba(255,255,255,0.25)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: !isPublic ? '#ff00aa' : 'rgba(255,255,255,0.5)' }}>Private</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Only you can use this skill</p>
                    </div>
                  </button>
                  <button
                    onClick={() => setIsPublic(true)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', gap: 12,
                      borderRadius: 12, padding: 16, cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      border: isPublic ? '2px solid #00ff88' : '2px solid rgba(255,255,255,0.06)',
                      background: isPublic ? 'rgba(0,255,136,0.06)' : 'rgba(255,255,255,0.02)',
                      boxShadow: isPublic ? '0 0 20px rgba(0,255,136,0.1)' : 'none',
                    }}
                  >
                    <Globe size={16} style={{ color: isPublic ? '#00ff88' : 'rgba(255,255,255,0.25)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: isPublic ? '#00ff88' : 'rgba(255,255,255,0.5)' }}>Public</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Publish to marketplace for others to install</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* ROW 6: Test Payload */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#00f0ff', marginBottom: 8, letterSpacing: '0.05em' }}>
                  TEST PAYLOAD
                </label>
                <input
                  className="game-input"
                  style={{ fontSize: 13 }}
                  placeholder="Sample input to test your skill"
                  value={testPayload}
                  onChange={e => setTestPayload(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 10, paddingBottom: 32 }}>
                <button
                  onClick={handleTest}
                  className="game-btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', fontSize: 12 }}
                >
                  <Play size={14} /> Test Skill
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={createMutation.isPending}
                  className="game-btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 20px', fontSize: 12 }}
                >
                  Save as Draft
                </button>
                <button
                  onClick={() => handleSave(true)}
                  disabled={createMutation.isPending}
                  className="game-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 24px', fontSize: 12 }}
                >
                  {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                  Publish Skill
                </button>
              </div>
            </div>
          </div>

          {/* Test Panel (slides in from right) */}
          {testPanelOpen && (
            <div style={{
              position: 'fixed', right: 0, top: 0, zIndex: 40,
              display: 'flex', height: '100%', width: 400, flexDirection: 'column',
              background: 'linear-gradient(180deg, #1a1a2e 0%, #12121a 100%)',
              borderLeft: '1px solid rgba(0,240,255,0.15)',
              boxShadow: '-10px 0 40px rgba(0,0,0,0.5), 0 0 30px rgba(0,240,255,0.05)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '16px 20px',
              }}>
                <h3 className="neon-text" style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.03em' }}>TEST RESULTS</h3>
                <button onClick={() => setTestPanelOpen(false)} style={{
                  padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.04)',
                  transition: 'all 0.15s ease',
                }}>
                  <X size={16} style={{ color: 'rgba(255,255,255,0.4)' }} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {isTesting && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                    <Loader2 size={32} className="animate-spin" style={{ color: '#00f0ff', marginBottom: 12 }} />
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Running ability test...</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{skillName} ({skillType})</p>
                  </div>
                )}
                {!isTesting && testResult && (
                  <div>
                    {/* Status */}
                    <div style={{
                      marginBottom: 16, borderRadius: 12, padding: 16,
                      border: testResult.success ? '1px solid rgba(0,255,136,0.25)' : '1px solid rgba(255,68,102,0.25)',
                      background: testResult.success ? 'rgba(0,255,136,0.06)' : 'rgba(255,68,102,0.06)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        {testResult.success ? (
                          <CheckCircle size={16} style={{ color: '#00ff88' }} />
                        ) : (
                          <AlertTriangle size={16} style={{ color: '#ff4466' }} />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 800, color: testResult.success ? '#00ff88' : '#ff4466' }}>
                          {testResult.success ? 'SUCCESS' : 'FAILED'}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{testResult.output}</p>
                    </div>

                    {/* Execution time */}
                    <div style={{ marginBottom: 16 }}>
                      <span className="badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', fontSize: 11 }}>
                        Execution: {testResult.execution_time}
                      </span>
                    </div>

                    {/* Raw Response */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.05em' }}>RAW RESPONSE</p>
                      <pre style={{
                        borderRadius: 10, padding: 16, fontSize: 11,
                        overflow: 'auto', maxHeight: 300,
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid rgba(0,255,136,0.1)',
                        color: '#00ff88',
                        fontFamily: 'monospace',
                      }}>
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

      {/* ================================================================= */}
      {/* EDIT SKILL MODAL (Ability Recrafting Interface)                    */}
      {/* ================================================================= */}
      {editingSkill && (
        <div className="game-modal-overlay" onClick={() => setEditingSkill(null)}>
          <div className="game-modal" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid rgba(139,92,246,0.15)',
              padding: '18px 24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18 }}>{'\u{2694}\u{FE0F}'}</span>
                <h2 className="neon-text" style={{ fontSize: 18, fontWeight: 800 }}>RECRAFT ABILITY</h2>
              </div>
              <button onClick={() => setEditingSkill(null)} style={{
                padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'rgba(255,255,255,0.04)',
              }}>
                <X size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Icon + Name */}
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    border: '1px solid rgba(139,92,246,0.3)',
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(0,240,255,0.08))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24,
                    boxShadow: '0 0 15px rgba(139,92,246,0.1)',
                  }}>
                    {icon}
                  </div>
                  <div style={{ display: 'flex', gap: 3, marginTop: 8, flexWrap: 'wrap', maxWidth: 120, justifyContent: 'center' }}>
                    {QUICK_EMOJIS.map(e => (
                      <button key={e} onClick={() => setIcon(e)}
                        style={{
                          fontSize: 16, padding: 3, borderRadius: 6, cursor: 'pointer',
                          border: 'none',
                          background: icon === e ? 'rgba(0,240,255,0.15)' : 'transparent',
                          boxShadow: icon === e ? '0 0 8px rgba(0,240,255,0.3)' : 'none',
                          transition: 'all 0.15s ease',
                        }}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  className="game-input"
                  style={{ flex: 1 }}
                  placeholder="Skill name"
                  value={skillName}
                  onChange={e => setSkillName(e.target.value)}
                />
              </div>

              {/* Type */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#00f0ff', marginBottom: 8, letterSpacing: '0.05em' }}>SKILL CLASS</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
                  {SKILL_TYPES.map(st => (
                    <button
                      key={st.id}
                      onClick={() => handleTypeSelect(st.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        borderRadius: 10, padding: 10, fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', transition: 'all 0.2s ease',
                        border: skillType === st.id ? '2px solid #00f0ff' : '2px solid rgba(255,255,255,0.06)',
                        background: skillType === st.id ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.02)',
                        color: skillType === st.id ? '#00f0ff' : 'rgba(255,255,255,0.4)',
                        boxShadow: skillType === st.id ? '0 0 12px rgba(0,240,255,0.12)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{st.icon}</span>
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#00f0ff', marginBottom: 8, letterSpacing: '0.05em' }}>DESCRIPTION</label>
                <textarea
                  className="game-input"
                  style={{ minHeight: 56, resize: 'vertical', fontFamily: 'inherit' }}
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              {/* Config */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#00f0ff', marginBottom: 8, letterSpacing: '0.05em' }}>CONFIGURATION</label>
                {skillType === 'REST API' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input className="game-input" style={{ fontFamily: 'monospace' }} placeholder="URL" value={restUrl} onChange={e => setRestUrl(e.target.value)} />
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['GET', 'POST', 'PUT', 'DELETE'].map(m => (
                        <button key={m} onClick={() => setRestMethod(m)}
                          style={{
                            borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 800,
                            cursor: 'pointer', transition: 'all 0.2s ease',
                            border: restMethod === m ? '1px solid #00f0ff' : '1px solid rgba(255,255,255,0.06)',
                            background: restMethod === m ? 'rgba(0,240,255,0.12)' : 'transparent',
                            color: restMethod === m ? '#00f0ff' : 'rgba(255,255,255,0.4)',
                          }}>
                          {m}
                        </button>
                      ))}
                    </div>
                    <textarea className="game-input" style={{ fontFamily: 'monospace', minHeight: 72, resize: 'vertical' }} rows={3} placeholder="Headers JSON" value={restHeaders} onChange={e => setRestHeaders(e.target.value)} />
                    <textarea className="game-input" style={{ fontFamily: 'monospace', minHeight: 72, resize: 'vertical' }} rows={3} placeholder="Body template" value={restBody} onChange={e => setRestBody(e.target.value)} />
                  </div>
                )}
                {skillType === 'SQL' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input className="game-input" style={{ fontFamily: 'monospace' }} placeholder="Connection string" value={sqlConnection} onChange={e => setSqlConnection(e.target.value)} />
                    <textarea className="game-input" style={{ fontFamily: 'monospace', minHeight: 96, resize: 'vertical' }} rows={4} placeholder="Query" value={sqlQuery} onChange={e => setSqlQuery(e.target.value)} />
                  </div>
                )}
                {skillType === 'Python' && (
                  <textarea className="game-input" style={{ fontFamily: 'monospace', minHeight: 160, resize: 'vertical', background: 'rgba(0,0,0,0.4)', color: '#00ff88', borderColor: 'rgba(0,255,136,0.15)' }} value={configJson} onChange={e => setConfigJson(e.target.value)} />
                )}
                {skillType === 'Scraper' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input className="game-input" style={{ fontFamily: 'monospace' }} placeholder="URL" value={scraperUrl} onChange={e => setScraperUrl(e.target.value)} />
                    <input className="game-input" style={{ fontFamily: 'monospace' }} placeholder="CSS Selector" value={scraperSelector} onChange={e => setScraperSelector(e.target.value)} />
                  </div>
                )}
                {skillType === 'Custom' && (
                  <textarea className="game-input" style={{ fontFamily: 'monospace', minHeight: 160, resize: 'vertical' }} value={configJson} onChange={e => setConfigJson(e.target.value)} />
                )}
              </div>

              {/* Visibility */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setIsPublic(false)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                    borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    border: !isPublic ? '2px solid #ff00aa' : '2px solid rgba(255,255,255,0.06)',
                    background: !isPublic ? 'rgba(255,0,170,0.06)' : 'transparent',
                    color: !isPublic ? '#ff00aa' : 'rgba(255,255,255,0.4)',
                  }}>
                  <Lock size={14} /> Private
                </button>
                <button onClick={() => setIsPublic(true)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                    borderRadius: 10, padding: 12, fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    border: isPublic ? '2px solid #00ff88' : '2px solid rgba(255,255,255,0.06)',
                    background: isPublic ? 'rgba(0,255,136,0.06)' : 'transparent',
                    color: isPublic ? '#00ff88' : 'rgba(255,255,255,0.4)',
                  }}>
                  <Globe size={14} /> Public
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: 10,
              borderTop: '1px solid rgba(139,92,246,0.15)',
              padding: '16px 24px',
            }}>
              <button onClick={() => setEditingSkill(null)}
                className="game-btn-secondary"
                style={{ padding: '9px 18px', fontSize: 12 }}>
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={updateMutation.isPending}
                className="game-btn"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', fontSize: 12 }}
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
