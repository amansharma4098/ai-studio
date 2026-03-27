'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Zap, Crown, Building2, Loader2, BarChart3, Bot, FileText, GitBranch } from 'lucide-react'
import { api } from '@/lib/api'

export default function BillingPage() {
  const qc = useQueryClient()

  const { data: plans = [] } = useQuery({
    queryKey: ['billing-plans'],
    queryFn: () => api.get('/billing/plans').then(r => r.data),
  })

  const { data: myPlan } = useQuery({
    queryKey: ['my-plan'],
    queryFn: () => api.get('/billing/my-plan').then(r => r.data),
  })

  const { data: usage } = useQuery({
    queryKey: ['billing-usage'],
    queryFn: () => api.get('/billing/usage').then(r => r.data),
  })

  const upgradeMutation = useMutation({
    mutationFn: (planId: string) => api.post('/billing/upgrade', { plan_id: planId }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-plan'] })
      qc.invalidateQueries({ queryKey: ['billing-usage'] })
    },
  })

  const currentPlanId = myPlan?.current_plan?.id || 'free'

  const PLAN_ICONS: Record<string, any> = { free: Zap, pro: Crown, enterprise: Building2 }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Plans & Billing</h1>
        <p className="mt-1 text-sm text-slate-500">Choose the plan that fits your needs</p>
      </div>

      {/* Current Usage */}
      {usage && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Current Usage</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <UsageCard icon={Bot} label="Agents" used={usage.agents_used} limit={usage.agents_limit} />
            <UsageCard icon={Zap} label="Runs" used={usage.runs_this_month} limit={usage.runs_limit} />
            <UsageCard icon={FileText} label="Documents" used={usage.documents_used} limit={usage.documents_limit} />
            <div className="rounded-xl bg-slate-50 p-4">
              <BarChart3 size={18} className="text-emerald-500 mb-2" />
              <div className="text-lg font-bold text-slate-800">${usage.estimated_cost_usd.toFixed(2)}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Est. Cost</div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {(usage.total_input_tokens / 1000).toFixed(0)}K in / {(usage.total_output_tokens / 1000).toFixed(0)}K out
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(plans as any[]).map((plan: any) => {
          const PlanIcon = PLAN_ICONS[plan.id] || Zap
          const isCurrent = plan.id === currentPlanId
          const isHighlighted = plan.highlighted

          return (
            <div
              key={plan.id}
              className={`rounded-2xl border-2 p-6 transition-all ${
                isHighlighted
                  ? 'border-emerald-400 bg-emerald-50/30 shadow-lg shadow-emerald-100'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              } ${isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
            >
              {isHighlighted && (
                <div className="mb-4 -mt-3 -mx-3">
                  <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white uppercase tracking-widest">Most Popular</span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  plan.id === 'enterprise' ? 'bg-amber-100 text-amber-600' :
                  plan.id === 'pro' ? 'bg-purple-100 text-purple-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  <PlanIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-slate-800">${plan.price_monthly}</span>
                <span className="text-sm text-slate-500">/month</span>
                {plan.price_yearly > 0 && (
                  <p className="text-[11px] text-slate-400 mt-1">${plan.price_yearly}/year (save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)</p>
                )}
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature: string) => (
                  <li key={feature} className="flex items-start gap-2 text-[13px] text-slate-600">
                    <Check size={14} className="shrink-0 mt-0.5 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Models</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {plan.models.map((m: string) => (
                    <span key={m} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{m}</span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => !isCurrent && upgradeMutation.mutate(plan.id)}
                disabled={isCurrent || upgradeMutation.isPending}
                className={`w-full mt-4 rounded-xl py-3 text-sm font-semibold transition-all ${
                  isCurrent
                    ? 'bg-slate-100 text-slate-500 cursor-default'
                    : isHighlighted
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {upgradeMutation.isPending ? (
                  <Loader2 size={16} className="animate-spin inline" />
                ) : isCurrent ? (
                  'Current Plan'
                ) : (
                  `Upgrade to ${plan.name}`
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function UsageCard({ icon: Icon, label, used, limit }: { icon: any; label: string; used: number; limit: number }) {
  const pct = limit === -1 ? 0 : Math.min((used / limit) * 100, 100)
  const limitText = limit === -1 ? 'Unlimited' : limit.toString()
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <Icon size={18} className="text-emerald-500 mb-2" />
      <div className="text-lg font-bold text-slate-800">{used}<span className="text-sm font-normal text-slate-400">/{limitText}</span></div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
      {limit !== -1 && (
        <div className="mt-2 h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  )
}
