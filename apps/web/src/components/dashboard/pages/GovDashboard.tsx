import { useState } from 'react';
import {
  FileText, Users, Rocket, Target, ShieldCheck,
  MapPin, AlertTriangle, CheckCircle2, Clock, Layers,
  ArrowRight, Brain, Search,
} from 'lucide-react';

import { MetricCard, Card, SectionHeader } from '@/components/ui';
import { JHARKHAND_DISTRICTS } from '@/data/demo';
import { usePlatform } from '@/context/PlatformContext';
import { api } from '@/lib/api';
import { formatNumber, timeAgo } from '@/lib/constants';

interface GovDashboardProps {
  onNavigate: (route: string) => void;
}

export default function GovDashboard({ onNavigate }: GovDashboardProps) {
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState<string | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const {challenges,projects,clusters,universities,analytics}=usePlatform();
  const pendingValidation = challenges.filter((c) => c.status === 'PENDING_VALIDATION' || c.status === 'AI_PROCESSED');
  const validated = challenges.filter((c) => c.status === 'VALIDATED' || c.status === 'ASSIGNED' || c.status === 'OPEN_FOR_INSTITUTIONS');

  async function handleCopilot() {
    if (!copilotQuery.trim()) return;
    setCopilotLoading(true);
    try { const result=await api.analyticsCopilot(copilotQuery); setCopilotAnswer(result.answer||'No grounded answer was returned.'); }
    catch(error){setCopilotAnswer(`Copilot unavailable: ${(error as Error).message}`);}
    finally{setCopilotLoading(false);}
  }

  return (
    <div className="civic-page space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-neutral-900">Government Command Centre</h1>
        <p className="text-sm text-neutral-500 mt-1">Statewide challenge intelligence, validation, and project oversight from the live JANSETU data layer.</p>
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Challenges" value={analytics?.totalChallenges ?? challenges.length} icon={<FileText size={18} />} color="primary" trend={{ value: "8%", up: true }} onClick={() => onNavigate('/dashboard/challenges')} />
        <MetricCard label="Pending Validation" value={pendingValidation.length} icon={<ShieldCheck size={18} />} color="warning" onClick={() => onNavigate('/dashboard/validation')} />
        <MetricCard label="Active Projects" value={analytics?.projects ?? projects.length} icon={<Rocket size={18} />} color="secondary" onClick={() => onNavigate('/dashboard/projects')} />
        <MetricCard label="Citizens Impacted" value={analytics?.citizensImpacted ?? "—"} icon={<Users size={18} />} color="accent" onClick={() => onNavigate('/dashboard/gov-citizens')} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Validated" value={analytics?.validated ?? validated.length} icon={<CheckCircle2 size={18} />} color="success" onClick={() => onNavigate('/dashboard/validation')} />
        <MetricCard label="Critical Priority" value={analytics?.highPriority ?? challenges.filter(c=>c.priority_score>=70).length} icon={<AlertTriangle size={18} />} color="error" onClick={() => onNavigate('/dashboard/alerts')} />
        <MetricCard label="Deployed Solutions" value={projects.filter(p=>["DEPLOYED","SCALING","COMPLETED"].includes(p.status)).length} icon={<Target size={18} />} color="success" onClick={() => onNavigate('/dashboard/deployments')} />
        <MetricCard label="Universities Engaged" value={analytics?.universities ?? universities.length} icon={<Users size={18} />} color="primary" onClick={() => onNavigate('/dashboard/gov-ecosystem')} />
      </div>

      {/* AI Copilot */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
            <Brain size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Government AI Copilot</h3>
            <p className="text-xs text-neutral-500">Ask natural-language questions about analytics data</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCopilot()}
              placeholder="e.g., Show high-priority water challenges in Ranchi"
              className="input pl-10"
            />
          </div>
          <button onClick={handleCopilot} disabled={copilotLoading} className="btn-primary">
            {copilotLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Brain size={16} />}
            Ask
          </button>
        </div>
        {copilotAnswer && (
          <div className="mt-3 rounded-lg bg-primary-50 border border-primary-200 p-4 animate-fade-in">
            <div className="flex items-start gap-2">
              <Brain size={16} className="text-primary-600 shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-700 leading-relaxed">{copilotAnswer}</p>
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {['Show high-priority water challenges in Ranchi', 'Which projects are delayed?', 'Show funding utilization', 'Which solutions can be reused?'].map((s) => (
            <button key={s} onClick={() => { setCopilotQuery(s); }} className="text-xs px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors">
              {s}
            </button>
          ))}
        </div>
      </Card>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Validation Queue */}
        <Card className="p-5">
          <SectionHeader title="Validation Queue" subtitle={`${pendingValidation.length} challenges awaiting review`} />
          <div className="space-y-2">
            {pendingValidation.map((ch) => (
              <button key={ch.id} onClick={() => onNavigate('/dashboard/validation')} className="w-full flex items-center gap-3 p-3 rounded-lg border border-neutral-200 hover:border-primary-200 hover:bg-primary-50/30 transition-colors text-left">
                <div className={`w-2 h-12 rounded-full ${ch.priority_level === 'CRITICAL' ? 'bg-error-500' : ch.priority_level === 'HIGH' ? 'bg-orange-500' : 'bg-amber-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{ch.title}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {ch.district}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(ch.created_at)}</span>
                  </div>
                </div>
                <ArrowRight size={16} className="text-neutral-300" />
              </button>
            ))}
          </div>
        </Card>

        {/* District Distribution */}
        <Card className="p-5">
          <SectionHeader title="District Distribution" subtitle="Challenges by district (top 5)" />
          <div className="space-y-3">
            {((analytics?.districts||[]).length ? analytics.districts.map((x:any,i:number)=>({id:x.name,name:x.name,challenge_count:x.value,active_projects:projects.filter(p=>challenges.find(c=>c.id===p.challenge_id)?.district===x.name).length})) : JHARKHAND_DISTRICTS).slice(0, 5).map((d:any, i:number) => (
              <div key={d.id}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-neutral-700">{d.name}</span>
                  <span className="text-neutral-500">{d.challenge_count} challenges · {d.active_projects} projects</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary-500 to-secondary-500" style={{ width: `${Math.min(100, ((d.challenge_count||0) / Math.max(1, ...(((analytics?.districts||[]).map((x:any)=>x.value)) as number[]), 1)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Clusters */}
      <div>
        <SectionHeader title="Emerging Challenge Clusters" subtitle="Geographic groupings of related challenges with trend analysis" action={<button onClick={() => onNavigate('/dashboard/clusters')} className="btn-ghost text-sm">View All <ArrowRight size={14} /></button>} />
        <div className="grid md:grid-cols-3 gap-4">
          {clusters.map((cluster) => (
            <button key={cluster.id} onClick={() => onNavigate('/dashboard/clusters')} className="card-hover p-4 text-left w-full">
              <div className="flex items-start justify-between mb-2">
                <span className="badge bg-primary-50 text-primary-700">{cluster.domain}</span>
                <span className={`badge ${cluster.severity === 'CRITICAL' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'} border ${cluster.severity === 'CRITICAL' ? 'border-red-200' : 'border-orange-200'}`}>
                  {cluster.severity}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 leading-snug mb-2">{cluster.title}</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-neutral-400">Reports:</span> <span className="font-semibold text-neutral-700">{cluster.report_count}</span></div>
                <div><span className="text-neutral-400">Affected:</span> <span className="font-semibold text-neutral-700">{formatNumber(cluster.estimated_affected)}</span></div>
                <div><span className="text-neutral-400">Trend:</span> <span className={`font-semibold ${cluster.trend === 'INCREASING' ? 'text-error-600' : 'text-neutral-700'}`}>{cluster.trend.toLowerCase()}</span></div>
                <div><span className="text-neutral-400">Growth:</span> <span className="font-semibold text-neutral-700">{cluster.growth_rate}%</span></div>
              </div>
              <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center gap-1.5 text-xs text-neutral-400">
                <Layers size={12} /> {cluster.blocks?.join(', ')}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Projects */}
      <div>
        <SectionHeader title="Active Projects" subtitle="Innovation projects in progress" action={<button onClick={() => onNavigate('/dashboard/projects')} className="btn-ghost text-sm">View All <ArrowRight size={14} /></button>} />
        <div className="grid md:grid-cols-2 gap-4">
          {projects.slice(0,6).map((proj) => (
            <button key={proj.id} onClick={() => onNavigate('/dashboard/projects')} className="card-hover p-4 text-left w-full">
              <div className="flex items-start justify-between mb-2">
                <span className="badge bg-indigo-50 text-indigo-700">{proj.status.replace(/_/g, ' ')}</span>
                <span className="badge bg-neutral-100 text-neutral-600">IRL {proj.irl_level}</span>
              </div>
              <h3 className="text-sm font-semibold text-neutral-900 leading-snug mb-1.5">{proj.title}</h3>
              <p className="text-xs text-neutral-500 mb-3">{proj.organization_name}</p>
              <div className="flex items-center gap-4 text-xs text-neutral-400 pt-3 border-t border-neutral-100">
                <span className="flex items-center gap-1"><Users size={12} /> {proj.team_members?.length || 0} members</span>
                <span className="flex items-center gap-1"><Target size={12} /> {proj.beneficiaries?.toLocaleString('en-IN')} beneficiaries</span>
                <span className="font-mono ml-auto">{proj.project_code}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
