import {useEffect,useMemo,useState} from 'react';
import {api} from '@/lib/api';
import {useAuth} from '@/context/AuthContext';
import {usePlatform} from '@/context/PlatformContext';
import {Card,EmptyState,LoadingState,MetricCard,SectionHeader} from '@/components/ui';
import {BookOpenCheck,CheckCircle2,Clock,FolderGit2,GraduationCap,Handshake,ListChecks,MailCheck,Rocket,Sparkles,Target,UserCheck,Users} from 'lucide-react';
import { createNotification } from '@/lib/notificationService';

export const UNIVERSITY_SUPPORT_TYPES = ['ALL', 'TESTING', 'MENTORSHIP', 'PROTOTYPING', 'DEPLOYMENT', 'FUNDING', 'RESEARCH', 'SCALING'] as const;

export function normalizeSupportType(value: string | null | undefined) {
  return String(value || '').trim().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').toUpperCase();
}

export function supportTypeMatchesProject(project: any, supportType: string) {
  if (!supportType || supportType === 'ALL') return true;
  const normalizedChoice = normalizeSupportType(supportType);
  const rawSupportTypes = [
    ...(Array.isArray(project?.supportTypes) ? project.supportTypes : []),
    ...(Array.isArray(project?.supportNeeded) ? project.supportNeeded : []),
    ...(Array.isArray(project?.support_types) ? project.support_types : []),
    ...(Array.isArray(project?.collaborationNeeds) ? project.collaborationNeeds : []),
    ...(Array.isArray(project?.industryNeeds) ? project.industryNeeds : []),
    project?.supportType,
    project?.support_type,
    project?.collaborationType,
    project?.industrySupportType,
    project?.industry_support_type,
  ].map(value => normalizeSupportType(String(value || ''))).filter(Boolean);

  if (!rawSupportTypes.length) {
    const fallback = project?.status || '';
    return normalizedChoice === 'ALL' || fallback.includes(normalizedChoice) || normalizedChoice === 'MENTORSHIP' && Boolean(project?.industryMentorName);
  }

  return rawSupportTypes.includes(normalizedChoice) || rawSupportTypes.some(value => value.includes(normalizedChoice) || normalizedChoice.includes(value));
}

export function filterUniversityCollaborationProjects(projects: any[] = [], universityId?: string, supportType: string = 'ALL') {
  const normalizedId = String(universityId || '').trim();
  return (projects || []).filter((project: any) => {
    const projectUniversityId = String(project?.universityId || project?.organizationId || project?.organization_id || '').trim();
    const matchesUniversity = !normalizedId || projectUniversityId === normalizedId || (projectUniversityId === '' && !normalizedId);
    return matchesUniversity && supportTypeMatchesProject(project, supportType);
  });
}

export function StudentPortfolioPage(){
  const{data,error}=useLoad(api.studentDashboard); if(!data&&!error)return <LoadingState label="Loading contribution portfolio…"/>;
  const completed=(data?.tasks||[]).filter((x:any)=>x.status==='DONE');
  return <div className="civic-page space-y-5"><SectionHeader title="Student Contribution Portfolio" subtitle="Verified project participation, completed work and public portfolio links are derived from live platform records."/>{error&&<p className="text-error-600 text-sm">{error}</p>}
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"><MetricCard label="Projects" value={data?.projects?.length||0} icon={<Rocket size={18}/>}/><MetricCard label="Completed tasks" value={completed.length} icon={<CheckCircle2 size={18}/>} color="success"/><MetricCard label="Applications" value={data?.applications?.length||0} icon={<BookOpenCheck size={18}/>} color="secondary"/><MetricCard label="Skills" value={data?.profile?.skills?.length||0} icon={<Target size={18}/>} color="accent"/></div>
    <div className="grid lg:grid-cols-2 gap-5"><Card className="p-5"><h3 className="font-semibold">Profile</h3><p className="text-sm text-neutral-500 mt-2">{data?.profile?.department||'Department'} · Year {data?.profile?.year||'—'}</p><div className="flex flex-wrap gap-1 mt-3">{(data?.profile?.skills||[]).map((x:string)=><span key={x} className="badge bg-primary-50 text-primary-700">{x}</span>)}</div>{data?.profile?.github&&<a className="text-sm text-primary-600 mt-4 inline-flex" href={data.profile.github} target="_blank" rel="noreferrer"><FolderGit2 size={15} className="mr-1"/> GitHub profile</a>}</Card><Card className="p-5"><h3 className="font-semibold">Completed contributions</h3><div className="space-y-2 mt-3">{completed.length?completed.map((x:any)=><div className="rounded-lg border p-3" key={x.id}><b className="text-sm">{x.title}</b><p className="text-xs text-neutral-500">{x.description||'Project task'} · {x.priority}</p></div>):<p className="text-sm text-neutral-400">No completed work yet.</p>}</div></Card></div>
  </div>
}

export function MentorshipPage(){
  const{profile}=useAuth(); const[rows,setRows]=useState<any[]>([]),[msg,setMsg]=useState('');
  const load=async()=>{try{const invites=await api.invitations();setRows(invites)}catch(e){setMsg((e as Error).message)}};useEffect(()=>{load()},[]);
  async function answer(id:string,status:'ACCEPTED'|'DECLINED'){try{await api.answerInvitation(id,status);await load()}catch(e){setMsg((e as Error).message)}}
  return <div className="civic-page max-w-6xl"><SectionHeader title="Mentorship & Team Invitations" subtitle="Accept or decline project invitations through the auditable team-formation workflow."/>{msg&&<p className="text-sm text-error-600 mb-3">{msg}</p>}{rows.length===0?<EmptyState icon={<GraduationCap size={40}/>} title="No pending invitations" description="Faculty mentors and students will see project invitations here."/>:<div className="space-y-3">{rows.map(x=><Card key={x.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3"><UserCheck className="text-primary-600"/><div className="flex-1"><b className="text-sm">{x.role}</b><p className="text-xs text-neutral-500">Project {x.projectId} · {x.message||'Team invitation'} · {x.status}</p></div>{x.status==='PENDING'&&x.inviteeId===profile?.id&&<><button className="btn-secondary" onClick={()=>answer(x.id,'DECLINED')}>Decline</button><button className="btn-primary" onClick={()=>answer(x.id,'ACCEPTED')}>Accept</button></>}</Card>)}</div>}</div>
}

export function ProposalReviewQueuePage({onNavigate}:{onNavigate:(r:string)=>void}){
  const{data,error}=useLoad(api.facultyDashboard); if(!data&&!error)return <LoadingState label="Loading proposal review queue…"/>;
  const rows=data?.pendingProposalReviews||[];
  return <div className="civic-page max-w-6xl"><SectionHeader title="Proposal Review Queue" subtitle="Faculty and institutional reviewers can open projects and review versioned proposals without bypassing the server approval workflow."/>{error&&<p className="text-error-600 text-sm">{error}</p>}{!rows.length?<EmptyState icon={<BookOpenCheck size={40}/>} title="No proposal reviews pending" description="Submitted proposals requiring review will appear here."/>:<div className="space-y-3">{rows.map((x:any)=><Card key={x.id} className="p-4 flex items-center gap-3"><BookOpenCheck className="text-primary-600"/><div className="flex-1"><b className="text-sm">Project {x.projectId}</b><p className="text-xs text-neutral-500">Version {x.version} · {x.status}</p></div><button className="btn-primary" onClick={()=>onNavigate('/dashboard/projects')}>Open workspace</button></Card>)}</div>}</div>
}

export function MatchedChallengesPage({onNavigate}:{onNavigate:(r:string)=>void}){
  const{data,error}=useLoad(api.universityDashboard); if(!data&&!error)return <LoadingState label="Loading institution matches…"/>; const rows=data?.recommendedChallenges||[];
  return <div className="civic-page"><SectionHeader title="Challenge-Specific Institution Matches" subtitle="Recommendations are based on required expertise and institution capability; they are not a universal ranking."/>{error&&<p className="text-error-600 text-sm">{error}</p>}<div className="grid md:grid-cols-2 gap-4">{rows.map((x:any)=><Card className="p-5" key={x.id}><div className="flex justify-between gap-3"><span className="badge bg-primary-50 text-primary-700">{x.domain}</span><span className="badge bg-neutral-100 text-neutral-600">{x.status}</span></div><h3 className="font-semibold mt-3">{x.title}</h3><p className="text-sm text-neutral-500 mt-2">{x.district} · {x.affectedPeople?.toLocaleString?.()||x.affectedPeople} people affected</p><div className="flex flex-wrap gap-1 mt-3">{(x.expertise||[]).slice(0,6).map((e:string)=><span key={e} className="badge bg-neutral-100 text-neutral-600">{e}</span>)}</div><button className="btn-primary mt-4" onClick={()=>onNavigate('/dashboard/marketplace')}>Explore match</button></Card>)}</div>{!rows.length&&<EmptyState icon={<Target size={40}/>} title="No new matches" description="Validated open challenges matching institution capability will appear here."/>}</div>
}

export function TeamFormationPage(){
  const[apps,setApps]=useState<any[]>([]),[invites,setInvites]=useState<any[]>([]),[teams,setTeams]=useState<any[]>([]),[msg,setMsg]=useState('');
  const load=async()=>{try{const[a,i,t]=await Promise.all([api.applications(),api.invitations(),api.registeredTeams()]);setApps(a);setInvites(i);setTeams(t)}catch(e){setMsg((e as Error).message)}};useEffect(()=>{load()},[]);
  const pending=useMemo(()=>apps.filter(x=>['APPLIED','SHORTLISTED'].includes(x.status)),[apps]);
  const accepted=apps.filter(x=>x.status==='ACCEPTED').length;
  async function update(id:string,status:string){try{await api.updateApplication(id,status);await load()}catch(e){setMsg((e as Error).message)}}
  return <div className="civic-page"><SectionHeader title="My Teams" subtitle="Official teams contain exactly 6 students and 1 faculty mentor before they become Ready."/>{msg&&<p className="text-error-600 text-sm">{msg}</p>}<div className="grid sm:grid-cols-3 gap-4 mb-5"><MetricCard label="Applications" value={apps.length} icon={<Users size={18}/>}/><MetricCard label="Pending review" value={pending.length} icon={<Clock size={18}/>} color="warning"/><MetricCard label="Invitations" value={invites.length} icon={<MailCheck size={18}/>} color="secondary"/></div><Card className="p-5 mb-5 border-primary-100 bg-primary-50"><h3 className="font-semibold text-primary-900">Team formation rules</h3><p className="text-sm text-primary-800 mt-2">{accepted}/6 students accepted · exactly 1 faculty mentor is required before the team can be marked Ready.</p><div className="h-2 bg-white rounded-full overflow-hidden mt-3"><div className="h-full bg-primary-600" style={{width:`${Math.min(100,accepted/6*100)}%`}}/></div>{accepted>=6&&<p className="text-xs text-error-700 mt-2">The six-student limit has been reached. Additional students cannot be invited.</p>}</Card><div className="grid lg:grid-cols-2 gap-5"><Card className="p-5"><h3 className="font-semibold">Student applications</h3><div className="space-y-2 mt-3">{apps.map(a=><div key={a.id} className="rounded-lg border p-3"><b className="text-sm">Student {a.studentId}</b><p className="text-xs text-neutral-500">{a.statement} · {a.status}</p>{['APPLIED','SHORTLISTED'].includes(a.status)&&<div className="flex gap-2 mt-2"><button className="btn-secondary" onClick={()=>update(a.id,'REJECTED')}>Reject</button><button className="btn-primary" disabled={a.status==='SHORTLISTED'&&accepted>=6} onClick={()=>update(a.id,a.status==='APPLIED'?'SHORTLISTED':'INVITED')}>{a.status==='APPLIED'?'Shortlist':'Invite'}</button></div>}</div>)}</div>{!apps.length&&<p className="text-sm text-neutral-400 mt-3">No student applications yet. Express interest in a challenge to begin forming a team.</p>}</Card><Card className="p-5"><h3 className="font-semibold">Invitations</h3><div className="space-y-2 mt-3">{invites.map(i=><div key={i.id} className="rounded-lg border p-3"><b className="text-sm">{i.role}</b><p className="text-xs text-neutral-500">Invitee {i.inviteeId} · {i.status}</p></div>)}</div>{!invites.length&&<p className="text-sm text-neutral-400 mt-3">No invitations yet.</p>}</Card></div></div>
}

export function RegisteredTeamsPage(){const[teams,setTeams]=useState<any[]>([]),[error,setError]=useState('');useEffect(()=>{api.registeredTeams().then(setTeams).catch(e=>setError((e as Error).message))},[]);if(error)return <div className="civic-page"><SectionHeader title="My Teams" subtitle="Registered teams and their development workspaces."/><p className="text-sm text-error-600">{error}</p></div>;return <div className="civic-page"><SectionHeader title="My Teams" subtitle="Registered teams, faculty mentors, and solution development workspaces."/>{teams.length===0?<EmptyState icon={<Users size={40}/>} title="No registered teams yet" description="Open a verified challenge and choose Express Interest to register a 3–6 student team."/>:<div className="grid lg:grid-cols-2 gap-4">{teams.map(team=><Card className="p-5" key={team.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-primary-900">{team.teamName}</h3><p className="text-sm text-neutral-600 mt-1">{team.challengeTitle}</p></div><span className="badge bg-success-50 text-success-700">{String(team.teamStatus||'SOLUTION_DEVELOPMENT').replaceAll('_',' ')}</span></div><p className="text-xs text-neutral-500 mt-3">{team.studentCount} students · Faculty Mentor: {team.facultyMentorDetails?.name||'Registered'}</p><div className="mt-3 grid sm:grid-cols-2 gap-2">{(team.students||[]).map((student:any,index:number)=><div className="rounded-lg bg-neutral-50 p-2 text-xs" key={student.studentId||index}><b>{student.name}</b><span className="block text-neutral-500">{student.studentId} · {student.department}</span></div>)}</div><button className="btn-primary mt-4 text-xs" onClick={()=>window.location.hash='/dashboard/projects'}>Open Development Workspace</button></Card>)}</div>}</div>}

export function UniversityMilestonesPage({onNavigate}:{onNavigate:(route:string)=>void}){const{data,error}=useLoad(api.universityDashboard);const[busy,setBusy]=useState('');const[rows,setRows]=useState<any[]>([]);useEffect(()=>{if(data)setRows(data.projects||[])},[data]);if(!data&&!error)return <LoadingState label="Loading milestones…"/>;async function toggle(project:any,milestone:any){setBusy(milestone.id);try{await api.milestone(project.id,milestone.id,{done:!milestone.done,approved:milestone.approved});setRows(current=>current.map(item=>item.id===project.id?{...item,milestones:(item.milestones||[]).map((entry:any)=>entry.id===milestone.id?{...entry,done:!entry.done}:entry)}:item))}finally{setBusy('')}}return <div className="civic-page"><SectionHeader title="Milestones" subtitle="Track solution development from problem understanding through citizen verification."/>{error&&<p className="text-error-600 text-sm">{error}</p>}{rows.length===0?<EmptyState icon={<ListChecks size={40}/>} title="No project milestones yet" description="Milestones appear when a verified challenge becomes a university project."/>:<div className="space-y-4">{rows.map(project=><Card className="p-5" key={project.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-primary-900">{project.title}</h3><p className="text-xs text-neutral-500 mt-1">{project.status?.replaceAll('_',' ')}</p></div><button className="btn-secondary text-xs" onClick={()=>onNavigate('/dashboard/projects')}>Open Project</button></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-4">{(project.milestones||[]).map((milestone:any)=><button key={milestone.id} disabled={busy===milestone.id} onClick={()=>void toggle(project,milestone)} className="flex items-center gap-2 rounded-lg border p-3 text-left"><span className={`w-6 h-6 rounded-full grid place-items-center text-xs ${milestone.done?'bg-success-100 text-success-700':'bg-neutral-100 text-neutral-400'}`}>{milestone.done?'✓':'○'}</span><span className="text-xs">{milestone.title}</span></button>)}</div></Card>)}</div>}</div>}

const UNIVERSITY_PROJECT_PHASES = [
  'Problem Understanding',
  'Research',
  'Solution Design',
  'Solution Development',
  'Prototype Development',
  'Field Testing',
  'Deployment',
  'Citizen Verification',
] as const;

const UNIVERSITY_PROJECT_DEMO = [
  {
    id: 'proj-solar',
    projectId: 'proj-solar',
    problemId: 'prob-solar',
    teamId: 'team-solar',
    universityId: 'cmr-it',
    facultyMentorId: 'faculty-anjali',
    projectName: 'Smart Solar Street Lighting System',
    solutionTitle: 'Smart Solar Street Lighting System',
    solutionDescription: 'Solar-powered street lighting with adaptive brightness and low-light monitoring.',
    challengeTitle: 'Unreliable street lighting in rural areas',
    location: 'Gumla, Jharkhand',
    category: 'Energy & Infrastructure',
    teamName: 'Rural Light Innovators',
    studentCount: 5,
    facultyMentorName: 'Dr. Anjali Rao',
    industryPartnerName: 'GreenTech Energy Solutions',
    industryMentorName: 'Rahul Verma',
    currentPhase: 'Prototype Development',
    overallProgress: 68,
    status: 'ACTIVE',
    priority: 'HIGH',
    nextAction: 'Complete low-light testing and upload prototype test results.',
    lastUpdated: '2026-09-25T09:30:00Z',
    tasks: [
      { taskId: 't1', title: 'Finalize solar panel specification', status: 'DONE', phase: 'Prototype Development' },
      { taskId: 't2', title: 'Design battery management system', status: 'DONE', phase: 'Prototype Development' },
      { taskId: 't3', title: 'Complete circuit design', status: 'DONE', phase: 'Prototype Development' },
      { taskId: 't4', title: 'Build prototype', status: 'DONE', phase: 'Prototype Development' },
      { taskId: 't5', title: 'Test battery backup', status: 'DONE', phase: 'Prototype Development' },
      { taskId: 't6', title: 'Test low-light performance', status: 'OPEN', phase: 'Prototype Development' },
      { taskId: 't7', title: 'Upload prototype demonstration', status: 'OPEN', phase: 'Prototype Development' },
    ],
    milestones: [
      { milestoneId: 'm1', title: 'Problem understanding', status: 'COMPLETED' },
      { milestoneId: 'm2', title: 'Research', status: 'COMPLETED' },
      { milestoneId: 'm3', title: 'Solution design', status: 'COMPLETED' },
      { milestoneId: 'm4', title: 'Prototype development', status: 'IN_PROGRESS' },
    ],
    blockers: [{ blockerId: 'b1', title: 'Battery backup performance', description: 'Battery backup is lower than expected during extended operation.', severity: 'MEDIUM', supportNeeded: 'Hardware testing + battery optimization', status: 'OPEN' }],
    evidence: [{ id: 'e1', name: 'Prototype Circuit.jpg', type: 'image', url: '#' }, { id: 'e2', name: 'Battery Test Results.pdf', type: 'pdf', url: '#' }, { id: 'e3', name: 'GitHub Repository', type: 'link', url: 'https://github.com' }],
    guidanceRequests: [{ id: 'g1', title: 'Battery optimization support', status: 'OPEN' }],
    activity: [
      { id: 'a1', text: 'Prototype battery testing completed', when: 'Today' },
      { id: 'a2', text: 'Industry mentor provided hardware feedback', when: 'Yesterday' },
      { id: 'a3', text: 'Prototype development started', when: '2 days ago' },
      { id: 'a4', text: 'Solution design completed', when: '5 days ago' },
      { id: 'a5', text: 'Government approved solution proposal', when: '8 days ago' },
    ],
    collaboration: { partnerName: 'GreenTech Energy Solutions', mentorName: 'Rahul Verma', support: 'Hardware & Solar Energy Guidance', status: 'ACTIVE', latestFeedback: 'Battery performance should be tested under different weather and load conditions.' },
    reviewGates: [
      { label: 'Problem Verified', done: true },
      { label: 'Challenge Published', done: true },
      { label: 'Team Registered', done: true },
      { label: 'Solution Development Started', done: true },
      { label: 'Solution Proposal Review', done: false },
      { label: 'Field Testing Approval', done: false },
      { label: 'Deployment Approval', done: false },
      { label: 'Citizen Verification', done: false },
    ],
  },
  {
    id: 'proj-water',
    projectId: 'proj-water',
    problemId: 'prob-water',
    teamId: 'team-water',
    universityId: 'cmr-it',
    facultyMentorId: 'faculty-ravi',
    projectName: 'Rural Water Quality Monitoring System',
    solutionTitle: 'Rural Water Quality Monitoring System',
    solutionDescription: 'Real-time water contamination monitoring with sensor analytics and alerting.',
    challengeTitle: 'Lack of real-time water quality monitoring',
    location: 'Ranchi, Jharkhand',
    category: 'Water & Sanitation',
    teamName: 'AquaTech',
    studentCount: 4,
    facultyMentorName: 'Dr. Ravi Kumar',
    industryPartnerName: 'AquaSense Technologies',
    industryMentorName: 'Pooja Singh',
    currentPhase: 'Solution Design',
    overallProgress: 42,
    status: 'ACTIVE',
    priority: 'HIGH',
    nextAction: 'Finalize sensor architecture and begin hardware integration.',
    lastUpdated: '2026-09-24T11:00:00Z',
    tasks: [
      { taskId: 't1', title: 'Sensor selection', status: 'DONE', phase: 'Solution Design' },
      { taskId: 't2', title: 'Architecture design', status: 'DONE', phase: 'Solution Design' },
      { taskId: 't3', title: 'Dashboard mockup', status: 'OPEN', phase: 'Solution Design' },
      { taskId: 't4', title: 'Hardware integration', status: 'OPEN', phase: 'Solution Design' },
    ],
    milestones: [
      { milestoneId: 'm1', title: 'Research', status: 'COMPLETED' },
      { milestoneId: 'm2', title: 'Solution design', status: 'IN_PROGRESS' },
    ],
    blockers: [],
    evidence: [],
    guidanceRequests: [{ id: 'g1', title: 'Architecture support', status: 'OPEN' }],
    activity: [{ id: 'a1', text: 'Solution design in progress', when: 'Today' }],
    collaboration: { partnerName: 'AquaSense Technologies', mentorName: 'Pooja Singh', support: 'Sensor architecture & hardware guidance', status: 'ACTIVE', latestFeedback: 'Model calibration should be tested with site water variations.' },
    reviewGates: [
      { label: 'Problem Verified', done: true },
      { label: 'Challenge Published', done: true },
      { label: 'Team Registered', done: true },
      { label: 'Solution Development Started', done: true },
      { label: 'Solution Proposal Review', done: false },
    ],
  },
  {
    id: 'proj-edu',
    projectId: 'proj-edu',
    problemId: 'prob-edu',
    teamId: 'team-edu',
    universityId: 'cmr-it',
    facultyMentorId: 'faculty-sneha',
    projectName: 'AI-Based School Dropout Prediction',
    solutionTitle: 'AI-Based School Dropout Prediction',
    solutionDescription: 'Prediction model for identifying students at risk and steering support interventions.',
    challengeTitle: 'Early identification of students at risk of dropping out',
    location: 'Deoghar, Jharkhand',
    category: 'Education',
    teamName: 'EduShield AI',
    studentCount: 6,
    facultyMentorName: 'Dr. Sneha Patel',
    industryPartnerName: 'DataBridge Analytics',
    industryMentorName: 'Karan Mehta',
    currentPhase: 'Prototype Development',
    overallProgress: 76,
    status: 'ACTIVE',
    priority: 'HIGH',
    nextAction: 'Validate the prediction model with additional school records.',
    lastUpdated: '2026-09-23T15:20:00Z',
    tasks: [
      { taskId: 't1', title: 'Prepare dataset', status: 'DONE', phase: 'Prototype Development' },
      { taskId: 't2', title: 'Train model', status: 'DONE', phase: 'Prototype Development' },
      { taskId: 't3', title: 'Validate metrics', status: 'DONE', phase: 'Prototype Development' },
      { taskId: 't4', title: 'Compare feature impact', status: 'OPEN', phase: 'Prototype Development' },
    ],
    milestones: [
      { milestoneId: 'm1', title: 'Model baseline', status: 'COMPLETED' },
      { milestoneId: 'm2', title: 'Prototype validation', status: 'IN_PROGRESS' },
    ],
    blockers: [],
    evidence: [],
    guidanceRequests: [],
    activity: [{ id: 'a1', text: 'Prediction model training completed', when: 'Today' }],
    collaboration: { partnerName: 'DataBridge Analytics', mentorName: 'Karan Mehta', support: 'Data quality & model validation', status: 'ACTIVE', latestFeedback: 'Model should be validated with district-level records and threshold tuning.' },
    reviewGates: [
      { label: 'Problem Verified', done: true },
      { label: 'Challenge Published', done: true },
      { label: 'Team Registered', done: true },
      { label: 'Solution Development Started', done: true },
    ],
  },
  {
    id: 'proj-waste',
    projectId: 'proj-waste',
    problemId: 'prob-waste',
    teamId: 'team-waste',
    universityId: 'cmr-it',
    facultyMentorId: 'faculty-kiran',
    projectName: 'Smart Waste Collection Optimization',
    solutionTitle: 'Smart Waste Collection Optimization',
    solutionDescription: 'Route optimization service to improve collection efficiency and scheduling.',
    challengeTitle: 'Inefficient waste collection routes',
    location: 'Jamshedpur, Jharkhand',
    category: 'Waste Management',
    teamName: 'CleanRoute',
    studentCount: 3,
    facultyMentorName: 'Prof. Kiran Reddy',
    industryPartnerName: 'EcoMove Solutions',
    industryMentorName: 'Neel Sharma',
    currentPhase: 'Field Testing',
    overallProgress: 84,
    status: 'FIELD TESTING',
    priority: 'MEDIUM',
    nextAction: 'Complete field testing and submit performance results.',
    lastUpdated: '2026-09-22T10:05:00Z',
    tasks: [
      { taskId: 't1', title: 'Finalize route logic', status: 'DONE', phase: 'Field Testing' },
      { taskId: 't2', title: 'Pilot route validation', status: 'DONE', phase: 'Field Testing' },
      { taskId: 't3', title: 'Submit performance report', status: 'OPEN', phase: 'Field Testing' },
    ],
    milestones: [
      { milestoneId: 'm1', title: 'Pilot ready', status: 'COMPLETED' },
      { milestoneId: 'm2', title: 'Field testing', status: 'IN_PROGRESS' },
    ],
    blockers: [],
    evidence: [],
    guidanceRequests: [],
    activity: [{ id: 'a1', text: 'Pilot route metrics collected', when: 'Today' }],
    collaboration: { partnerName: 'EcoMove Solutions', mentorName: 'Neel Sharma', support: 'Route optimization & field analysis', status: 'ACTIVE', latestFeedback: 'Need to validate the final route schedule under peak traffic conditions.' },
    reviewGates: [
      { label: 'Problem Verified', done: true },
      { label: 'Challenge Published', done: true },
      { label: 'Team Registered', done: true },
      { label: 'Solution Development Started', done: true },
      { label: 'Field Testing Approval', done: false },
    ],
  },
  {
    id: 'proj-health',
    projectId: 'proj-health',
    problemId: 'prob-health',
    teamId: 'team-health',
    universityId: 'cmr-it',
    facultyMentorId: 'faculty-meera',
    projectName: 'Rural Telemedicine Support Platform',
    solutionTitle: 'Rural Telemedicine Support Platform',
    solutionDescription: 'Telemedicine workflow and consultation support for underserved communities.',
    challengeTitle: 'Limited access to specialist healthcare',
    location: 'Dumka, Jharkhand',
    category: 'Healthcare',
    teamName: 'HealthConnect',
    studentCount: 5,
    facultyMentorName: 'Dr. Meera Sharma',
    industryPartnerName: '',
    industryMentorName: '',
    currentPhase: 'Solution Development',
    overallProgress: 55,
    status: 'ACTIVE',
    priority: 'MEDIUM',
    nextAction: 'Complete doctor consultation module and conduct usability testing.',
    lastUpdated: '2026-09-21T13:35:00Z',
    tasks: [
      { taskId: 't1', title: 'Map patient workflow', status: 'DONE', phase: 'Solution Development' },
      { taskId: 't2', title: 'Build consultation module', status: 'OPEN', phase: 'Solution Development' },
      { taskId: 't3', title: 'Conduct usability testing', status: 'OPEN', phase: 'Solution Development' },
    ],
    milestones: [
      { milestoneId: 'm1', title: 'Requirements and workflow', status: 'COMPLETED' },
      { milestoneId: 'm2', title: 'Prototype development', status: 'IN_PROGRESS' },
    ],
    blockers: [],
    evidence: [],
    guidanceRequests: [{ id: 'g1', title: 'Platform usability support', status: 'OPEN' }],
    activity: [{ id: 'a1', text: 'Consultation workflow drafted', when: 'Today' }],
    collaboration: { partnerName: '', mentorName: '', support: '', status: 'NONE', latestFeedback: 'No industry collaboration yet.' },
    reviewGates: [
      { label: 'Problem Verified', done: true },
      { label: 'Challenge Published', done: true },
      { label: 'Team Registered', done: true },
      { label: 'Solution Development Started', done: true },
    ],
  },
  {
    id: 'proj-agri',
    projectId: 'proj-agri',
    problemId: 'prob-agri',
    teamId: 'team-agri',
    universityId: 'cmr-it',
    facultyMentorId: 'faculty-arjun',
    projectName: 'AI Crop Disease Detection',
    solutionTitle: 'AI Crop Disease Detection',
    solutionDescription: 'AI-driven crop disease detection using image analysis and field validation.',
    challengeTitle: 'Delayed identification of crop diseases',
    location: 'Hazaribagh, Jharkhand',
    category: 'Agriculture',
    teamName: 'AgriVision',
    studentCount: 4,
    facultyMentorName: 'Dr. Arjun Singh',
    industryPartnerName: 'FarmTech Innovations',
    industryMentorName: 'Ishita Roy',
    currentPhase: 'Research',
    overallProgress: 28,
    status: 'RESEARCH',
    priority: 'MEDIUM',
    nextAction: 'Collect and label additional crop disease images.',
    lastUpdated: '2026-09-20T08:45:00Z',
    tasks: [
      { taskId: 't1', title: 'Collect crop images', status: 'OPEN', phase: 'Research' },
      { taskId: 't2', title: 'Label disease dataset', status: 'OPEN', phase: 'Research' },
    ],
    milestones: [
      { milestoneId: 'm1', title: 'Research baseline', status: 'IN_PROGRESS' },
    ],
    blockers: [],
    evidence: [],
    guidanceRequests: [],
    activity: [{ id: 'a1', text: 'Dataset collection started', when: 'Today' }],
    collaboration: { partnerName: 'FarmTech Innovations', mentorName: 'Ishita Roy', support: 'Agriculture dataset support & validation', status: 'ACTIVE', latestFeedback: 'The model should be benchmarked with local crop variations before field tests.' },
    reviewGates: [
      { label: 'Problem Verified', done: true },
      { label: 'Challenge Published', done: true },
      { label: 'Team Registered', done: true },
      { label: 'Solution Development Started', done: false },
    ],
  },
];

function projectMatchesUniversity(project: any, universityId: string) {
  const rawId = String(project?.universityId || project?.organizationId || project?.organization_id || project?.university_id || '').trim();
  return !universityId || rawId === universityId || (!rawId && !universityId);
}

function projectProgress(project: any) {
  const value = Number(project?.overallProgress ?? project?.progress ?? 0);
  if (Number.isFinite(value) && value >= 0) return Math.min(100, Math.max(0, value));
  const tasks = Array.isArray(project?.tasks) ? project.tasks : [];
  if (!tasks.length) return 0;
  const completed = tasks.filter((task: any) => ['DONE', 'COMPLETED'].includes(String(task?.status || '').toUpperCase())).length;
  return Math.round((completed / tasks.length) * 100);
}

function projectPhaseIndex(phase: string) {
  return UNIVERSITY_PROJECT_PHASES.findIndex(item => item.toLowerCase() === String(phase || '').toLowerCase());
}

function projectPhaseColor(phase: string) {
  const index = projectPhaseIndex(phase);
  if (index === -1) return 'bg-neutral-100 text-neutral-600';
  if (index === UNIVERSITY_PROJECT_PHASES.length - 1) return 'bg-success-50 text-success-700';
  if (index > 3) return 'bg-secondary-50 text-secondary-700';
  return 'bg-primary-50 text-primary-700';
}

export function UniversityProjectsPage({onNavigate}:{onNavigate:(route:string)=>void}){
  const { profile } = useAuth();
  const { projects: platformProjects, universities } = usePlatform();
  const [query, setQuery] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('newest');

  const universityId = profile?.organization_id || '';
  const universityName = universities.find(item => item.id === universityId)?.name || 'CMR Institute of Technology';
  const universityLocation = 'Hyderabad, Telangana';

  const projectRows = useMemo(() => {
    const source = (platformProjects && platformProjects.length ? platformProjects : UNIVERSITY_PROJECT_DEMO).map((project: any) => ({
      id: project.id || project.projectId,
      problemId: project.problemId || project.problem_id,
      teamId: project.teamId || project.team_id,
      universityId: project.universityId || project.organizationId || project.organization_id || universityId,
      projectName: project.projectName || project.solutionTitle || project.title || 'Project',
      solutionTitle: project.solutionTitle || project.projectName || project.title || 'Project',
      challengeTitle: project.challengeTitle || project.challenge || project.problemTitle || 'Verified problem',
      location: project.location || project.district || 'Jharkhand',
      category: project.category || project.domain || 'General',
      teamName: project.teamName || project.team?.name || 'Team',
      studentCount: Number(project.studentCount || project.students?.length || project.team?.length || 0),
      facultyMentorName: project.facultyMentorName || project.facultyMentorDetails?.name || 'Faculty mentor',
      industryPartnerName: project.industryPartnerName || project.industryPartner || '',
      industryMentorName: project.industryMentorName || '',
      currentPhase: project.currentPhase || project.phase || 'Solution Development',
      overallProgress: projectProgress(project),
      status: project.status || 'ACTIVE',
      priority: project.priority || 'MEDIUM',
      nextAction: project.nextAction || project.next_action || 'Continue development and update milestones.',
      lastUpdated: project.lastUpdated || project.updatedAt || project.updated_at || new Date().toISOString(),
      tasks: project.tasks || [],
      milestones: project.milestones || [],
      blockers: project.blockers || [],
      evidence: project.evidence || [],
      guidanceRequests: project.guidanceRequests || [],
      collaboration: project.collaboration || { partnerName: project.industryPartnerName || '', mentorName: project.industryMentorName || '', support: 'General support', status: project.industryPartnerName ? 'ACTIVE' : 'NONE', latestFeedback: project.industryPartnerName ? 'Industry support is active.' : 'No industry collaboration yet.' },
      activity: project.activity || [],
      reviewGates: project.reviewGates || [],
    })).filter(item => projectMatchesUniversity(item, universityId));

    const normalizedSearch = query.trim().toLowerCase();
    const filtered = source.filter((project: any) => {
      const matchesSearch = !normalizedSearch || [project.projectName, project.challengeTitle, project.teamName, project.location, project.category].join(' ').toLowerCase().includes(normalizedSearch);
      const matchesPhase = phaseFilter === 'All' || project.currentPhase === phaseFilter;
      const matchesStatus = statusFilter === 'All' || String(project.status || '').toUpperCase() === statusFilter.toUpperCase();
      const matchesPriority = priorityFilter === 'All' || String(project.priority || '').toUpperCase() === priorityFilter.toUpperCase();
      return matchesSearch && matchesPhase && matchesStatus && matchesPriority;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'updated') return new Date(String(b.lastUpdated || 0)).getTime() - new Date(String(a.lastUpdated || 0)).getTime();
      if (sortBy === 'progress-high') return Number(b.overallProgress) - Number(a.overallProgress);
      if (sortBy === 'progress-low') return Number(a.overallProgress) - Number(b.overallProgress);
      return new Date(String(b.lastUpdated || 0)).getTime() - new Date(String(a.lastUpdated || 0)).getTime();
    });
  }, [platformProjects, query, phaseFilter, statusFilter, priorityFilter, sortBy, universityId]);

  const summary = useMemo(() => {
    const total = projectRows.length;
    const active = projectRows.filter(project => ['ACTIVE', 'RESEARCH', 'FIELD TESTING'].includes(String(project.status || '').toUpperCase())).length;
    const inPrototype = projectRows.filter(project => project.currentPhase === 'Prototype Development').length;
    const inFieldTesting = projectRows.filter(project => project.currentPhase === 'Field Testing').length;
    return { total, active, inPrototype, inFieldTesting };
  }, [projectRows]);

  return <div className="civic-page space-y-5">
    <SectionHeader title="Projects" subtitle="Track your teams, development phases, solutions, progress, and collaboration support." />
    <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="font-semibold text-primary-900 text-lg">{universityName}</h3>
          <p className="text-sm text-neutral-600">{universityLocation}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:max-w-xl">
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Projects" className="input flex-1" />
          <button className="btn-secondary whitespace-nowrap" onClick={() => setQuery('')}>Clear</button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-4">
        <select className="input" value={phaseFilter} onChange={event => setPhaseFilter(event.target.value)}>
          <option value="All">All Phases</option>
          {UNIVERSITY_PROJECT_PHASES.map(phase => <option key={phase} value={phase}>{phase}</option>)}
        </select>
        <select className="input" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
          <option value="All">All Status</option>
          {['ACTIVE', 'FIELD TESTING', 'RESEARCH', 'PROTOTYPE DEVELOPMENT'].map(status => <option key={status} value={status}>{status}</option>)}
        </select>
        <select className="input" value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)}>
          <option value="All">All Priority</option>
          {['HIGH', 'MEDIUM', 'LOW'].map(priority => <option key={priority} value={priority}>{priority}</option>)}
        </select>
        <select className="input" value={sortBy} onChange={event => setSortBy(event.target.value)}>
          <option value="newest">Newest</option>
          <option value="updated">Recently Updated</option>
          <option value="progress-high">Highest Progress</option>
          <option value="progress-low">Lowest Progress</option>
        </select>
      </div>
    </div>

    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <MetricCard label="Total Projects" value={summary.total} icon={<Rocket size={18} />} />
      <MetricCard label="Active Projects" value={summary.active} icon={<CheckCircle2 size={18} />} color="secondary" />
      <MetricCard label="In Prototype" value={summary.inPrototype} icon={<Target size={18} />} color="accent" />
      <MetricCard label="In Field Testing" value={summary.inFieldTesting} icon={<Users size={18} />} color="success" />
    </div>

    {projectRows.length === 0 ? (<EmptyState icon={<Rocket size={40} />} title="No university projects found" description="Your university has no matching projects for the current filters." />) : (
      <div className="grid xl:grid-cols-2 gap-5">
        {projectRows.map((project: any) => (
          <Card key={project.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-primary-900 text-lg">{project.projectName}</h3>
                <p className="text-sm text-neutral-600 mt-1">Challenge: {project.challengeTitle}</p>
              </div>
              <span className={`badge ${projectPhaseColor(project.currentPhase)}`}>{project.currentPhase}</span>
            </div>

            <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-neutral-500 block">Location</span><span className="font-medium">{project.location}</span></div>
              <div><span className="text-neutral-500 block">Category</span><span className="font-medium">{project.category}</span></div>
              <div><span className="text-neutral-500 block">Team</span><span className="font-medium">{project.teamName}</span></div>
              <div><span className="text-neutral-500 block">Students</span><span className="font-medium">{project.studentCount}</span></div>
              <div><span className="text-neutral-500 block">Faculty Mentor</span><span className="font-medium">{project.facultyMentorName}</span></div>
              <div><span className="text-neutral-500 block">Industry</span><span className="font-medium">{project.industryPartnerName || 'No industry collaboration yet'}</span></div>
            </div>

            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="flex justify-between text-xs text-neutral-600 mb-2">
                <span>Overall progress</span>
                <span className="font-semibold text-primary-700">{project.overallProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
                <div className="h-full bg-primary-600" style={{ width: `${project.overallProgress}%` }} />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="badge bg-success-50 text-success-700">{project.status}</span>
              <span className="badge bg-primary-50 text-primary-700">{project.priority} priority</span>
              <span className="badge bg-neutral-100 text-neutral-700">Updated {new Date(project.lastUpdated).toLocaleDateString()}</span>
            </div>

            <div className="mt-4 rounded-lg border border-neutral-200 bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Next recommended action</p>
              <p className="mt-1 text-sm text-neutral-700">{project.nextAction}</p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-sm text-neutral-600">{project.industryPartnerName ? `Industry status: ${project.collaboration?.status || 'ACTIVE'}` : 'Industry collaboration: none'}</span>
              <button className="btn-primary text-xs" onClick={() => onNavigate(`/university/projects/${project.id}`)}>Open Project</button>
            </div>
          </Card>
        ))}
      </div>
    )}
  </div>;
}

export function UniversityProjectDetailPage({projectId, onNavigate}:{projectId:string; onNavigate:(route:string)=>void}){
  const { profile } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [selectedPhase, setSelectedPhase] = useState('Prototype Development');
  const [taskStatus, setTaskStatus] = useState<Record<string, string>>({});
  const [blockerForm, setBlockerForm] = useState({ title: '', description: '', severity: 'MEDIUM', supportNeeded: '' });
  const [guidanceForm, setGuidanceForm] = useState({ projectId: projectId, expertise: '', supportType: 'Technical Guidance', description: '', blocker: '', preferredCollaboration: 'One-time Consultation' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await api.project(projectId);
        if (active) {
          const record = result?.project || result || null;
          setProject(record || null);
          setSelectedPhase(record?.currentPhase || 'Prototype Development');
        }
      } catch (error) {
        if (active) setMessage((error as Error).message || 'Could not load project details.');
      }
    }
    void load();
    return () => { active = false; };
  }, [projectId]);

  const tasks = Array.isArray(project?.tasks) ? project.tasks : [];
  const completedTasks = tasks.filter((task: any) => ['DONE', 'COMPLETED'].includes(String(task.status || '').toUpperCase())).length;
  const phaseTasks = tasks.filter((task: any) => String(task.phase || project?.currentPhase || '').toLowerCase() === String(selectedPhase || '').toLowerCase() || !task.phase);
  const progress = project ? projectProgress(project) : 0;
  const projectUniversityId = project?.universityId || project?.organizationId || profile?.organization_id || '';

  if (!project) return <div className="civic-page"><LoadingState label="Loading project details…" /></div>;

  if (projectUniversityId && profile?.organization_id && projectUniversityId !== profile.organization_id) {
    return <div className="civic-page"><SectionHeader title="Access denied" subtitle="This project belongs to a different university." /><button className="btn-secondary mt-4" onClick={() => onNavigate('/university/projects')}>Back to projects</button></div>;
  }

  async function updateTaskStatus(taskId: string, status: string) {
    if (!project) return;
    try {
      setBusy(true);
      await api.updateTask(project.id, taskId, { status });
      const refreshed = await api.project(project.id);
      setProject(refreshed.project || refreshed);
      setMessage('Task status updated.');
    } catch (error) {
      setMessage((error as Error).message || 'Unable to update task status.');
    } finally {
      setBusy(false);
    }
  }

  async function addBlocker(event: any) {
    event.preventDefault();
    if (!blockerForm.title.trim() || !blockerForm.description.trim()) {
      setMessage('Enter a title and description to report a blocker.');
      return;
    }
    try {
      setBusy(true);
      const created = await api.createBlocker(project.id, { ...blockerForm, status: 'OPEN', createdBy: profile?.id || profile?.full_name || 'University team' });
      setProject((current: any) => ({ ...current, blockers: [...(current?.blockers || []), created] }));
      setBlockerForm({ title: '', description: '', severity: 'MEDIUM', supportNeeded: '' });
      setMessage('Blocker reported successfully.');
    } catch (error) {
      setMessage((error as Error).message || 'Unable to report blocker.');
    } finally {
      setBusy(false);
    }
  }

  async function resolveBlocker(blockerId: string) {
    try {
      setBusy(true);
      await api.resolveBlocker(project.id, blockerId);
      setProject((current: any) => ({ ...current, blockers: (current?.blockers || []).map((blocker: any) => blocker.id === blockerId ? { ...blocker, status: 'RESOLVED' } : blocker) }));
      setMessage('Blocker marked resolved.');
    } catch (error) {
      setMessage((error as Error).message || 'Unable to resolve blocker.');
    } finally {
      setBusy(false);
    }
  }

  async function requestGuidance(event: any) {
    event.preventDefault();
    if (!guidanceForm.expertise.trim() || !guidanceForm.description.trim()) {
      setMessage('Add expertise and a description before requesting guidance.');
      return;
    }
    try {
      setBusy(true);
      await api.createGuidanceRequest(project.id, {
        projectId: project.id,
        supportType: guidanceForm.supportType,
        expertise: guidanceForm.expertise,
        description: guidanceForm.description,
        blocker: guidanceForm.blocker,
        preferredCollaboration: guidanceForm.preferredCollaboration,
        status: 'OPEN',
        createdBy: profile?.full_name || 'University user',
      });
      setMessage('Guidance request created successfully.');
      setGuidanceForm({ ...guidanceForm, expertise: '', description: '', blocker: '' });
    } catch (error) {
      setMessage((error as Error).message || 'Unable to create guidance request.');
    } finally {
      setBusy(false);
    }
  }

  const aiGuidance = {
    'Problem Understanding': ['Continue validating the root cause and affected community needs.', 'Document evidence and beneficiary impact.', 'Confirm the problem statement with institutional stakeholders.'],
    Research: ['Verify research sources and benchmark relevant approaches.', 'Document assumptions and testable variables.', 'Prioritize the most relevant hypotheses and data sources.'],
    'Solution Design': ['Finalize solution architecture and required integrations.', 'Document decision trade-offs and key assumptions.', 'Prepare a reviewed solution proposal for approval gates.'],
    'Solution Development': ['Complete the core feature modules and align with the sprint plan.', 'Validate integration points early and record technical blockers.', 'Prepare evidence for the next milestone review.'],
    'Prototype Development': ['Complete battery backup testing', 'Test the system under low-light conditions', 'Measure power consumption', 'Upload prototype evidence', 'Document failed test cases and improvements'],
    'Field Testing': ['Validate field conditions against the tested assumptions.', 'Measure performance in real deployment scenarios.', 'Capture evidence and comparator metrics for approval.'],
    Deployment: ['Prepare deployment checklist and rollout communication.', 'Confirm infrastructure readiness and site checks.', 'Document operational risks and maintenance plan.'],
    'Citizen Verification': ['Collect citizen feedback and field verification notes.', 'Compare evidence against impact metrics.', 'Prepare deployment or scaling recommendations.'],
  } as Record<string, string[]>;

  const currentGuidance = aiGuidance[selectedPhase] || aiGuidance['Prototype Development'];

  return <div className="civic-page space-y-5">
    <button className="btn-ghost" onClick={() => onNavigate('/university/projects')}><span className="inline-flex items-center gap-2">← Back to projects</span></button>
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold font-display text-primary-900">{project.projectName || project.solutionTitle}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-neutral-600">
            <span className="badge bg-primary-50 text-primary-700">Challenge: {project.challengeTitle || 'Verified problem'}</span>
            <span className="badge bg-neutral-100 text-neutral-700">Team: {project.teamName || 'University team'}</span>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 min-w-[230px]">
          <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Current phase</p>
          <p className="mt-2 font-semibold text-primary-900">{project.currentPhase || 'Solution Development'}</p>
          <p className="text-sm text-neutral-600 mt-1">Overall progress: {progress}%</p>
        </div>
      </div>

      <div className="mt-5 grid md:grid-cols-2 xl:grid-cols-5 gap-3 text-sm">
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><span className="text-xs uppercase tracking-[0.12em] text-neutral-500 block">Team</span><span className="mt-1 block font-medium">{project.teamName || 'Team'}</span></div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><span className="text-xs uppercase tracking-[0.12em] text-neutral-500 block">Students</span><span className="mt-1 block font-medium">{project.studentCount || 0}</span></div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><span className="text-xs uppercase tracking-[0.12em] text-neutral-500 block">Faculty Mentor</span><span className="mt-1 block font-medium">{project.facultyMentorName || 'Not assigned'}</span></div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><span className="text-xs uppercase tracking-[0.12em] text-neutral-500 block">Industry Partner</span><span className="mt-1 block font-medium">{project.industryPartnerName || 'No industry collaboration yet'}</span></div>
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><span className="text-xs uppercase tracking-[0.12em] text-neutral-500 block">Status</span><span className="mt-1 block font-medium">{project.status || 'ACTIVE'}</span></div>
      </div>
    </div>

    <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-primary-900">Development journey</h2>
      <div className="mt-4 grid md:grid-cols-8 gap-2">
        {UNIVERSITY_PROJECT_PHASES.map((phase: string, index: number) => {
          const phasePosition = projectPhaseIndex(project.currentPhase || selectedPhase);
          const isCompleted = phasePosition !== -1 && index < phasePosition;
          const isCurrent = phase === (project.currentPhase || selectedPhase);
          const isUpcoming = phasePosition === -1 || index > phasePosition;
          return <button key={phase} onClick={() => setSelectedPhase(phase)} className={`rounded-xl border p-3 text-left transition ${isCompleted ? 'border-success-200 bg-success-50 text-success-800' : isCurrent ? 'border-primary-200 bg-primary-50 text-primary-800' : 'border-neutral-200 bg-neutral-50 text-neutral-500'}`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em]">
              <span className={`inline-block h-2.5 w-2.5 rounded-full ${isCompleted ? 'bg-success-500' : isCurrent ? 'bg-primary-600' : 'bg-neutral-300'}`} />
              {isCompleted ? '✓' : isCurrent ? '●' : '○'}
            </div>
            <div className="mt-2 text-xs leading-relaxed">{phase}</div>
          </button>;
        })}
      </div>
    </div>

    <div className="grid xl:grid-cols-[1.4fr,0.9fr] gap-5">
      <div className="space-y-5">
        <Card className="p-5">
          <h3 className="font-semibold text-primary-900">Current Phase</h3>
          <p className="mt-3 text-sm text-neutral-600">Phase Goal: <span className="font-medium text-neutral-800">{selectedPhase === 'Prototype Development' ? 'Build and validate a working solar-powered street lighting prototype.' : 'Drive progress toward the selected development milestone and quality gate.'}</span></p>
          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-600">Tasks</span>
              <span className="font-semibold text-primary-700">{completedTasks} / {tasks.length || 0}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-neutral-200 overflow-hidden">
              <div className="h-full bg-primary-600" style={{ width: `${tasks.length ? (completedTasks / tasks.length) * 100 : 0}%` }} />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {phaseTasks.length === 0 ? <p className="text-sm text-neutral-500">No tasks available for this phase yet.</p> : phaseTasks.map((task: any) => (
              <div key={task.taskId || task.id} className="rounded-lg border border-neutral-200 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-neutral-800">{task.title}</p>
                  <p className="text-xs text-neutral-500">{task.phase || selectedPhase}</p>
                </div>
                <select className="input max-w-[150px] text-xs" value={taskStatus[task.taskId || task.id] || task.status || 'OPEN'} onChange={event => {
                  const next = event.target.value;
                  setTaskStatus(prev => ({ ...prev, [task.taskId || task.id]: next }));
                  void updateTaskStatus(task.taskId || task.id, next);
                }}>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="DONE">Done</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-primary-900">AI Project Guidance</h3>
          <p className="mt-3 text-sm text-neutral-600">Your team has completed solution design and is currently developing the prototype.</p>
          <ul className="mt-4 space-y-2 text-sm list-disc list-inside text-neutral-700">
            {currentGuidance.map((step: string) => <li key={step}>{step}</li>)}
          </ul>
          <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-primary-700">Suggested Expertise</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['Solar Energy', 'IoT', 'Embedded Systems', 'Battery Management'].map(item => <span key={item} className="badge bg-white text-primary-700 border border-primary-100">{item}</span>)}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-primary-900">Evidence & Deliverables</h3>
            <button className="btn-secondary text-xs">Upload Evidence</button>
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {(project.evidence && project.evidence.length ? project.evidence : [
              { id: 'r1', name: 'Solar Street Lighting Research.pdf', type: 'pdf' },
              { id: 'r2', name: 'Prototype Circuit.jpg', type: 'image' },
              { id: 'r3', name: 'Battery Test Results.pdf', type: 'pdf' },
              { id: 'r4', name: 'GitHub Repository', type: 'link' },
              { id: 'r5', name: 'Prototype Demo Video', type: 'video' },
            ]).map((item: any) => (
              <div key={item.id || item.name} className="rounded-lg border border-neutral-200 p-3 text-sm">
                <div className="font-medium text-neutral-800">{item.name}</div>
                <div className="mt-1 text-xs text-neutral-500 uppercase tracking-[0.12em]">{item.type || 'Document'}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-primary-900">Blockers & Support Needed</h3>
          <form className="mt-4 space-y-3" onSubmit={addBlocker}>
            <input className="input" placeholder="Title" value={blockerForm.title} onChange={event => setBlockerForm(current => ({ ...current, title: event.target.value }))} />
            <textarea className="input" rows={3} placeholder="Description" value={blockerForm.description} onChange={event => setBlockerForm(current => ({ ...current, description: event.target.value }))} />
            <div className="grid sm:grid-cols-2 gap-3">
              <select className="input" value={blockerForm.severity} onChange={event => setBlockerForm(current => ({ ...current, severity: event.target.value }))}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <input className="input" placeholder="Support needed" value={blockerForm.supportNeeded} onChange={event => setBlockerForm(current => ({ ...current, supportNeeded: event.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" type="submit">Report Blocker</button>
              <button type="button" className="btn-secondary" onClick={() => setMessage('Guidance request flow is available below.')}>Request Guidance</button>
            </div>
          </form>
          <div className="mt-4 space-y-2">
            {(project.blockers && project.blockers.length ? project.blockers : [
              { blockerId: 'demo', title: 'Battery backup performance', description: 'Battery backup is lower than expected during extended operation.', severity: 'MEDIUM', supportNeeded: 'Hardware testing + battery optimization', status: 'OPEN' },
            ]).map((blocker: any) => (
              <div key={blocker.blockerId || blocker.id} className="rounded-lg border border-neutral-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <b className="text-sm">{blocker.title}</b>
                  <span className="badge bg-amber-50 text-amber-700">{blocker.status || 'OPEN'}</span>
                </div>
                <p className="text-sm text-neutral-600 mt-2">{blocker.description}</p>
                <p className="text-xs text-neutral-500 mt-2">Severity: {blocker.severity || 'MEDIUM'} · Support: {blocker.supportNeeded || 'Not specified'}</p>
                {String(blocker.status || 'OPEN').toUpperCase() !== 'RESOLVED' && <button className="btn-secondary text-xs mt-2" onClick={() => resolveBlocker(blocker.blockerId || blocker.id)}>Resolve</button>}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-primary-900">Get Guidance & Support</h3>
          <form className="mt-4 space-y-3" onSubmit={requestGuidance}>
            <select className="input" value={guidanceForm.supportType} onChange={event => setGuidanceForm(current => ({ ...current, supportType: event.target.value }))}>
              <option>Technical Guidance</option>
              <option>Research Support</option>
              <option>Testing & Validation</option>
              <option>Prototype Support</option>
              <option>Funding/Resources</option>
              <option>Deployment Support</option>
              <option>Domain Expertise</option>
              <option>Other</option>
            </select>
            <input className="input" placeholder="Expertise Needed" value={guidanceForm.expertise} onChange={event => setGuidanceForm(current => ({ ...current, expertise: event.target.value }))} />
            <textarea className="input" rows={3} placeholder="Description" value={guidanceForm.description} onChange={event => setGuidanceForm(current => ({ ...current, description: event.target.value }))} />
            <textarea className="input" rows={3} placeholder="Current Blocker" value={guidanceForm.blocker} onChange={event => setGuidanceForm(current => ({ ...current, blocker: event.target.value }))} />
            <select className="input" value={guidanceForm.preferredCollaboration} onChange={event => setGuidanceForm(current => ({ ...current, preferredCollaboration: event.target.value }))}>
              <option>One-time Consultation</option>
              <option>Technical Mentorship</option>
              <option>Prototype Support</option>
              <option>Testing Support</option>
              <option>Long-term Collaboration</option>
            </select>
            <button className="btn-primary" type="submit" disabled={busy}>Send Guidance Request</button>
          </form>
        </Card>
      </div>

      <div className="space-y-5">
        <Card className="p-5">
          <h3 className="font-semibold text-primary-900">Project Health</h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><span className="text-neutral-500 block">Overall Progress</span><span className="font-semibold text-primary-900 mt-1 block">{progress}%</span></div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><span className="text-neutral-500 block">Current Phase</span><span className="font-semibold text-primary-900 mt-1 block">{project.currentPhase || 'Solution Development'}</span></div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><span className="text-neutral-500 block">Tasks</span><span className="font-semibold text-primary-900 mt-1 block">{completedTasks} / {tasks.length || 0}</span></div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><span className="text-neutral-500 block">Evidence</span><span className="font-semibold text-primary-900 mt-1 block">{(project.evidence || []).length || 5}</span></div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><span className="text-neutral-500 block">Open Blockers</span><span className="font-semibold text-primary-900 mt-1 block">{(project.blockers || []).filter((item: any) => String(item.status || '').toUpperCase() !== 'RESOLVED').length || 1}</span></div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"><span className="text-neutral-500 block">Guidance Requests</span><span className="font-semibold text-primary-900 mt-1 block">{(project.guidanceRequests || []).length || 2}</span></div>
          </div>
          <p className="mt-4 text-xs text-neutral-500">Last updated {new Date(project.updatedAt || project.lastUpdated || new Date().toISOString()).toLocaleString()}</p>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-primary-900">Industry Collaboration</h3>
          {(project.collaboration && project.collaboration.partnerName) ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-lg font-semibold text-primary-900">{project.collaboration.partnerName}</p>
                <p className="text-sm text-neutral-600 mt-1">Industry Mentor: {project.collaboration.mentorName || 'Not assigned'}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Support</p>
                <p className="mt-1 text-sm text-neutral-700">{project.collaboration.support || 'General guidance'}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Status</p>
                <p className="mt-1 text-sm text-neutral-700">{project.collaboration.status || 'ACTIVE'}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">Latest Feedback</p>
                <p className="mt-1 text-sm text-neutral-700">{project.collaboration.latestFeedback || 'No recent feedback yet.'}</p>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-600">No industry collaboration yet.</div>
          )}
          <button className="btn-primary mt-4 text-xs">Find Industry Support</button>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-primary-900">Project Activity</h3>
          <div className="mt-4 space-y-3">
            {(project.activity && project.activity.length ? project.activity : [
              { id: 'a1', text: 'Prototype battery testing completed', when: 'Today' },
              { id: 'a2', text: 'Industry mentor provided hardware feedback', when: 'Yesterday' },
              { id: 'a3', text: 'Prototype development started', when: '2 days ago' },
            ]).map((item: any) => (
              <div key={item.id} className="rounded-lg border border-neutral-200 p-3">
                <div className="text-xs uppercase tracking-[0.12em] text-neutral-500">{item.when || 'Today'}</div>
                <div className="mt-1 text-sm text-neutral-700">{item.text}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold text-primary-900">Government Review Gates</h3>
          <div className="mt-4 space-y-2">
            {(project.reviewGates && project.reviewGates.length ? project.reviewGates : [
              { label: 'Problem Verified', done: true },
              { label: 'Challenge Published', done: true },
              { label: 'Team Registered', done: true },
              { label: 'Solution Development Started', done: true },
              { label: 'Solution Proposal Review', done: false },
              { label: 'Field Testing Approval', done: false },
              { label: 'Deployment Approval', done: false },
              { label: 'Citizen Verification', done: false },
            ]).map((gate: any) => (
              <div key={gate.label} className="flex items-center justify-between rounded-lg border border-neutral-200 p-2">
                <span className="text-sm text-neutral-700">{gate.done ? '✓' : '○'} {gate.label}</span>
                <span className="text-xs text-neutral-500">{gate.done ? 'Completed' : 'Pending'}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>

    {message && <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800">{message}</div>}
  </div>;
}

export function UniversityIndustryCollaborationPage({onNavigate}:{onNavigate:(route:string)=>void}){
  const { profile } = useAuth();
  const [supportType, setSupportType] = useState('ALL');
  const [rows, setRows] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [request, setRequest] = useState({ projectId: '', supportType: 'MENTORSHIP', partnerName: '', message: '', expertise: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const universityId = profile?.organization_id || '';
  const currentUserId = profile?.id || '';

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [overview, availableOffers] = await Promise.all([
          api.universityOverview(),
          api.supportOffers(),
        ]);
        if (!active) return;
        const projects = (overview?.projects || []).map((project: any) => ({
          ...project,
          supportTypes: Array.isArray(project.supportTypes) && project.supportTypes.length
            ? project.supportTypes
            : [
                project.supportType,
                project.support_type,
                project.industrySupportType,
                project.industry_support_type,
                ...(Array.isArray(project.supportNeeded) ? project.supportNeeded : []),
                ...(Array.isArray(project.collaborationNeeds) ? project.collaborationNeeds : []),
              ].filter(Boolean),
        }));
        setRows(projects);
        setOffers(Array.isArray(availableOffers) ? availableOffers : []);
      } catch (error) {
        if (active) setMessage((error as Error).message || 'Unable to load collaboration records.');
      }
    }

    void load();
    return () => { active = false; };
  }, [profile?.organization_id]);

  const filteredProjects = useMemo(() => filterUniversityCollaborationProjects(rows, universityId, supportType), [rows, universityId, supportType]);
  const recommendedPartners = useMemo(() => {
    if (!offers.length) return [];
    return offers.filter((offer: any) => {
      const supportValues = Array.isArray(offer.supportTypes) ? offer.supportTypes : [];
      if (supportType === 'ALL') return true;
      return supportValues.some((value: string) => normalizeSupportType(value) === normalizeSupportType(supportType));
    });
  }, [offers, supportType]);

  useEffect(() => {
    if (!filteredProjects.length) {
      setRequest(current => ({ ...current, projectId: '' }));
      return;
    }
    setRequest(current => ({
      ...current,
      projectId: current.projectId && filteredProjects.some(project => project.id === current.projectId)
        ? current.projectId
        : filteredProjects[0].id,
    }));
  }, [filteredProjects]);

  async function createRequest(event: any) {
    event.preventDefault();
    if (!request.projectId || !request.expertise.trim() || !request.message.trim()) {
      setMessage('Select a project and add the required support expertise and message before sending the request.');
      return;
    }

    setBusy(true);
    setMessage('Sending collaboration request…');

    try {
      const project = filteredProjects.find(item => item.id === request.projectId) || rows.find(item => item.id === request.projectId);
      const payload = {
        supportType: request.supportType,
        expertise: request.expertise,
        projectId: request.projectId,
        projectTitle: project?.title || 'University project',
        partnerName: request.partnerName || 'Industry partner',
        description: request.message,
        blocker: request.message,
        status: 'OPEN',
        createdByRole: profile?.role || 'UNIVERSITY_ADMIN',
        createdByUserId: currentUserId,
      };

      await api.createGuidanceRequest(request.projectId, payload);
      await createNotification({
        recipientId: currentUserId || 'anonymous',
        recipientRole: profile?.role,
        type: 'COLLABORATION_REQUEST',
        title: 'Industry collaboration requested',
        message: `${project?.title || 'Your project'} requested ${request.supportType.toLowerCase()} support from ${request.partnerName || 'an industry partner'}.`,
        relatedProjectId: request.projectId,
        relatedUniversityId: universityId,
        relatedPartnerId: undefined,
        priority: 'NORMAL',
        actionUrl: '/dashboard/industry-collaboration',
      });
      setMessage('Collaboration request sent successfully.');
      setRequest(current => ({ ...current, message: '', expertise: '', partnerName: '' }));
      if (onNavigate) onNavigate('/dashboard/projects');
    } catch (error) {
      setMessage((error as Error).message || 'Unable to send the collaboration request.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="civic-page space-y-5">
    <SectionHeader title="Industry Collaboration" subtitle="Manage university-only project requests and match them to credible industry support partners."/>
    {message && <div className="rounded-lg border border-primary-200 bg-primary-50 p-3 text-sm text-primary-800">{message}</div>}

    <Card className="p-5 border-secondary-100 bg-secondary-50">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-semibold text-primary-900">University collaboration scope</h3>
          <p className="text-sm text-neutral-600 mt-1">Only projects belonging to the current university appear here. Support requests are linked to the live project record and stored under the project’s guidance log.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">Support type</span>
          <select className="input min-w-[170px]" value={supportType} onChange={event => setSupportType(event.target.value)}>
            {UNIVERSITY_SUPPORT_TYPES.map(type => <option key={type} value={type}>{type === 'ALL' ? 'All support' : type}</option>)}
          </select>
        </div>
      </div>
    </Card>

    <div className="grid xl:grid-cols-[1.5fr,0.9fr] gap-5">
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <EmptyState icon={<Handshake size={40} />} title="No matching collaboration projects" description="Your university has no active projects for the selected support type yet." />
        ) : (
          filteredProjects.map((project: any) => {
            const projectSupportTypes = Array.isArray(project.supportTypes) && project.supportTypes.length ? project.supportTypes : ['MENTORSHIP'];
            return <Card key={project.id} className="p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <span className="badge bg-secondary-50 text-secondary-700">{project.industryPartnerName || 'Open to partnerships'}</span>
                  <h3 className="font-semibold mt-3 text-primary-900">{project.title}</h3>
                  <p className="text-sm text-neutral-500 mt-1">Status: {String(project.status || 'SOLUTION_DEVELOPMENT').replaceAll('_', ' ')}</p>
                </div>
                <button className="btn-secondary text-xs" onClick={()=>onNavigate('/dashboard/projects')}>Open project</button>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {projectSupportTypes.slice(0, 5).map((type: string) => <span key={`${project.id}-${type}`} className="badge bg-neutral-100 text-neutral-600">{String(type).replaceAll('_', ' ')}</span>)}
              </div>
              <div className="mt-4 grid sm:grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Mentor</p>
                  <p className="mt-1 font-medium text-neutral-800">{project.industryMentorName || 'Not assigned yet'}</p>
                </div>
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Current route</p>
                  <p className="mt-1 font-medium text-neutral-800">{project.collaborationType || 'UNIVERSITY'}</p>
                </div>
              </div>
              <button className="btn-primary mt-4 text-xs" onClick={() => setRequest(current => ({ ...current, projectId: project.id, supportType: projectSupportTypes[0] || 'MENTORSHIP' }))}>Request support</button>
            </Card>;
          })
        )}
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <h3 className="font-semibold text-primary-900">Send support request</h3>
          <form className="space-y-3 mt-4" onSubmit={createRequest}>
            <select className="input" value={request.projectId} onChange={event => setRequest(current => ({ ...current, projectId: event.target.value }))}>
              <option value="">Select project</option>
              {filteredProjects.map((project: any) => <option key={project.id} value={project.id}>{project.title}</option>)}
            </select>
            <select className="input" value={request.supportType} onChange={event => setRequest(current => ({ ...current, supportType: event.target.value }))}>
              {UNIVERSITY_SUPPORT_TYPES.filter(type => type !== 'ALL').map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <input className="input" placeholder="Partner name (optional)" value={request.partnerName} onChange={event => setRequest(current => ({ ...current, partnerName: event.target.value }))} />
            <input className="input" placeholder="Required expertise e.g. IoT + sensor calibration" value={request.expertise} onChange={event => setRequest(current => ({ ...current, expertise: event.target.value }))} />
            <textarea className="input" rows={4} placeholder="Share the exact gap, expected outcome, and preferred collaboration model." value={request.message} onChange={event => setRequest(current => ({ ...current, message: event.target.value }))} />
            <button className="btn-primary w-full" disabled={busy || !request.projectId}>{busy ? 'Sending…' : 'Send request'}</button>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-primary-900">AI-recommended partners</h3>
            <Sparkles className="text-primary-600" size={16} />
          </div>
          <div className="space-y-3 mt-4">
            {recommendedPartners.length === 0 ? (
              <p className="text-sm text-neutral-500">No partner matches for the current support type yet. Try a broader filter.</p>
            ) : (
              recommendedPartners.slice(0, 3).map((offer: any, index: number) => (
                <div key={`${offer.id || offer.name || index}`} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-sm">{offer.partnerName || offer.name || 'Industry partner'}</b>
                    <span className="badge bg-success-50 text-success-700">{offer.status || 'AVAILABLE'}</span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-2">{(offer.supportTypes || []).join(' · ') || 'General support'}</p>
                  <p className="text-sm text-neutral-600 mt-2">{offer.description || 'Ready to support collaborative prototype, testing, and deployment needs.'}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  </div>;
}

function useLoad(loader:()=>Promise<any>){const[data,setData]=useState<any>(null),[error,setError]=useState('');useEffect(()=>{loader().then(setData).catch(e=>setError(e.message))},[]);return{data,error}}
