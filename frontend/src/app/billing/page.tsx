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
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in" style={{ background: '#12121a', minHeight: '100vh' }}>
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(139,92,246,0.15))',
            border: '1px solid rgba(0,240,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={20} style={{ color: '#00f0ff' }} />
          </div>
          <div>
            <h1 className="neon-text" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>
              POWER-UPS
            </h1>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#64748b', letterSpacing: '0.5px', marginLeft: 53 }}>
          Upgrade your loadout. Unlock new capabilities.
        </p>
      </div>

      {/* Current Usage / HUD Stats */}
      {usage && (
        <div className="game-card mb-10" style={{ padding: 0 }}>
          <div style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <BarChart3 size={14} style={{ color: '#00f0ff' }} />
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '2px',
              textTransform: 'uppercase' as const, color: '#00f0ff'
            }}>
              SYSTEM STATUS
            </span>
          </div>
          <div style={{ padding: 24 }}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <UsageCard icon={Bot} label="Agents" used={usage.agents_used} limit={usage.agents_limit} />
              <UsageCard icon={Zap} label="Runs" used={usage.runs_this_month} limit={usage.runs_limit} />
              <UsageCard icon={FileText} label="Documents" used={usage.documents_used} limit={usage.documents_limit} />
              <div className="hud-stat" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <BarChart3 size={18} style={{ color: '#00ff88' }} />
                <div style={{ fontSize: 22, fontWeight: 800 }}>
                  <span className="neon-text-green">${usage.estimated_cost_usd.toFixed(2)}</span>
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '2px',
                  textTransform: 'uppercase' as const, color: '#64748b'
                }}>
                  Est. Cost
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  {(usage.total_input_tokens / 1000).toFixed(0)}K in / {(usage.total_output_tokens / 1000).toFixed(0)}K out
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section label */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24
      }}>
        <div style={{
          height: 1, flex: 1,
          background: 'linear-gradient(90deg, rgba(0,240,255,0.3), transparent)'
        }} />
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '3px',
          textTransform: 'uppercase' as const, color: '#64748b'
        }}>
          SELECT YOUR TIER
        </span>
        <div style={{
          height: 1, flex: 1,
          background: 'linear-gradient(270deg, rgba(139,92,246,0.3), transparent)'
        }} />
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(plans as any[]).map((plan: any) => {
          const PlanIcon = PLAN_ICONS[plan.id] || Zap
          const isCurrent = plan.id === currentPlanId
          const isHighlighted = plan.highlighted
          const isEnterprise = plan.id === 'enterprise'
          const isFree = plan.id === 'free'

          const glowClass = isEnterprise ? 'glow-purple' : isHighlighted ? 'glow-cyan' : ''
          const borderColor = isEnterprise
            ? 'rgba(139,92,246,0.3)'
            : isHighlighted
            ? 'rgba(0,240,255,0.3)'
            : 'rgba(255,255,255,0.06)'
          const iconColor = isEnterprise ? '#8b5cf6' : isHighlighted ? '#00f0ff' : '#64748b'
          const iconBg = isEnterprise
            ? 'rgba(139,92,246,0.12)'
            : isHighlighted
            ? 'rgba(0,240,255,0.12)'
            : 'rgba(255,255,255,0.04)'

          return (
            <div
              key={plan.id}
              className={`game-card ${glowClass} animate-fade-in`}
              style={{
                padding: 0,
                borderColor,
                opacity: isFree && !isCurrent ? 0.7 : 1,
                position: 'relative',
                display: 'flex', flexDirection: 'column',
                transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              {/* Top accent bar */}
              <div style={{
                height: 3, width: '100%',
                background: isEnterprise
                  ? 'linear-gradient(90deg, #8b5cf6, #ff00aa)'
                  : isHighlighted
                  ? 'linear-gradient(90deg, #00f0ff, #8b5cf6)'
                  : 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                borderRadius: '12px 12px 0 0'
              }} />

              <div style={{ padding: '24px 24px 20px' }}>
                {/* Most Popular badge */}
                {isHighlighted && (
                  <div style={{ marginBottom: 16 }}>
                    <span className="badge-info" style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
                      textTransform: 'uppercase' as const,
                      background: 'rgba(0,240,255,0.1)',
                      color: '#00f0ff',
                      border: '1px solid rgba(0,240,255,0.25)',
                      padding: '4px 12px', borderRadius: 999,
                      boxShadow: '0 0 12px rgba(0,240,255,0.15)'
                    }}>
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current plan indicator */}
                {isCurrent && (
                  <div style={{ marginBottom: 16 }}>
                    <span className="badge-success" style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
                      textTransform: 'uppercase' as const,
                      padding: '4px 12px', borderRadius: 999,
                      boxShadow: '0 0 12px rgba(0,255,136,0.15)'
                    }}>
                      Active
                    </span>
                  </div>
                )}

                {/* Plan icon + name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: iconBg,
                    border: `1px solid ${borderColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <PlanIcon size={22} style={{ color: iconColor }} />
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: 18, fontWeight: 800, color: '#e2e8f0',
                      letterSpacing: '-0.3px'
                    }}>
                      {plan.name}
                    </h3>
                    <span style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '1px',
                      textTransform: 'uppercase' as const,
                      color: isEnterprise ? '#8b5cf6' : isHighlighted ? '#00f0ff' : '#475569'
                    }}>
                      {isFree ? 'STARTER' : isEnterprise ? 'LEGENDARY' : 'ELITE'}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div style={{ marginBottom: 24 }}>
                  <span
                    className={isEnterprise ? 'neon-text-pink' : isHighlighted ? 'neon-text' : ''}
                    style={{
                      fontSize: 42, fontWeight: 900, lineHeight: 1,
                      color: isFree ? '#64748b' : undefined,
                      letterSpacing: '-1px'
                    }}
                  >
                    ${plan.price_monthly}
                  </span>
                  <span style={{ fontSize: 14, color: '#475569', marginLeft: 4 }}>/month</span>
                  {plan.price_yearly > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        ${plan.price_yearly}/year
                      </span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
                        background: 'rgba(0,255,136,0.1)',
                        color: '#00ff88',
                        border: '1px solid rgba(0,255,136,0.2)',
                        padding: '2px 8px', borderRadius: 999,
                        boxShadow: '0 0 8px rgba(0,255,136,0.1)'
                      }}>
                        SAVE {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: 20 }}>
                  {plan.features.map((feature: string) => (
                    <li key={feature} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      fontSize: 13, color: '#94a3b8', padding: '5px 0'
                    }}>
                      <Check size={14} style={{
                        color: '#00ff88', flexShrink: 0, marginTop: 2,
                        filter: 'drop-shadow(0 0 4px rgba(0,255,136,0.4))'
                      }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Models */}
                <div style={{ marginBottom: 20 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '2px',
                    textTransform: 'uppercase' as const, color: '#475569'
                  }}>
                    Models
                  </span>
                  <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {plan.models.map((m: string, idx: number) => (
                      <span
                        key={m}
                        className={idx % 2 === 0 ? 'badge-info' : 'badge-purple'}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div style={{ padding: '0 24px 24px', marginTop: 'auto' }}>
                <button
                  onClick={() => !isCurrent && upgradeMutation.mutate(plan.id)}
                  disabled={isCurrent || upgradeMutation.isPending}
                  className={isCurrent ? 'game-btn-secondary' : 'game-btn'}
                  style={{
                    width: '100%', padding: '14px 24px', borderRadius: 10,
                    fontSize: 13, fontWeight: 700, letterSpacing: '1px',
                    textTransform: 'uppercase' as const,
                    cursor: isCurrent ? 'default' : 'pointer',
                    opacity: isCurrent ? 0.5 : 1,
                    ...(isCurrent ? {} : isEnterprise ? {
                      background: 'linear-gradient(135deg, #8b5cf6, #ff00aa)',
                      boxShadow: '0 0 20px rgba(139,92,246,0.25)'
                    } : isHighlighted ? {
                      background: 'linear-gradient(135deg, #00f0ff, #8b5cf6)',
                      boxShadow: '0 0 20px rgba(0,240,255,0.25)'
                    } : {})
                  }}
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
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <div style={{
        marginTop: 40, textAlign: 'center', padding: '20px 0',
        borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        <p style={{ fontSize: 12, color: '#475569' }}>
          All plans include SSL encryption and 99.9% uptime SLA.
          Upgrade or downgrade anytime.
        </p>
      </div>
    </div>
  )
}

function UsageCard({ icon: Icon, label, used, limit }: { icon: any; label: string; used: number; limit: number }) {
  const pct = limit === -1 ? 0 : Math.min((used / limit) * 100, 100)
  const limitText = limit === -1 ? 'Unlimited' : limit.toString()
  const barColor = pct > 80 ? 'pink' : pct > 50 ? 'amber' : 'green'

  return (
    <div className="hud-stat" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Icon size={18} style={{
        color: pct > 80 ? '#ff00aa' : pct > 50 ? '#fbbf24' : '#00ff88',
        filter: `drop-shadow(0 0 6px ${pct > 80 ? 'rgba(255,0,170,0.4)' : pct > 50 ? 'rgba(251,191,36,0.4)' : 'rgba(0,255,136,0.4)'})`
      }} />
      <div style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0' }}>
        {used}
        <span style={{ fontSize: 13, fontWeight: 500, color: '#475569' }}>/{limitText}</span>
      </div>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '2px',
        textTransform: 'uppercase' as const, color: '#64748b'
      }}>
        {label}
      </div>
      {limit !== -1 && (
        <div className="xp-bar" style={{ marginTop: 4 }}>
          <div
            className={`xp-bar-fill ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}
