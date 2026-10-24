import { useMemo, useState } from 'react';
import { CheckCircle2, FileText, MapPin, Search, Users, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePlatform } from '@/context/PlatformContext';
import TextEffect from '@/components/ui/text-effect';
import { buildCollaborationConfirmationUpdate, buildGovernmentPublishUpdate, buildGovernmentVerificationUpdate, updateProblem, type CollaborationType } from '@/lib/problems';
import { api } from '@/lib/api';
import { Card, EmptyState, LoadingState, SectionHeader } from '@/components/ui';
import { PRIORITY_CONFIG, formatDate, timeAgo } from '@/lib/constants';
import { useToast } from '@/context/ToastContext';
import { canVerifyProblem } from '@/lib/problems';
import type { Challenge } from '@/types';

type Props = { mode?: 'ALL' | 'GOVERNMENT' | 'UNIVERSITY' | 'INDUSTRY'; view?: 'VALIDATION' | 'CHALLENGES' };

export default function ProblemWorkspace({ mode = 'ALL', view }: Props) {
  const { profile } = useAuth();
  const { show } = useToast();
  const { challenges, loading, refresh } = usePlatform();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [registrationProblem, setRegistrationProblem] = useState<Challenge | null>(null);
  const [busy, setBusy] = useState('');
  const [clarification, setClarification] = useState<{ id: string; message: string } | null>(null);
  const [collaborationChoice, setCollaborationChoice] = useState<Record<string, CollaborationType>>({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [district, setDistrict] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [collaboration, setCollaboration] = useState('ALL');
  const [expertise, setExpertise] = useState('ALL');
  const [sort, setSort] = useState('RELEVANT');
  const isGovernmentUser = canVerifyProblem(profile?.role);
  const effectiveMode = mode === 'ALL' ? (isGovernmentUser ? 'GOVERNMENT' : ['INDUSTRY_PARTNER', 'STARTUP', 'MSME', 'CSR_PARTNER', 'RESEARCH_LAB'].includes(profile?.role || '') ? 'INDUSTRY' : ['STUDENT', 'FACULTY', 'UNIVERSITY_ADMIN'].includes(profile?.role || '') ? 'UNIVERSITY' : 'ALL') : (mode === 'GOVERNMENT' && !isGovernmentUser ? 'ALL' : mode);
  const rows = useMemo(() => challenges.filter(problem => {
    if (effectiveMode === 'GOVERNMENT') {
      const verified = String(problem.governmentVerificationStatus || '').toUpperCase() === 'VERIFIED' || String(problem.currentStage || '').toUpperCase() === 'GOVERNMENT_VERIFIED' || ['VALIDATED', 'OPEN_FOR_INSTITUTIONS', 'ASSIGNED'].includes(String(problem.status || '').toUpperCase());
      if (view === 'VALIDATION') return problem.source === 'firestore' && !verified;
      if (view === 'CHALLENGES') return problem.source === 'firestore' && verified;
      return problem.source === 'firestore';
    }
    if (effectiveMode === 'UNIVERSITY') return problem.source === 'firestore' && problem.isPublished === true && ['UNIVERSITY', 'UNIVERSITY_AND_INDUSTRY'].includes(String(problem.collaborationType || problem.aiRecommendedCollaboration));
    if (effectiveMode === 'INDUSTRY') return problem.source === 'firestore' && problem.isPublished === true && ['INDUSTRY', 'UNIVERSITY_AND_INDUSTRY'].includes(String(problem.collaborationType || problem.aiRecommendedCollaboration));
    return !profile || problem.submitted_by === profile.id;
  }).filter(problem => {
    const title = String(problem.title || '').trim().toLowerCase();
    const description = String(problem.description || '').toLowerCase();
    return !(title === 'community challenge' && description.includes('cinematic montage'));
  }).filter(problem => {
    const text = `${problem.title} ${problem.description} ${problem.domain} ${problem.district} ${problem.block} ${(problem.aiRequiredExpertise || problem.ai_required_expertise || []).join(' ')}`.toLowerCase();
    const required = problem.aiRequiredExpertise || problem.ai_required_expertise || [];
    const route = String(problem.collaborationType || problem.aiRecommendedCollaboration || '').toUpperCase();
    return effectiveMode !== 'UNIVERSITY' || (text.includes(search.toLowerCase()) && (category === 'ALL' || String(problem.domain || '').toLowerCase() === category.toLowerCase()) && (district === 'ALL' || problem.district === district) && (priority === 'ALL' || String(problem.priority_level || '').toUpperCase() === priority) && (collaboration === 'ALL' || route === collaboration) && (expertise === 'ALL' || required.some((item: string) => item.toLowerCase() === expertise.toLowerCase())));
  }).sort((a, b) => effectiveMode !== 'UNIVERSITY' ? 0 : sort === 'PRIORITY' ? b.priority_score - a.priority_score : sort === 'UPDATED' ? new Date(String(b.updated_at)).getTime() - new Date(String(a.updated_at)).getTime() : new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime()), [challenges, effectiveMode, profile, view, search, category, district, priority, collaboration, expertise, sort]);
  const selected = rows.find(problem => problem.id === selectedId) || null;

  async function act(id: string, changes: Record<string, unknown>) {
    setBusy(id);
    try { await updateProblem(id, changes); } catch (error) { show((error as Error).message || 'Could not update this problem.', 'error'); throw error; } finally { setBusy(''); }
  }

  async function verify(id: string) {
    if (!profile?.id) {
      show('You must be signed in to verify a problem.', 'error');
      return;
    }
    if (!isGovernmentUser) {
      show('You do not have permission to verify this problem.', 'error');
      return;
    }

    setBusy(id);
    try {
      await updateProblem(id, buildGovernmentVerificationUpdate(profile.id));
      await refresh();
      show('Problem verified successfully.', 'success');
      window.location.hash = '/dashboard/challenges';
    } catch (error) {
      console.error('Problem verification failed:', error);
      show('Unable to verify this problem. Please try again.', 'error');
    } finally {
      setBusy('');
    }
  }

  async function publish(problem: Challenge) {
    if (!profile?.id || !isGovernmentUser) {
      show('You do not have permission to publish this challenge.', 'error');
      return;
    }
    if (String(problem.governmentVerificationStatus || '').toUpperCase() !== 'VERIFIED') {
      show('Only government-verified problems can be published.', 'error');
      return;
    }
    setBusy(problem.id);
    try {
      await updateProblem(problem.id, buildGovernmentPublishUpdate(profile.id, {
        category: problem.domain,
        subcategory: problem.subdomain,
        title: problem.title,
        description: problem.description,
        affectedGroup: (problem as any).affectedGroup,
        suggestedExpertise: problem.ai_required_expertise,
        suggestedIndustryExpertise: problem.aiSuggestedIndustryDomain,
      }));
      await refresh();
      show('Challenge published successfully.', 'success');
    } catch (error) {
      console.error('Challenge publication failed:', error);
      show('Unable to publish challenge. Please try again.', 'error');
    } finally {
      setBusy('');
    }
  }

  async function confirmCollaboration(problem: Challenge) {
    if (!profile?.id || !isGovernmentUser) {
      show('You do not have permission to confirm collaboration.', 'error');
      return;
    }
    const choice = collaborationChoice[problem.id] || problem.aiRecommendedCollaboration;
    if (!choice) return;
    setBusy(problem.id);
    try {
      await updateProblem(problem.id, buildCollaborationConfirmationUpdate(profile.id, choice));
      await refresh();
      show('Collaboration decision saved.', 'success');
    } catch (error) {
      console.error('Collaboration decision failed:', error);
      show('Unable to save collaboration decision. Please try again.', 'error');
    } finally {
      setBusy('');
    }
  }

  function expressUniversityInterest(problem: Challenge) { setRegistrationProblem(problem); }

  async function offerIndustrySupport(problem: Challenge) {
    if (!profile?.id) return;
    setBusy(problem.id);
    try {
      await updateProblem(problem.id, { industryInterest: { industryId: profile.organization_id || profile.id, industryName: profile.full_name, expertise: problem.aiSuggestedIndustryDomain || [], supportType: 'Technical support', offeredAt: new Date(), offeredBy: profile.id } });
      await refresh();
      show('Industry support offer submitted.', 'success');
    } catch (error) {
      console.error('Industry support failed:', error);
      show('Unable to submit industry support. Please try again.', 'error');
    } finally { setBusy(''); }
  }

  async function approveUniversity(problem: Challenge) {
    const interest = (problem as any).universityInterest;
    if (!profile?.id || !interest) return;
    await act(problem.id, { universityId: interest.universityId, universityName: interest.universityName, universityDepartment: interest.department, currentStage: 'UNIVERSITY_ASSIGNED', challengeStatus: 'UNIVERSITY_ASSIGNED' });
    await refresh();
    show('University assigned successfully.', 'success');
  }

  async function approveIndustry(problem: Challenge) {
    const interest = (problem as any).industryInterest;
    if (!profile?.id || !interest) return;
    await act(problem.id, { industryPartnerId: interest.industryId, industryPartnerName: interest.industryName, industrySupportType: interest.supportType, currentStage: 'INDUSTRY_ASSIGNED', challengeStatus: 'INDUSTRY_ASSIGNED' });
    await refresh();
    show('Industry partner assigned successfully.', 'success');
  }

  async function requestClarification() {
    if (!clarification?.message.trim()) return;
    await act(clarification.id, { governmentVerificationStatus: 'CLARIFICATION_REQUIRED', governmentRemarks: clarification.message.trim(), clarificationRequest: { message: clarification.message.trim(), requestedAt: new Date(), requestedBy: profile?.id, status: 'OPEN' } });
    setClarification(null);
  }

  if (loading) return <LoadingState label="Loading live problems..." />;
  return <div className="civic-page space-y-5">
    <SectionHeader title={view === 'VALIDATION' ? 'Government Validation Queue' : view === 'CHALLENGES' ? 'Government Challenges' : effectiveMode === 'GOVERNMENT' ? 'Government Problems' : effectiveMode === 'UNIVERSITY' ? 'Discover Challenges' : effectiveMode === 'INDUSTRY' ? 'Industry Opportunities' : 'Problems'} subtitle={effectiveMode === 'UNIVERSITY' ? 'Explore verified community challenges and find problems your university team can solve.' : 'Live records from the shared Firestore problems collection.'} />
    {effectiveMode === 'UNIVERSITY' && <UniversityChallengeFilters challenges={challenges} search={search} setSearch={setSearch} category={category} setCategory={setCategory} district={district} setDistrict={setDistrict} priority={priority} setPriority={setPriority} collaboration={collaboration} setCollaboration={setCollaboration} expertise={expertise} setExpertise={setExpertise} sort={sort} setSort={setSort} resultCount={rows.length} />}
    {!rows.length ? <EmptyState icon={<FileText size={40} />} title="No live problems found" description="New Firestore submissions will appear here automatically." /> : <div className="grid lg:grid-cols-2 gap-4">{rows.map(problem => <ProblemCard key={problem.id} problem={problem} effectiveMode={effectiveMode} busy={busy === problem.id} collaborationChoice={collaborationChoice[problem.id]} onCollaborationChoice={choice => setCollaborationChoice(current => ({ ...current, [problem.id]: choice }))} onOpen={() => setSelectedId(problem.id)} onVerify={() => void verify(problem.id)} onPublish={() => void publish(problem)} onConfirmCollaboration={() => void confirmCollaboration(problem)} onExpressUniversityInterest={() => void expressUniversityInterest(problem)} onOfferIndustrySupport={() => void offerIndustrySupport(problem)} onApproveUniversity={() => void approveUniversity(problem)} onApproveIndustry={() => void approveIndustry(problem)} onClarify={() => setClarification({ id: problem.id, message: '' })} />)}</div>}
    {selected && <ProblemDetails problem={selected} close={() => setSelectedId(null)} />}
    {registrationProblem && <TeamRegistrationModal challenge={registrationProblem} profile={profile} onClose={() => setRegistrationProblem(null)} onSuccess={async () => { setRegistrationProblem(null); await refresh(); show('Team registered successfully! Your team is now visible in My Teams and the project workspace.', 'success'); window.location.hash = '/dashboard/teams'; }} />}
    {clarification && <div className="fixed inset-0 z-50 bg-primary-950/30 p-4 flex items-center justify-center" onClick={() => setClarification(null)}><div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-xl bg-[#fffaf0] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-primary-900">Request Clarification</h2><button className="btn-ghost" onClick={() => setClarification(null)} aria-label="Close clarification dialog"><X size={18} /></button></div><textarea autoFocus className="input mt-4 min-h-32" value={clarification.message} onChange={(event) => setClarification(current => current ? { ...current, message: event.target.value } : current)} placeholder="Describe the additional information needed from the citizen." /><div className="flex justify-end gap-2 mt-4"><button className="btn-secondary" onClick={() => setClarification(null)}>Cancel</button><button className="btn-primary" disabled={!clarification.message.trim() || busy === clarification.id} onClick={() => void requestClarification()}>Send Request</button></div></div></div>}
  </div>;
}

function UniversityChallengeFilters({ challenges, search, setSearch, category, setCategory, district, setDistrict, priority, setPriority, collaboration, setCollaboration, expertise, setExpertise, sort, setSort, resultCount }: { challenges: Challenge[]; search: string; setSearch: (value: string) => void; category: string; setCategory: (value: string) => void; district: string; setDistrict: (value: string) => void; priority: string; setPriority: (value: string) => void; collaboration: string; setCollaboration: (value: string) => void; expertise: string; setExpertise: (value: string) => void; sort: string; setSort: (value: string) => void; resultCount: number }) {
  const verifiedChallenges = challenges.filter(challenge => challenge.source === 'firestore' && challenge.isPublished === true);
  const categories = [...new Set(verifiedChallenges.map(challenge => challenge.domain).filter(Boolean))].sort();
  const districts = [...new Set(verifiedChallenges.map(challenge => challenge.district).filter(Boolean))].sort();
  const expertiseOptions = [...new Set(verifiedChallenges.flatMap(challenge => challenge.aiRequiredExpertise || challenge.ai_required_expertise || []))].sort();
  const activeFilters = [{ label: category !== 'ALL' ? category : '', clear: () => setCategory('ALL') }, { label: district !== 'ALL' ? district : '', clear: () => setDistrict('ALL') }, { label: priority !== 'ALL' ? priority : '', clear: () => setPriority('ALL') }, { label: collaboration !== 'ALL' ? collaboration.replaceAll('_', ' + ') : '', clear: () => setCollaboration('ALL') }, { label: expertise !== 'ALL' ? expertise : '', clear: () => setExpertise('ALL') }].filter(filter => filter.label);
  function clear() { setSearch(''); setCategory('ALL'); setDistrict('ALL'); setPriority('ALL'); setCollaboration('ALL'); setExpertise('ALL'); setSort('RELEVANT'); }
  return <div className="space-y-4 mb-5"><Card className="p-4"><label className="relative block"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input className="input pl-10 w-full" placeholder="Search challenges by title, problem, location, category, or expertise..." value={search} onChange={event => setSearch(event.target.value)}/></label><div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">Browse by Category</p><div className="flex flex-wrap gap-2">{categories.map(item => <button className={`badge cursor-pointer ${category === item ? 'bg-primary-100 text-primary-800' : 'bg-neutral-100 text-neutral-600'}`} key={item} onClick={() => setCategory(category === item ? 'ALL' : item)}>{item}</button>)}</div></div></Card><div className="flex flex-wrap gap-2 items-center"><select className="input w-auto text-xs" value={category} onChange={event => setCategory(event.target.value)}><option value="ALL">All Categories</option>{categories.map(item => <option key={item}>{item}</option>)}</select><select className="input w-auto text-xs" value={district} onChange={event => setDistrict(event.target.value)}><option value="ALL">All Districts</option>{districts.map(item => <option key={item}>{item}</option>)}</select><select className="input w-auto text-xs" value={priority} onChange={event => setPriority(event.target.value)}><option value="ALL">All Priorities</option>{['CRITICAL','HIGH','MEDIUM','LOW'].map(item => <option key={item}>{item}</option>)}</select><select className="input w-auto text-xs" value={collaboration} onChange={event => setCollaboration(event.target.value)}><option value="ALL">All Collaboration</option><option value="UNIVERSITY">University Only</option><option value="UNIVERSITY_AND_INDUSTRY">University + Industry</option><option value="INDUSTRY">Industry Support</option><option value="GOVERNMENT_COMMUNITY">Government / Community</option></select><select className="input w-auto text-xs" value={expertise} onChange={event => setExpertise(event.target.value)}><option value="ALL">All Expertise</option>{expertiseOptions.map(item => <option key={item}>{item}</option>)}</select><select className="input w-auto text-xs ml-auto" value={sort} onChange={event => setSort(event.target.value)}><option value="RELEVANT">Most Relevant</option><option value="NEWEST">Newest</option><option value="UPDATED">Recently Updated</option><option value="PRIORITY">Highest Priority</option></select><button className="btn-secondary text-xs" onClick={clear}>Clear Filters</button></div>{activeFilters.length > 0 && <div className="flex flex-wrap items-center gap-2 text-xs"><span className="text-neutral-500">Active Filters:</span>{activeFilters.map(filter => <button className="badge bg-primary-50 text-primary-700" key={filter.label} onClick={filter.clear}>{filter.label} ×</button>)}</div>}<p className="text-sm font-semibold text-primary-900">{resultCount} verified {resultCount === 1 ? 'challenge' : 'challenges'} found</p></div>;
}

const FALLBACK_PROBLEM_IMAGE = 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=1200&q=85';

function ProblemCard({ problem, effectiveMode, busy, collaborationChoice, onCollaborationChoice, onOpen, onVerify, onPublish, onConfirmCollaboration, onExpressUniversityInterest, onOfferIndustrySupport, onApproveUniversity, onApproveIndustry, onClarify }: { problem: Challenge; effectiveMode: string; busy: boolean; collaborationChoice?: CollaborationType; onCollaborationChoice: (choice: CollaborationType) => void; onOpen: () => void; onVerify: () => void; onPublish: () => void; onConfirmCollaboration: () => void; onExpressUniversityInterest: () => void; onOfferIndustrySupport: () => void; onApproveUniversity: () => void; onApproveIndustry: () => void; onClarify: () => void }) {
  const image = problem.imageUrl || (problem as any).evidence?.find((item: any) => item?.type === 'image' || item?.type?.startsWith('image/'))?.url || problem.evidence_urls?.[0] || FALLBACK_PROBLEM_IMAGE;
  const stage = String((problem as any).currentStage || 'REPORTED');
  const isVerified = String((problem as any).governmentVerificationStatus || '').toUpperCase() === 'VERIFIED' || String(problem.status || '').toUpperCase() === 'VALIDATED' || String(problem.status || '').toUpperCase() === 'OPEN_FOR_INSTITUTIONS' || String(stage).toUpperCase() === 'GOVERNMENT_VERIFIED';
  const isPublished = Boolean(problem.isPublished);
  const recommendation = problem.aiRecommendedCollaboration;
  const selectedCollaboration = collaborationChoice || problem.collaborationType || recommendation;
  return <Card className="overflow-hidden"><img src={image} alt={problem.title || 'Community problem'} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = FALLBACK_PROBLEM_IMAGE; }} className="h-48 w-full object-cover" /><div className="p-5"><div className="flex items-start justify-between gap-3"><span className="badge bg-primary-50 text-primary-700">{problem.domain || 'Other'}</span><span className="badge bg-amber-50 text-amber-700">{problem.priority_level || 'MEDIUM'}</span></div><button className="text-left w-full" onClick={onOpen}><h2 className="font-bold text-primary-900 mt-3">{problem.title || 'Untitled Community Problem'}</h2><p className="text-sm text-neutral-600 mt-2 line-clamp-3">{problem.description || 'No description provided.'}</p></button><div className="flex flex-wrap gap-3 text-xs text-neutral-500 mt-4"><span><MapPin size={12} className="inline" /> {[problem.district, problem.block, problem.village].filter(Boolean).join(' / ') || 'Location unavailable'}</span><span>Stage: {stage}</span><span>Progress: {(problem as any).progress ?? 0}%</span><span>Reported: {formatDate(problem.created_at)}</span></div>{effectiveMode === 'GOVERNMENT' && <div className="mt-4 space-y-3"><div className="flex flex-wrap gap-2"><button disabled={busy || isVerified} onClick={onVerify} className="btn-primary !py-2 disabled:opacity-70 disabled:cursor-not-allowed"><CheckCircle2 size={14} /> {busy ? 'Verifying...' : isVerified ? 'Verified' : 'Verify Problem'}</button>{isVerified && !isPublished && <button disabled={busy} onClick={onPublish} className="btn-accent !py-2 disabled:opacity-70">Publish Challenge</button>}<button disabled={busy || isVerified} onClick={onClarify} className="btn-secondary !py-2 disabled:opacity-50 disabled:cursor-not-allowed">Request Clarification</button></div>{isPublished && <div className="rounded-lg bg-secondary-50 border border-secondary-100 p-3"><div className="text-sm font-semibold text-secondary-800">Published as challenge</div><div className="text-xs text-neutral-600 mt-1">AI recommendation: {recommendation?.replaceAll('_', ' + ') || 'Unavailable'}</div><div className="flex flex-wrap gap-2 mt-2"><select aria-label="Government collaboration decision" disabled={busy} value={selectedCollaboration || ''} onChange={event => onCollaborationChoice(event.target.value as CollaborationType)} className="input !py-2 text-xs"><option value="UNIVERSITY">University</option><option value="INDUSTRY">Industry</option><option value="UNIVERSITY_AND_INDUSTRY">University + Industry</option><option value="GOVERNMENT_COMMUNITY">Government / Community</option></select><button disabled={busy || !selectedCollaboration} onClick={onConfirmCollaboration} className="btn-secondary !py-2 text-xs">Confirm Collaboration</button>{(problem as any).universityInterest && <button disabled={busy} onClick={onApproveUniversity} className="btn-secondary !py-2 text-xs">Approve University</button>}{(problem as any).industryInterest && <button disabled={busy} onClick={onApproveIndustry} className="btn-secondary !py-2 text-xs">Approve Industry</button>}</div></div>}</div>}{effectiveMode === 'UNIVERSITY' && <button disabled={busy || Boolean((problem as any).universityInterest || problem.universityName)} onClick={onExpressUniversityInterest} className="btn-primary !py-2 mt-4 disabled:opacity-60">{problem.universityName ? 'University Assigned' : (problem as any).universityInterest ? 'Interest Submitted' : 'Express Interest'}</button>}{effectiveMode === 'INDUSTRY' && <button disabled={busy || Boolean((problem as any).industryInterest || problem.industryPartnerName)} onClick={onOfferIndustrySupport} className="btn-primary !py-2 mt-4 disabled:opacity-60">{problem.industryPartnerName ? 'Industry Assigned' : (problem as any).industryInterest ? 'Support Offered' : 'Offer Technical Support'}</button>}</div></Card>;
}

function ProblemDetails({ problem, close }: { problem: Challenge; close: () => void }) {
  const evidence = ((problem as any).evidence || []).filter((item: any) => item?.url).map((item: any) => ({ url: item.url, name: item.name || 'Submitted evidence', type: item.type || '' }));
  return <div className="fixed inset-0 z-50 bg-primary-950/30 p-4 flex items-center justify-center" onClick={close}><div className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-[#fffaf0] p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex justify-between gap-3"><div><span className="badge bg-primary-50 text-primary-700">{problem.domain || 'Other'}</span><p className="text-xs text-neutral-500 mt-2">Reported {timeAgo(problem.created_at)}</p></div><button className="btn-ghost" onClick={close} aria-label="Close problem details"><X size={18} /></button></div><TextEffect as="h2" preset="slide" className="mt-4 text-2xl font-bold text-primary-900">{problem.title || 'Untitled Community Problem'}</TextEffect><p className="text-sm text-neutral-700 mt-3 whitespace-pre-wrap">{problem.description || 'No description provided.'}</p><div className="grid sm:grid-cols-2 gap-3 mt-5"><Info label="Location" value={[problem.district, problem.block, problem.village].filter(Boolean).join(' / ') || 'Location unavailable'} /><Info label="Government" value={(problem as any).governmentVerificationStatus || 'PENDING'} /><Info label="Stage" value={(problem as any).currentStage || 'REPORTED'} /><Info label="Progress" value={`${(problem as any).progress ?? 0}%`} /></div>{evidence.length > 0 && <div className="mt-5"><h3 className="font-semibold text-primary-900">Submitted Evidence</h3><div className="grid sm:grid-cols-2 gap-3 mt-2">{evidence.map((item: any) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="block"><img src={item.url} alt={item.name} className="aspect-video w-full rounded-lg object-cover" onError={event => { event.currentTarget.style.display = 'none'; }} /><span className="text-xs text-primary-700 mt-1 block">{item.name}</span></a>)}</div></div>}{(problem as any).clarificationRequest?.message && <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mt-5 text-sm text-amber-900">Clarification requested: {(problem as any).clarificationRequest.message}</div>}<button className="btn-secondary mt-5" onClick={close}>Close</button></div></div>;
}

function TeamRegistrationModal({ challenge, profile, onClose, onSuccess }: { challenge: Challenge; profile: any; onClose: () => void; onSuccess: () => Promise<void> }) {
  type StudentEntry = { name: string; studentId: string; email: string; department: string };
  const [teamName, setTeamName] = useState('');
  const [students, setStudents] = useState<StudentEntry[]>([
    { name: '', studentId: '', email: '', department: '' },
    { name: '', studentId: '', email: '', department: '' },
    { name: '', studentId: '', email: '', department: '' },
  ]);
  const [faculty, setFaculty] = useState({ name: profile?.role === 'FACULTY' ? profile.full_name || '' : '', facultyId: profile?.role === 'FACULTY' ? profile.id || '' : '', department: profile?.role === 'FACULTY' ? profile.bio || '' : '', email: profile?.role === 'FACULTY' ? profile.email || '' : '' });
  const [university, setUniversity] = useState({ name: profile?.full_name || '', department: profile?.bio || '', college: profile?.organization_id || '', coordinator: profile?.full_name || '', email: profile?.email || '', phone: profile?.phone || '' });
  const [declared, setDeclared] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateStudent(index: number, key: keyof StudentEntry, value: string) { setStudents(current => current.map((student, position) => position === index ? { ...student, [key]: value } : student)); }
  function validate() {
    if (!teamName.trim()) return 'Enter a team name.';
    if (students.length < 3 || students.length > 6) return 'A team must have between 3 and 6 students.';
    if (students.some(student => !student.name.trim() || !student.studentId.trim() || !student.email.trim() || !student.department.trim())) return 'Complete every student name, ID, email, and department.';
    const ids = students.map(student => student.studentId.trim().toLowerCase());
    const emails = students.map(student => student.email.trim().toLowerCase());
    const duplicates = (values: string[]) => [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
    const duplicateIds = duplicates(ids);
    const duplicateEmails = duplicates(emails);
    if (duplicateIds.length || duplicateEmails.length) return `Duplicate ${duplicateIds.length ? `student ID${duplicateIds.length > 1 ? 's' : ''}: ${duplicateIds.join(', ')}` : ''}${duplicateIds.length && duplicateEmails.length ? ' and ' : ''}${duplicateEmails.length ? `email${duplicateEmails.length > 1 ? 's' : ''}: ${duplicateEmails.join(', ')}` : ''}. Use a unique value for each student.`;
    if (!faculty.name.trim() || !faculty.facultyId.trim() || !faculty.department.trim() || !faculty.email.trim()) return 'Complete the registered faculty mentor details.';
    if (!declared) return 'Confirm the team declaration before submitting.';
    return '';
  }
  async function submit() {
    const validation = validate();
    if (validation) { setError(validation); return; }
    setBusy(true); setError('');
    try {
      const result = await api.registerTeam({
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        challengeCategory: challenge.domain,
        challengeLocation: [challenge.district, challenge.block, challenge.village].filter(Boolean).join(' · '),
        challengeDescription: challenge.description,
        aiSuggestedExpertise: challenge.aiRequiredExpertise || challenge.ai_required_expertise || [],
        aiRecommendedCollaboration: challenge.aiRecommendedCollaboration || challenge.collaborationType,
        universityId: profile?.organization_id || profile?.id,
        universityName: university.name.trim(),
        department: university.department.trim(),
        universityDetails: university,
        coordinator: university,
        teamName: teamName.trim(),
        students,
        studentIds: students.map(student => student.studentId.trim()),
        studentCount: students.length,
        facultyMentorId: faculty.facultyId.trim(),
        facultyMentorDetails: faculty,
        teamStatus: 'SOLUTION_DEVELOPMENT',
        milestones: ['Problem Understanding', 'Research', 'Solution Design', 'Solution Proposal', 'Prototype Development', 'Field Testing', 'Deployment', 'Citizen Verification'].map((title, index) => ({ id: `milestone-${index + 1}`, title, done: index === 0 })),
      });
      if (result.duplicate) throw new Error('A team is already registered for this challenge by this university. Open the existing project instead.');
      await onSuccess();
    } catch (submissionError) { setError((submissionError as Error).message || 'Unable to register the team.'); } finally { setBusy(false); }
  }
  return <div className="fixed inset-0 z-50 bg-primary-950/35 p-3 sm:p-6 flex items-center justify-center" onMouseDown={event => event.currentTarget === event.target && !busy && onClose()}><div role="dialog" aria-modal="true" aria-labelledby="team-registration-title" className="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-2xl bg-[#fffaf0] border border-neutral-200 shadow-2xl"><div className="sticky top-0 z-10 bg-[#fffaf0]/95 backdrop-blur border-b border-neutral-200 p-4 flex items-start justify-between gap-3"><div><h2 id="team-registration-title" className="text-xl font-bold text-primary-900">Register Team for Development</h2><p className="text-sm text-neutral-500 mt-1">{challenge.title}</p></div><button className="btn-ghost" disabled={busy} onClick={onClose} aria-label="Close team registration"><X size={18} /></button></div><div className="p-4 sm:p-6 space-y-5">
    <section><h3 className="font-semibold text-primary-900">Challenge Details</h3><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3"><Info label="Challenge ID" value={challenge.challenge_code || challenge.id} /><Info label="Category" value={challenge.domain || 'Not specified'} /><Info label="District / Location" value={[challenge.district, challenge.block, challenge.village].filter(Boolean).join(' · ') || 'Not specified'} /><Info label="Problem Description" value={challenge.description || 'Not specified'} /><Info label="AI Suggested Expertise" value={(challenge.aiRequiredExpertise || challenge.ai_required_expertise || []).join(', ') || 'Not specified'} /><Info label="AI Recommended Collaboration" value={String(challenge.aiRecommendedCollaboration || challenge.collaborationType || 'University').replaceAll('_', ' + ')} /></div></section>
    <section><h3 className="font-semibold text-primary-900">University Details</h3><div className="grid sm:grid-cols-2 gap-3 mt-3">{Object.entries(university).map(([key, value]) => <label className="text-sm font-medium text-neutral-700" key={key}>{key.replace(/([A-Z])/g, ' $1')}<input className="input mt-1" value={value} onChange={event => setUniversity(current => ({ ...current, [key]: event.target.value }))} /></label>)}</div></section>
    <section><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold text-primary-900">Team Details</h3><p className="text-xs text-neutral-500 mt-1">Add 3 to 6 students. Faculty mentor is separate.</p></div><input className="input max-w-xs" placeholder="Team name" value={teamName} onChange={event => setTeamName(event.target.value)} /></div><div className="space-y-3 mt-3">{students.map((student, index) => <div className="rounded-xl border border-neutral-200 p-3" key={index}><div className="flex items-center justify-between mb-2"><b className="text-sm text-primary-900">Student {index + 1}</b>{students.length > 3 && <button className="text-xs text-error-600" onClick={() => setStudents(current => current.filter((_, position) => position !== index))}>Remove</button>}</div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">{Object.entries(student).map(([key, value]) => <input className="input text-sm" key={key} placeholder={key === 'studentId' ? 'Student ID / Roll Number' : key[0].toUpperCase() + key.slice(1)} value={value} onChange={event => updateStudent(index, key as keyof StudentEntry, event.target.value)} />)}</div></div>)}</div>{students.length < 6 && <button className="btn-secondary mt-3" onClick={() => setStudents(current => [...current, { name: '', studentId: '', email: '', department: '' }])}>+ Add Student</button>}</section>
    <section><h3 className="font-semibold text-primary-900">Faculty Mentor</h3><p className="text-xs text-neutral-500 mt-1">The faculty mentor registers and validates the team; student development controls remain with the team.</p><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-3">{Object.entries(faculty).map(([key, value]) => <input className="input" key={key} placeholder={key[0].toUpperCase() + key.slice(1)} value={value} onChange={event => setFaculty(current => ({ ...current, [key]: event.target.value }))} />)}</div></section>
    <label className="flex items-start gap-2 rounded-xl border border-primary-200 bg-primary-50 p-3 text-sm text-primary-900"><input type="checkbox" className="mt-1" checked={declared} onChange={event => setDeclared(event.target.checked)} /> <span>I confirm that this team consists of 3–6 students and one registered faculty mentor, and that the team will begin solution development for this verified challenge.</span></label>
    {error && <p className="rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700" role="alert">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2"><button className="btn-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || !declared} onClick={() => void submit()}>{busy ? 'Registering Team...' : 'Register Team & Start Development'}</button></div>
  </div></div></div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-neutral-50 p-3"><span className="text-xs text-neutral-500">{label}</span><p className="font-semibold text-neutral-800 mt-1">{value}</p></div>; }