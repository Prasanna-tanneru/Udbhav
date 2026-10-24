import {useEffect,useState,type ReactNode} from 'react';
import {api} from '@/lib/api';
import {Card,EmptyState,LoadingState,MetricCard,SectionHeader} from '@/components/ui';
import {ArrowRight,BookOpen,Briefcase,Building2,CheckSquare,FlaskConical,GraduationCap,HeartHandshake,MapPin,Rocket,ShieldCheck,Target,Users} from 'lucide-react';
import ProblemWorkspace from '@/components/dashboard/pages/ProblemWorkspace';

type Props={onNavigate:(route:string)=>void};
const phaseForStatus=(status:string)=>({TEAM_FORMED:'Problem Understanding',RESEARCH:'Research',PROPOSAL:'Solution Design',SOLUTION_DEVELOPMENT:'Solution Development',PROTOTYPING:'Prototype Development',LAB_TESTING:'Prototype Development',FIELD_TESTING:'Field Testing',PILOT:'Field Testing',DEPLOYMENT_READY:'Deployment',DEPLOYED:'Deployment',CITIZEN_VERIFICATION:'Citizen Verification'} as Record<string,string>)[String(status||'').toUpperCase()]||'Solution Development';

function Recent({title,rows,onClick,viewAll,onNavigate}:{title:string;rows:any[];onClick?:(x:any)=>void;viewAll?:string;onNavigate?:(r:string)=>void}){
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {viewAll&&onNavigate&&(
          <button onClick={()=>onNavigate(viewAll)} className="text-xs font-bold text-primary-700 inline-flex items-center gap-1 hover:text-primary-900">
            View All <ArrowRight size={12}/>
          </button>
        )}
      </div>
      {!rows?.length?<p className="text-sm text-neutral-400">No records yet.</p>:
        <div className="space-y-2">
          {rows.slice(0,6).map((x:any)=>(
            <button key={x.id} onClick={()=>onClick?.(x)} className="w-full text-left rounded-lg border p-3 hover:bg-neutral-50 hover:border-primary-200 transition-colors">
              <b className="text-sm">{x.title||x.name||x.statement||x.status}</b>
              <p className="text-xs text-neutral-500 mt-1">{x.status||x.domain||x.department||x.district||''}</p>
            </button>
          ))}
        </div>
      }
    </Card>
  );
}

function useDashboard(loader:()=>Promise<any>){
  const[data,setData]=useState<any>(null),[error,setError]=useState('');
  useEffect(()=>{loader().then(setData).catch(e=>setError(e.message))},[]);
  return{data,error};
}

export function StudentCommandCentre({onNavigate}:Props){
  const{data,error}=useDashboard(api.studentDashboard);
  if(!data&&!error)return <LoadingState label="Loading student command centre…"/>;
  return (
    <div className="civic-page">
      <SectionHeader title="Student Innovation Command Centre" subtitle="Recommended challenges, applications, project work, milestones and contribution history in one place."/>
      {error&&<p className="text-error-600 text-sm mb-4">{error}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Active projects" value={data?.projects?.length||0} icon={<Rocket size={18}/>} onClick={()=>onNavigate('/dashboard/projects')}/>
        <MetricCard label="Open tasks" value={data?.tasks?.filter((x:any)=>x.status!=='DONE').length||0} icon={<CheckSquare size={18}/>} color="warning" onClick={()=>onNavigate('/dashboard/tasks')}/>
        <MetricCard label="Applications" value={data?.applications?.length||0} icon={<BookOpen size={18}/>} color="secondary" onClick={()=>onNavigate('/dashboard/marketplace')}/>
        <MetricCard label="Completed tasks" value={data?.contribution?.completedTasks||0} icon={<Target size={18}/>} color="success" onClick={()=>onNavigate('/dashboard/portfolio')}/>
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <Recent title="Recommended challenges" rows={data?.recommendedChallenges||[]} onClick={()=>onNavigate('/dashboard/marketplace')} viewAll="/dashboard/marketplace" onNavigate={onNavigate}/>
        <Recent title="My project work" rows={data?.projects||[]} onClick={()=>onNavigate('/dashboard/projects')} viewAll="/dashboard/projects" onNavigate={onNavigate}/>
        <Recent title="My tasks" rows={data?.tasks||[]} onClick={()=>onNavigate('/dashboard/tasks')} viewAll="/dashboard/tasks" onNavigate={onNavigate}/>
        <Recent title="Applications" rows={data?.applications||[]} onClick={()=>onNavigate('/dashboard/marketplace')} viewAll="/dashboard/marketplace" onNavigate={onNavigate}/>
      </div>
    </div>
  );
}

export function FacultyCommandCentre({onNavigate}:Props){
  const{data,error}=useDashboard(api.facultyDashboard);
  if(!data&&!error)return <LoadingState label="Loading faculty workspace…"/>;
  return (
    <div className="civic-page">
      <SectionHeader title="Faculty Mentorship Command Centre" subtitle="Mentorship load, proposal reviews, project supervision and research capability."/>
      {error&&<p className="text-error-600 text-sm">{error}</p>}
      <div className="grid sm:grid-cols-3 gap-4">
        <MetricCard label="Mentor capacity" value={data?.mentorCapacity||0} icon={<GraduationCap size={18}/>} onClick={()=>onNavigate('/dashboard/mentorship')}/>
        <MetricCard label="Active projects" value={data?.projects?.length||0} icon={<Rocket size={18}/>} color="secondary" onClick={()=>onNavigate('/dashboard/projects')}/>
        <MetricCard label="Pending proposal reviews" value={data?.pendingProposalReviews?.length||0} icon={<ShieldCheck size={18}/>} color="warning" onClick={()=>onNavigate('/dashboard/reviews')}/>
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <Recent title="Supervised projects" rows={data?.projects||[]} onClick={()=>onNavigate('/dashboard/projects')} viewAll="/dashboard/projects" onNavigate={onNavigate}/>
        <Recent title="Proposal review queue" rows={data?.pendingProposalReviews||[]} onClick={()=>onNavigate('/dashboard/reviews')} viewAll="/dashboard/reviews" onNavigate={onNavigate}/>
        <Recent title="Mentorship invitations" rows={data?.mentorshipInvitations||[]} onClick={()=>onNavigate('/dashboard/mentorship')} viewAll="/dashboard/mentorship" onNavigate={onNavigate}/>
        <Card className="p-5">
          <h3 className="font-semibold">Research profile</h3>
          <p className="text-sm text-neutral-500 mt-2">{data?.profile?.designation||'Faculty'} · {data?.profile?.department||'Department'}</p>
          <div className="flex flex-wrap gap-1 mt-3">
            {(data?.profile?.expertise||[]).map((x:string)=><span key={x} className="badge bg-primary-50 text-primary-700">{x}</span>)}
          </div>
          <button onClick={()=>onNavigate('/dashboard/profile')} className="mt-4 text-xs font-bold text-primary-700 inline-flex items-center gap-1 hover:text-primary-900">
            Edit profile <ArrowRight size={12}/>
          </button>
        </Card>
      </div>
    </div>
  );
}

export function UniversityCommandCentre({onNavigate}:Props){
  const{data,error}=useDashboard(api.universityOverview);
  if(!data&&!error)return <LoadingState label="Loading university overview…"/>;
  const projects=data?.projects||[],teams=data?.teams||[],faculty=data?.faculty||[],active=projects.filter((project:any)=>!['COMPLETED','ARCHIVED'].includes(String(project.status).toUpperCase())),completed=projects.filter((project:any)=>['COMPLETED','DEPLOYED'].includes(String(project.status).toUpperCase()));
  const phases=['Problem Understanding','Research','Solution Design','Solution Development','Prototype Development','Field Testing','Deployment','Citizen Verification'];
  const phaseCounts=phases.map(phase=>({phase,count:projects.filter((project:any)=>phaseForStatus(project.status)===phase).length}));
  return <div className="civic-page space-y-5"><SectionHeader title="University Overview" subtitle="Track your university’s participation in JanSamadhan, active solutions, collaborations, and project progress."/>{error&&<p className="text-error-600 text-sm">{error}</p>}<Card className="p-4"><div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><h2 className="text-lg font-bold text-primary-900">{data?.university?.name||'University profile'}</h2><p className="text-sm text-neutral-500">University ID: {data?.universityId||'Not configured'} · {data?.university?.district||'Jharkhand, India'}</p></div><span className="badge bg-success-50 text-success-700">Active</span></div></Card><div className="grid grid-cols-2 xl:grid-cols-6 gap-3"><MetricCard label="Challenges Participating In" value={data?.challenges?.length||0} icon={<Target size={18}/>} /><MetricCard label="Active Teams" value={teams.length} icon={<Users size={18}/>} color="secondary"/><MetricCard label="Active Projects" value={active.length} icon={<Rocket size={18}/>} color="accent"/><MetricCard label="Faculty Mentors" value={faculty.length} icon={<GraduationCap size={18}/>} color="success"/><MetricCard label="Industry Collaborations" value={(data?.collaborations||[]).length} icon={<HeartHandshake size={18}/>} color="warning"/><MetricCard label="Completed Solutions" value={completed.length} icon={<CheckSquare size={18}/>} color="secondary"/></div><section><SectionHeader title="Project Progress"/><Card className="p-4 space-y-3">{phaseCounts.map(item=><div className="flex items-center gap-3" key={item.phase}><span className="w-44 text-xs text-neutral-600">{item.phase}</span><div className="h-2 flex-1 bg-neutral-200 rounded-full overflow-hidden"><div className="h-full bg-primary-600" style={{width:`${projects.length?item.count/projects.length*100:0}%`}}/></div><b className="w-5 text-right text-sm text-primary-900">{item.count}</b></div>)}<button className="btn-secondary text-xs mt-2" onClick={()=>onNavigate('/dashboard/projects')}>View Projects</button></Card></section><div className="grid lg:grid-cols-2 gap-5"><section><SectionHeader title="Active Projects"/><div className="space-y-2">{active.slice(0,4).map((project:any)=><button className="w-full text-left rounded-lg border p-3 hover:border-primary-300" key={project.id} onClick={()=>onNavigate('/dashboard/projects')}><div className="flex justify-between gap-2"><b className="text-sm text-primary-900">{project.title}</b><span className="text-xs text-primary-700">{project.progress||0}%</span></div><p className="text-xs text-neutral-500 mt-1">{project.teamName||'Team'} · {phaseForStatus(project.status)} · {project.facultyMentorName||'Faculty mentor pending'}</p></button>)}{!active.length&&<Card><EmptyState icon={<Rocket size={32}/>} title="No projects yet" description="Register a team for a verified challenge to start developing a solution."/></Card>}</div></section><section><SectionHeader title="Recent Milestones"/><div className="space-y-2">{(data?.milestones||[]).slice(0,5).map((milestone:any)=><div className="rounded-lg border p-3" key={`${milestone.projectId}-${milestone.id}`}><b className="text-sm">{milestone.title}</b><p className="text-xs text-neutral-500 mt-1">{milestone.projectTitle} · {milestone.date?new Date(milestone.date).toLocaleDateString('en-IN'):'Date pending'}</p></div>)}{!(data?.milestones||[]).length&&<p className="text-sm text-neutral-400">No major milestones yet.</p>}</div></section></div><div className="grid lg:grid-cols-2 gap-5"><section><SectionHeader title="Faculty Mentors"/><div className="space-y-2">{faculty.slice(0,4).map((mentor:any)=><div className="rounded-lg border p-3" key={mentor.id}><b className="text-sm">{mentor.name}</b><p className="text-xs text-neutral-500">{mentor.department||'Department'} · {teams.filter((team:any)=>team.facultyMentorId===mentor.id||team.facultyMentorId===mentor.facultyId).length} teams</p></div>)}<button className="btn-secondary text-xs" onClick={()=>onNavigate('/dashboard/faculty')}>View All Faculty Mentors</button></div></section><section><SectionHeader title="Collaboration"/><div className="space-y-2">{(data?.collaborations||[]).slice(0,4).map((collaboration:any)=><div className="rounded-lg border p-3" key={collaboration.id}><b className="text-sm">{collaboration.projectTitle}</b><p className="text-xs text-neutral-500 mt-1">↳ {collaboration.partner||'Industry partner'} · {collaboration.mentor||'Mentor pending'}</p></div>)}{!(data?.collaborations||[]).length&&<p className="text-sm text-neutral-400">No industry collaborations yet.</p>}<button className="btn-secondary text-xs" onClick={()=>onNavigate('/dashboard/industry-collaboration')}>View Industry Collaboration</button></div></section></div><section><SectionHeader title="Needs Attention"/><Card className="p-4">{(data?.attention||[]).length?(data.attention.slice(0,5).map((item:any)=><div className="flex items-center gap-3 border-b last:border-0 py-2" key={item.id}><span className="text-amber-600">!</span><div className="flex-1"><b className="text-sm">{item.title}</b><p className="text-xs text-neutral-500">{item.projectTitle}</p></div><button className="btn-secondary text-xs" onClick={()=>onNavigate('/dashboard/projects')}>Open Project</button></div>)):<p className="text-sm text-success-700">✓ All projects are on track</p>}</Card></section><section><SectionHeader title="Quick Actions"/><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/challenges')}>Discover Challenges</button><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/teams')}>My Teams</button><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/projects')}>Projects</button><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/milestones')}>Milestones</button><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/faculty')}>Faculty Mentors</button><button className="btn-secondary" onClick={()=>onNavigate('/dashboard/industry-collaboration')}>Industry Collaboration</button></div></section></div>;
}

export function IndustryCommandCentre({onNavigate}:Props){
  const{data,error}=useDashboard(api.industryDashboard);
  if(!data&&!error)return <LoadingState label="Loading industry & CSR workspace…"/>;
  return (
    <div className="civic-page">
      <SectionHeader title="Industry & CSR Collaboration Centre" subtitle="Collaboration requests, project support, funding opportunities, capabilities and measurable impact."/>
      {error&&<p className="text-error-600 text-sm">{error}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Collaborations" value={data?.collaborations?.length||0} icon={<Briefcase size={18}/>} onClick={()=>onNavigate('/dashboard/collaborations')}/>
        <MetricCard label="Commitments" value={data?.commitments?.length||0} icon={<HeartHandshake size={18}/>} color="success" onClick={()=>onNavigate('/dashboard/industry-mentorship')}/>
        <MetricCard label="Funding requests" value={data?.fundingRequests?.length||0} icon={<Target size={18}/>} color="warning" onClick={()=>onNavigate('/dashboard/csr')}/>
        <MetricCard label="Suggested projects" value={data?.suggestedProjects?.length||0} icon={<Rocket size={18}/>} color="secondary" onClick={()=>onNavigate('/dashboard/projects')}/>
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <Recent title="Suggested collaborations" rows={data?.suggestedProjects||[]} onClick={()=>onNavigate('/dashboard/projects')} viewAll="/dashboard/projects" onNavigate={onNavigate}/>
        <Recent title="Funding opportunities" rows={data?.fundingRequests||[]} onClick={()=>onNavigate('/dashboard/csr')} viewAll="/dashboard/csr" onNavigate={onNavigate}/>
        <Recent title="Active commitments" rows={data?.commitments||[]} onClick={()=>onNavigate('/dashboard/industry-mentorship')} viewAll="/dashboard/industry-mentorship" onNavigate={onNavigate}/>
        <Card className="p-5">
          <h3 className="font-semibold">Partner capability</h3>
          <p className="text-sm text-neutral-500 mt-2">{data?.partner?.name||'Partner profile'}</p>
          <div className="flex flex-wrap gap-1 mt-3">
            {(data?.partner?.capabilities||[]).map((x:string)=><span key={x} className="badge bg-secondary-50 text-secondary-700">{x}</span>)}
          </div>
          <button onClick={()=>onNavigate('/dashboard/industry-support')} className="mt-4 text-xs font-bold text-primary-700 inline-flex items-center gap-1 hover:text-primary-900">
            Industry support <ArrowRight size={12}/>
          </button>
        </Card>
      </div>
      <div className="mt-6"><ProblemWorkspace mode="INDUSTRY" /></div>
    </div>
  );
}

export function DistrictCommandCentre({onNavigate}:Props){
  const{data,error}=useDashboard(api.districtDashboard);
  if(!data&&!error)return <LoadingState label="Loading district intelligence…"/>;
  return (
    <div className="civic-page">
      <SectionHeader title={`${data?.district||'District'} Innovation Command Centre`} subtitle="District-scoped challenge intelligence, critical clusters, pilots and alerts."/>
      {error&&<p className="text-error-600 text-sm">{error}</p>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Challenges" value={data?.challenges?.length||0} icon={<MapPin size={18}/>} onClick={()=>onNavigate('/dashboard/challenges')}/>
        <MetricCard label="Critical clusters" value={data?.criticalClusters?.length||0} icon={<Target size={18}/>} color="error" onClick={()=>onNavigate('/dashboard/clusters')}/>
        <MetricCard label="Projects" value={data?.projects?.length||0} icon={<Rocket size={18}/>} color="secondary" onClick={()=>onNavigate('/dashboard/projects')}/>
        <MetricCard label="Pilots" value={data?.pilots?.length||0} icon={<Building2 size={18}/>} color="success" onClick={()=>onNavigate('/dashboard/deployments')}/>
      </div>
      <div className="grid lg:grid-cols-2 gap-5 mt-6">
        <Recent title="Critical alerts" rows={data?.alerts||[]} onClick={()=>onNavigate('/dashboard/validation')} viewAll="/dashboard/validation" onNavigate={onNavigate}/>
        <Recent title="Emerging clusters" rows={data?.criticalClusters||[]} onClick={()=>onNavigate('/dashboard/clusters')} viewAll="/dashboard/clusters" onNavigate={onNavigate}/>
        <Card className="p-5">
          <h3 className="font-semibold">Domain distribution</h3>
          <div className="mt-3 space-y-2">
            {(data?.domainDistribution||[]).map((x:any)=>(
              <button key={x.name} onClick={()=>onNavigate('/dashboard/challenges')} className="w-full flex justify-between text-sm hover:text-primary-700 transition-colors">
                <span>{x.name}</span><b>{x.value}</b>
              </button>
            ))}
          </div>
        </Card>
        <Recent title="Pilot activity" rows={data?.pilots||[]} onClick={()=>onNavigate('/dashboard/deployments')} viewAll="/dashboard/deployments" onNavigate={onNavigate}/>
      </div>
    </div>
  );
}
