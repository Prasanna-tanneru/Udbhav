import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { Evidence } from '@jansetu/shared';
import {
  DEMO_CHALLENGES,
  DEMO_PROJECTS,
  DEMO_SOLUTIONS,
  DEMO_CLUSTERS,
  DEMO_IMPACT_METRICS,
  DEMO_COMMUNITY_FEEDBACK,
  DEMO_PROPOSAL,
  ORGANIZATIONS,
  JHARKHAND_DISTRICTS,
  DEMO_FACULTY,
  DEMO_STUDENTS,
  DEMO_NOTIFICATIONS,
} from '@/data/demo';
import { createProblem, problemToChallenge, updateProblem } from '@/lib/problems';
import { mainRoleFor } from '@/types';
import { markAllNotificationsRead as markAllLiveNotificationsRead, markNotificationRead as markLiveNotificationRead, createNotification } from '@/lib/notificationService';

export const apiBase = 'local://static-demo';
type AnyRecord = Record<string, any>;

function stamp(value: any) { return value?.toDate ? value.toDate().toISOString() : value || new Date().toISOString(); }
function normalize(id: string, value: AnyRecord) { return { id, ...value, createdAt: stamp(value.createdAt || value.created_at), updatedAt: stamp(value.updatedAt || value.updated_at) }; }
async function read(name: string, constraints: any[] = []): Promise<AnyRecord[]> {
  if (!db) return [];
  try {
    const snapshot = await getDocs(query(collection(db, name), ...constraints));
    return snapshot.docs.map(item => normalize(item.id, item.data()));
  } catch {
    return [];
  }
}
async function readOne(name: string, id: string): Promise<AnyRecord> {
  if (!db) return { id };
  try {
    const snapshot = await getDoc(doc(db, name, id));
    if (!snapshot.exists()) return { id };
    return normalize(snapshot.id, snapshot.data());
  } catch {
    return { id };
  }
}
async function create(name: string, value: AnyRecord) {
  if (db) {
    try {
      const record = { ...value, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      const result = await addDoc(collection(db, name), record);
      return normalize(result.id, { ...value, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    } catch (error) {
      if (db && auth?.currentUser) throw error;
    }
  }
  return normalize(`local-${Date.now()}`, { ...value, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
}
async function update(name: string, id: string, value: AnyRecord) {
  if (db) {
    try {
      await updateDoc(doc(db, name, id), { ...value, updatedAt: serverTimestamp() });
      return readOne(name, id);
    } catch {}
  }
  return normalize(id, { ...value, updatedAt: new Date().toISOString() });
}
async function remove(name: string, id: string) {
  if (db) {
    try { await deleteDoc(doc(db, name, id)); } catch {}
  }
  return { id, deleted: true };
}

function challengeView(c: AnyRecord): AnyRecord {
  return {
    ...c,
    publicId: c.publicId || c.challenge_code || c.id,
    issueType: c.issueType || c.issue_type || 'INNOVATION_OPPORTUNITY',
    priority: c.priority || { total: c.priorityScore ?? c.priority_score ?? 0, factors: c.priorityBreakdown || c.priority_breakdown || {} },
    reporterId: c.reporterId || c.submitted_by || '',
    submittedByName: c.submittedByName || c.submitted_by_name || 'Citizen',
    affectedPeople: c.affectedPeople ?? c.affected_population ?? 0,
    seasonal: c.seasonal ?? c.is_seasonal,
    safetyConcern: c.safetyConcern ?? c.has_safety_concern,
    expertise: c.expertise || c.ai_required_expertise || [],
    createdAt: stamp(c.createdAt || c.created_at),
    updatedAt: stamp(c.updatedAt || c.updated_at)
  };
}

function projectView(p: AnyRecord) {
  return {
    ...p,
    projectCode: p.projectCode || p.project_code || `PRJ-${p.id.slice(0,8).toUpperCase()}`,
    challengeId: p.challengeId || p.challenge_id,
    irl: p.irl ?? p.irl_level ?? 1,
    universityId: p.universityId || p.organization_id,
    universityName: p.universityName || p.organization_name || 'Institution',
    team: p.team || p.team_members || [],
    milestones: (p.milestones || []).map((m: AnyRecord) => ({
      ...m,
      dueDate: m.dueDate || m.due_date,
      done: m.done ?? (m.status === 'COMPLETED')
    })),
    tasks: (p.tasks || []).map((t: AnyRecord) => ({
      ...t,
      dueDate: t.dueDate || t.due_date
    })),
    createdAt: stamp(p.createdAt || p.created_at),
    updatedAt: stamp(p.updatedAt || p.updated_at)
  };
}

const api: Record<string, (...args: any[]) => Promise<any>> = {
  stats: async () => ({
    challenges: DEMO_CHALLENGES.length,
    projects: DEMO_PROJECTS.length,
    solutions: DEMO_SOLUTIONS.length,
    districts: JHARKHAND_DISTRICTS.length,
  }),
  challenges: async () => {
    const [firebaseChallenges, firebaseProblems] = await Promise.all([read('challenges'), read('problems')]);
    const firebaseRecords = [
      ...firebaseChallenges.map(challengeView),
      ...firebaseProblems.map(problem => challengeView(problemToChallenge(problem.id, problem))),
    ];
    const records = new Map(firebaseRecords.map(challenge => [challenge.id, challenge]));
    DEMO_CHALLENGES.forEach(challenge => {
      if (!records.has(challenge.id)) records.set(challenge.id, challengeView(challenge));
    });
    return [...records.values()];
  },
  challenge: async (id: string) => challengeView(DEMO_CHALLENGES.find(c => c.id === id || c.challenge_code === id) || DEMO_CHALLENGES[0]),
  createChallenge: async (body: AnyRecord) => {
    try {
      if (db && auth?.currentUser) {
        const structured = body.structured || {};
        const created = await createProblem({
          title: structured.title || body.title || 'Untitled Community Problem',
          description: structured.description || body.description || 'No description provided.',
          originalText: body.originalText,
          originalLanguage: body.originalLanguage,
          translatedText: body.translatedText,
          category: structured.domain || body.domain || 'Other',
          subcategory: structured.subdomain || body.subcategory,
          priority: body.priority || 'MEDIUM',
          aiSummary: structured.aiSummary,
          aiKeyIssues: body.aiKeyIssues,
          affectedGroup: body.affectedGroup,
          suggestedExpertise: structured.expertise || body.suggestedExpertise || [],
          suggestedUniversityDomain: structured.domain || body.suggestedUniversityDomain,
          suggestedIndustryExpertise: body.suggestedIndustryExpertise || [],
          location: body.location,
          impact: { affectedPeople: body.affectedPeople, urgency: body.urgency, frequency: body.frequency, affectedGroup: body.affectedGroup, safetyImpact: body.safetyConcern },
          evidence: body.evidence || [],
          voiceRecordingUrl: body.voiceRecordingUrl,
          governmentVerificationStatus: 'PENDING',
          currentStage: 'REPORTED',
          progress: 0,
          communitySupportCount: 0,
          communityCommentCount: 0,
          citizenVerificationStatus: 'PENDING',
          isPublished: false,
          publishedAt: null,
          publishedBy: null,
          challengeStatus: 'DRAFT',
          aiRecommendedCollaboration: null,
          aiSuggestedUniversityDomain: [],
          aiSuggestedIndustryDomain: [],
          aiRequiredExpertise: structured.expertise || body.suggestedExpertise || [],
          aiRecommendedAction: null,
          aiReasoning: null,
          collaborationType: null,
          collaborationConfirmedBy: null,
          collaborationConfirmedAt: null,
          district: body.district,
          block: body.block,
          village: body.village,
          ward: body.ward,
          address: body.address,
          latitude: body.latitude,
          longitude: body.longitude,
          tags: structured.tags || [],
          public: true,
        });
        return challengeView(problemToChallenge(created.id, created));
      }
    } catch (error) {
      if (db && auth?.currentUser) throw error;
    }
    const newId = `ch-${Date.now()}`;
    return challengeView({
      id: newId,
      challenge_code: `CH-JH-2026-${String(DEMO_CHALLENGES.length + 1).padStart(6, '0')}`,
      title: body.title || 'Community Challenge',
      description: body.description || '',
      domain: body.domain || 'Other',
      issue_type: body.issue_type || body.issueType || 'INNOVATION_OPPORTUNITY',
      status: 'PENDING_VALIDATION',
      priority_score: 75,
      priority_level: 'HIGH',
      submitted_by: auth?.currentUser?.uid || 'current-user',
      submitted_by_name: 'Citizen Submitter',
      district: body.district || 'Ranchi',
      block: body.block || '',
      village: body.village || '',
      affected_population: Number(body.affectedPeople || body.affected_population || 100),
      duration: body.duration || 'Ongoing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...body,
    });
  },
  updateChallenge: async (id: string, body: AnyRecord) => {
    try {
      if (db && auth?.currentUser) {
        await updateProblem(id, body);
        return challengeView({ id, ...body });
      }
    } catch {}
    return challengeView({ id, ...body });
  },
  challengePreview: async (body: AnyRecord) => ({
    title: body.title || String(body.description || '').split(/[.!?]/)[0].trim().slice(0, 120) || 'Untitled Community Problem',
    description: body.description || '',
    domain: body.domain || 'Other',
    issueType: 'INNOVATION_OPPORTUNITY',
    confidence: 0.92,
    priority: { total: 78 },
    duplicates: [],
  }),
  validate: async (id: string, body: AnyRecord) => {
    try {
      if (db && auth?.currentUser) {
        const verified = ['VALIDATED', 'OPEN_FOR_INSTITUTIONS'].includes(body.decision);
        const clarification = body.decision === 'NEEDS_INFORMATION';
        const changes: AnyRecord = {
          governmentVerificationStatus: verified ? 'VERIFIED' : clarification ? 'CLARIFICATION_REQUIRED' : body.decision === 'REJECTED' ? 'REJECTED' : 'PENDING',
          currentStage: verified ? 'GOVERNMENT_VERIFIED' : clarification ? 'REPORTED' : body.decision,
          verifiedAt: verified ? serverTimestamp() : undefined,
          verifiedBy: verified ? auth.currentUser.uid : undefined,
          governmentRemarks: body.note,
          clarificationRequest: clarification ? { message: body.note, requestedAt: serverTimestamp(), requestedBy: auth.currentUser.uid, status: 'OPEN' } : undefined,
        };
        await updateProblem(id, changes);
        return challengeView({ id, ...changes });
      }
    } catch {}
    const c = DEMO_CHALLENGES.find(x => x.id === id) || DEMO_CHALLENGES[0];
    return challengeView({ ...c, status: body.decision === 'REJECT' ? 'REJECTED' : body.decision });
  },
  challengeComment: async (id: string, body: AnyRecord) => {
    try {
      if (db) return await create(`challenges/${id}/comments`, { ...body, authorId: auth?.currentUser?.uid || '' });
    } catch {}
    return { id: `c-${Date.now()}`, authorId: auth?.currentUser?.uid || '', ...body, createdAt: new Date().toISOString() };
  },
  duplicates: async () => [],
  analyseEvidence: async () => ({ summary: 'Evidence analysis is ready.', confidence: 0.94 }),
  matches: async () => ORGANIZATIONS.filter(x => x.type === 'UNIVERSITY'),
  teamRecommendation: async () => ({ faculty: DEMO_FACULTY, students: DEMO_STUDENTS }),
  clusters: async () => DEMO_CLUSTERS,
  refreshClusters: async () => DEMO_CLUSTERS,
  universities: async () => ORGANIZATIONS.filter(x => x.type === 'UNIVERSITY'),
  university: async (id: string) => ORGANIZATIONS.find(x => x.id === id) || ORGANIZATIONS[0],
  faculty: async () => DEMO_FACULTY,
  universityFacultyPortal: async () => {
    if (!auth?.currentUser || !db) return { universityId: '', faculty: [], teams: [], projects: [] };
    const user = await readOne('users', auth.currentUser.uid);
    const universityId = user.organizationId || user.organization_id;
    if (!universityId) return { universityId: '', faculty: [], teams: [], projects: [] };
    const faculty = await read('facultyMentors', [where('universityId', '==', universityId)]);
    const legacyFaculty = faculty.length ? faculty : await read('faculty', [where('universityId', '==', universityId)]);
    const teams = await read('teams', [where('universityId', '==', universityId)]);
    const projects = await read('projects', [where('universityId', '==', universityId)]);
    return { universityId, faculty: legacyFaculty, teams, projects: projects.map(projectView) };
  },
  students: async () => DEMO_STUDENTS,
  industry: async () => ORGANIZATIONS.filter(x => ['INDUSTRY', 'STARTUP', 'MSME', 'CSR_PARTNER', 'RESEARCH_LAB'].includes(x.type)),
  projects: async () => {
    const live = await read('projects');
    if (!live.length) return DEMO_PROJECTS.map(projectView);
    const user = auth?.currentUser ? await readOne('users', auth.currentUser.uid) : {};
    const universityId = user.organizationId || user.organization_id;
    if (!universityId) return [];
    return live.filter(project => project.universityId === universityId || project.organization_id === universityId).map(projectView);
  },
  registeredTeams: async () => {
    const teams = await read('teams');
    if (!auth?.currentUser) return teams;
    const user = await readOne('users', auth.currentUser.uid);
    const universityId = user.organizationId || user.organization_id;
    return universityId ? teams.filter(team => team.universityId === universityId) : teams;
  },
  registerTeam: async (payload: AnyRecord) => {
    if (!db || !auth?.currentUser) throw new Error('You must be signed in to register a team.');
    const existingTeams = await read('teams');
    const existingTeam = existingTeams.find(team => team.challengeId === payload.challengeId && team.universityId === payload.universityId);
    if (existingTeam) return { team: existingTeam, project: undefined, duplicate: true };
    const existingMentors = await read('facultyMentors', [where('universityId', '==', payload.universityId), where('facultyId', '==', payload.facultyMentorId)]);
    if (!existingMentors.length) await create('facultyMentors', { universityId: payload.universityId, name: payload.facultyMentorDetails?.name, facultyId: payload.facultyMentorId, department: payload.facultyMentorDetails?.department, email: payload.facultyMentorDetails?.email, status: 'ACTIVE' });
    const team = await create('teams', payload);
    const existingProjects = await read('projects');
    const existingProject = existingProjects.find(project => project.challengeId === payload.challengeId && project.universityId === payload.universityId);
    const projectPayload = {
      title: payload.challengeTitle,
      challengeId: payload.challengeId,
      problemId: payload.challengeId,
      challengeTitle: payload.challengeTitle,
      challengeLocation: payload.challengeLocation,
      challengeCategory: payload.challengeCategory,
      challengeDescription: payload.challengeDescription,
      ownerId: auth.currentUser.uid,
      createdBy: auth.currentUser.uid,
      universityId: payload.universityId,
      universityName: payload.universityName,
      teamId: team.id,
      teamName: payload.teamName,
      team: payload.students,
      team_members: payload.students,
      facultyMentorId: payload.facultyMentorId,
      facultyMentorName: payload.facultyMentorDetails?.name,
      status: 'SOLUTION_DEVELOPMENT',
      progress: 0,
      milestones: payload.milestones || [],
    };
    const project = existingProject ? await update('projects', existingProject.id, projectPayload) : await create('projects', projectPayload);
    await updateProblem(payload.challengeId, {
      universityId: payload.universityId,
      universityName: payload.universityName,
      universityDepartment: payload.department,
      universityInterest: {
        universityId: payload.universityId,
        universityName: payload.universityName,
        department: payload.department,
        interestedAt: new Date(),
        interestedBy: auth.currentUser.uid,
        teamId: team.id,
        status: 'REGISTERED',
      },
      studentTeamId: team.id,
      studentTeamName: payload.teamName,
      facultyMentorId: payload.facultyMentorId,
      facultyMentorName: payload.facultyMentorDetails?.name,
      currentStage: 'SOLUTION_DEVELOPMENT',
      challengeStatus: 'SOLUTION_DEVELOPMENT',
      progress: 0,
    });
    const governmentUsers = await read('users', [where('role', 'in', ['PANCHAYAT_OFFICER', 'ULB_OFFICER', 'DISTRICT_OFFICER', 'GOVERNMENT_OFFICER', 'DEPARTMENT_ADMIN', 'PROJECT_OFFICER'])]);
    await Promise.all(governmentUsers.map(user => createNotification({ recipientId: user.id, recipientRole: user.role, type: 'TEAM_REGISTERED', title: 'University team registered', message: `${payload.teamName} started solution development for ${payload.challengeTitle}.`, relatedProblemId: payload.challengeId, relatedProjectId: project.id, relatedTeamId: team.id, relatedUniversityId: payload.universityId, priority: 'NORMAL', actionUrl: '/dashboard/projects' })));
    return { team, project, duplicate: false };
  },
  project: async (id: string) => {
    const live = await readOne('projects', id);
    const raw = Object.keys(live).length > 1 ? live : (DEMO_PROJECTS.find(x => x.id === id || x.project_code === id) || DEMO_PROJECTS[0]);
    const project = projectView(raw);
    const relatedFeedback = DEMO_COMMUNITY_FEEDBACK.filter(f => f.project_id === raw.id);
    const relatedImpact = DEMO_IMPACT_METRICS.filter(m => m.project_id === raw.id).map(m => ({
      ...m,
      projectId: m.project_id,
      metric: m.metric_name,
      before: m.before_value,
      after: m.after_value,
      unit: m.metric_unit,
      verified: true,
      verifiedAt: '2026-09-01T00:00:00Z',
    }));
    const relatedSolutions = DEMO_SOLUTIONS.filter(s => s.project_id === raw.id);

    return {
      project,
      tasks: (raw.tasks || await read(`projects/${id}/tasks`)).map((t: any) => ({ ...t, dueDate: t.due_date || t.dueDate })),
      milestones: (raw.milestones || await read(`projects/${id}/milestones`)).map((m: any) => ({ ...m, dueDate: m.due_date || m.dueDate, done: m.done ?? m.status === 'COMPLETED' })),
      funding: [
        { id: 'f-1', requestedAmount: raw.funding_required || 850000, approvedAmount: raw.funding_received || 600000, releasedAmount: raw.funding_received || 600000, spentAmount: 420000, purpose: 'Telemetry sensor deployment and field instrumentation', status: 'APPROVED' }
      ],
      prototypes: [
        { id: 'proto-1', version: 'v0.2', description: 'LoRaWAN multi-parameter telemetry sensor unit with solar backup', cost: 4500, knownIssues: 'Battery life drops during extended overcast', media: [] }
      ],
      tests: [
        { id: 't-1', type: 'LAB', name: 'pH & Turbidity Calibration', metric: 'Accuracy', expected: '±0.1 pH', actual: '±0.08 pH', passed: true, evidence: [] },
        { id: 't-2', type: 'FIELD', name: 'Telemetry Range Test', metric: 'Range over forest terrain', expected: '3 km', actual: '3.4 km', passed: true, evidence: [] }
      ],
      pilots: [
        { id: 'pilot-1', site: 'Angara Block', community: 'Hutwa & Silli villages', beneficiaries: raw.beneficiaries || 4500, installedUnits: 3, status: 'ACTIVE', startDate: '2026-06-01', endDate: '2026-11-30', evidence: [] }
      ],
      feedback: relatedFeedback.length ? relatedFeedback : DEMO_COMMUNITY_FEEDBACK,
      impact: relatedImpact.length ? relatedImpact : DEMO_IMPACT_METRICS.map(m => ({ ...m, projectId: m.project_id, metric: m.metric_name, before: m.before_value, after: m.after_value, unit: m.metric_unit, verified: true })),
      solutions: relatedSolutions.length ? relatedSolutions : DEMO_SOLUTIONS,
      messages: [
        { id: 'msg-1', authorName: 'Dr. Rajesh Kumar', text: 'Baseline water testing samples from Hutwa open wells completed.', createdAt: '2026-08-15T10:00:00Z' },
        { id: 'msg-2', authorName: 'Priya Sharma', text: 'MQTT telemetry pipeline live and streaming data to Grafana.', createdAt: '2026-08-20T14:30:00Z' }
      ],
      collaborations: [
        { id: 'collab-1', partnerName: 'Tata Steel CSR', contributionType: 'TESTING & FUNDING', status: 'ACTIVE' }
      ],
      proposal: DEMO_PROPOSAL,
      patents: [],
      startups: [],
      technologyTransfers: [],
      blockers: await read(`projects/${id}/blockers`),
      guidanceRequests: await read(`projects/${id}/guidanceRequests`),
    };
  },
  blockers: async (projectId: string) => read(`projects/${projectId}/blockers`),
  createBlocker: async (projectId: string, body: AnyRecord) => create(`projects/${projectId}/blockers`, body),
  resolveBlocker: async (projectId: string, blockerId: string) => update(`projects/${projectId}/blockers`, blockerId, { status: 'RESOLVED', resolvedAt: serverTimestamp() }),
  guidanceRequests: async (projectId: string) => read(`projects/${projectId}/guidanceRequests`),
  createGuidanceRequest: async (projectId: string, body: AnyRecord) => create(`projects/${projectId}/guidanceRequests`, body),
  projectStatus: async (id: string, status: string) => {
    try {
      if (db) return projectView(await update('projects', id, { status }));
    } catch {}
    const p = DEMO_PROJECTS.find(x => x.id === id) || DEMO_PROJECTS[0];
    return projectView({ ...p, status });
  },
  milestone: async (projectId: string, id: string, body: AnyRecord) => {
    try {
      if (db) return await update(`projects/${projectId}/milestones`, id, body);
    } catch {}
    return { id, projectId, ...body };
  },
  task: async (projectId: string, body: AnyRecord) => {
    try {
      if (db) return await create(`projects/${projectId}/tasks`, body);
    } catch {}
    return { id: `task-${Date.now()}`, projectId, ...body, createdAt: new Date().toISOString() };
  },
  updateTask: async (projectId: string, id: string, body: AnyRecord) => {
    try {
      if (db) return await update(`projects/${projectId}/tasks`, id, body);
    } catch {}
    return { id, projectId, ...body };
  },
  taskComment: async (projectId: string, taskId: string, body: AnyRecord) => {
    try {
      if (db) return await create(`projects/${projectId}/tasks/${taskId}/comments`, body);
    } catch {}
    return { id: `tc-${Date.now()}`, projectId, taskId, ...body, authorName: 'Team Member', createdAt: new Date().toISOString() };
  },
  taskComments: async (projectId: string, taskId: string) => [],
  solutions: async () => DEMO_SOLUTIONS,
  similarChallenges: async () => [
    { challengeId: 'ch-002', publicId: 'CH-JH-2026-000002', title: 'Unsafe road crossing near primary school', similarity: 0.82, district: 'Dhanbad', locationDistanceKm: 42, status: 'VALIDATED' }
  ],
  refreshReplication: async () => [],
  requestReuse: async (id: string, body: AnyRecord) => ({ id: `reuse-${Date.now()}`, solutionId: id, ...body }),
  analytics: async () => ({
    totalChallenges: DEMO_CHALLENGES.length,
    projects: DEMO_PROJECTS.length,
    validated: DEMO_CHALLENGES.filter(x => ['VALIDATED', 'ASSIGNED'].includes(x.status)).length,
    highPriority: DEMO_CHALLENGES.filter(x => (x.priority_score || 0) >= 70).length,
    citizensImpacted: DEMO_PROJECTS.reduce((sum, x) => sum + Number(x.beneficiaries || 0), 0),
    universities: ORGANIZATIONS.filter(x => x.type === 'UNIVERSITY').length,
    districts: JHARKHAND_DISTRICTS.map(d => ({
      name: d.name,
      value: DEMO_CHALLENGES.filter(c => c.district === d.name).length || d.challenge_count || 0
    }))
  }),
  hotspots: async () => DEMO_CLUSTERS,
  analyticsCopilot: async () => ({
    answer: 'Analytics overview: Water Resources and Agriculture represent the highest volume of community challenges across Ranchi and Dhanbad districts. 2 active multidisciplinary projects are currently in prototyping and field-testing stages.'
  }),
  notifications: async () => {
    if (db && auth?.currentUser) {
      const live = await read('notifications', [where('recipientId', '==', auth.currentUser.uid)]);
      return live;
    }
    return DEMO_NOTIFICATIONS;
  },
  markNotificationRead: async (id: string) => {
    if (db && auth?.currentUser) await markLiveNotificationRead(id);
    return { id, read: true };
  },
  markAllNotificationsRead: async (ids: string[]) => {
    if (db && auth?.currentUser) await markAllLiveNotificationsRead(ids);
    return { read: true };
  },
  updateUserPreferences: async (preferences: AnyRecord) => {
    if (!db || !auth?.currentUser) return preferences;
    await setDoc(doc(db, 'users', auth.currentUser.uid), preferences, { merge: true });
    return preferences;
  },
  registerDeviceToken: async (token: string) => {
    try {
      if (db) return await setDoc(doc(db, 'users', auth?.currentUser?.uid || 'anonymous', 'devices', token), { token, createdAt: serverTimestamp() });
    } catch {}
  },
  search: async (term: string) => {
    const q = term.toLowerCase();
    return {
      challenges: DEMO_CHALLENGES.filter((x: AnyRecord) => `${x.title} ${x.description}`.toLowerCase().includes(q)),
      projects: DEMO_PROJECTS.filter((x: AnyRecord) => x.title?.toLowerCase().includes(q)),
      organizations: ORGANIZATIONS.filter((x: AnyRecord) => x.name?.toLowerCase().includes(q)),
      solutions: DEMO_SOLUTIONS.filter((x: AnyRecord) => x.title?.toLowerCase().includes(q))
    };
  },
  autocomplete: async () => [],
  studentDashboard: async () => ({
    projects: DEMO_PROJECTS.map(projectView),
    tasks: DEMO_PROJECTS[0]?.tasks || [],
    applications: [{ id: 'app-1', title: DEMO_CHALLENGES[0].title, status: 'ACCEPTED' }],
    recommendedChallenges: DEMO_CHALLENGES.map(challengeView),
    contribution: { completedTasks: 2 }
  }),
  facultyDashboard: async () => ({
    mentorCapacity: 3,
    projects: DEMO_PROJECTS.map(projectView),
    pendingProposalReviews: [{ id: 'rev-1', title: 'Water Quality Monitoring System v2.1', department: 'Environmental Science' }],
    mentorshipInvitations: [],
    profile: { name: 'Dr. Rajesh Kumar', email: 'faculty@jansetu.demo' }
  }),
  universityDashboard: async () => ({
    capacity: { activeProjects: DEMO_PROJECTS.length, configured: 6 },
    faculty: DEMO_FACULTY,
    students: DEMO_STUDENTS,
    labs: [{ id: 'l-1', name: 'IoT Sensor Network Lab' }, { id: 'l-2', name: 'Water Quality Testing Lab' }],
    recommendedChallenges: DEMO_CHALLENGES.map(challengeView),
    projects: DEMO_PROJECTS.map(projectView),
    applications: []
  }),
  universityOverview: async () => {
    if (!auth?.currentUser || !db) return { universityId: '', university: null, teams: [], projects: [], faculty: [], milestones: [], collaborations: [], attention: [], activity: [] };
    const user = await readOne('users', auth.currentUser.uid);
    const universityId = user.organizationId || user.organization_id;
    if (!universityId) return { universityId: '', university: null, teams: [], projects: [], faculty: [], milestones: [], collaborations: [], attention: [], activity: [] };
    const [university, teams, rawProjects, faculty, problems] = await Promise.all([
      readOne('organizations', universityId),
      read('teams', [where('universityId', '==', universityId)]),
      read('projects', [where('universityId', '==', universityId)]),
      read('facultyMentors', [where('universityId', '==', universityId)]),
      read('problems', [where('universityId', '==', universityId)]),
    ]);
    const projects: AnyRecord[] = rawProjects.map(projectView) as AnyRecord[];
    const milestones = projects.flatMap(project => (project.milestones || []).map((milestone: AnyRecord) => ({ ...milestone, projectId: project.id, projectTitle: project.title, date: milestone.completedAt || milestone.updatedAt || project.updatedAt })));
    const collaborations = projects.filter(project => project.industryPartnerId || project.industryPartnerName).map(project => ({ id: project.id, projectId: project.id, projectTitle: project.title, partner: project.industryPartnerName || project.industryPartnerId, mentor: project.industryMentorName, status: project.status }));
    const attention = projects.flatMap(project => (project.tasks || []).filter((task: AnyRecord) => task.status !== 'DONE').slice(0, 2).map((task: AnyRecord) => ({ id: `${project.id}-${task.id}`, projectId: project.id, projectTitle: project.title, title: task.title, action: 'Open project task' })));
    const activity = [...teams.map(team => ({ id: `team-${team.id}`, title: `Team ${team.teamName || 'registered'}`, projectTitle: team.challengeTitle || team.problemId, date: team.createdAt })), ...projects.map(project => ({ id: `project-${project.id}`, title: `Project ${project.title} updated`, projectTitle: project.title, date: project.updatedAt }))].sort((a, b) => new Date(String(b.date || '')).getTime() - new Date(String(a.date || '')).getTime()).slice(0, 8);
    return { universityId, university, teams, projects, faculty, milestones, collaborations, attention, activity, challenges: problems };
  },
  industryDashboard: async () => ({
    collaborations: [{ id: 'col-1', title: 'Smart Sensor Co-Development', status: 'ACTIVE' }],
    commitments: [{ id: 'c-1', projectTitle: DEMO_PROJECTS[0].title, amount: 250000 }],
    fundingRequests: [],
    suggestedProjects: DEMO_PROJECTS.map(projectView),
    partner: { name: 'Tata Steel CSR', email: 'industry@jansetu.demo' }
  }),
  districtDashboard: async () => ({
    district: 'Ranchi',
    challenges: DEMO_CHALLENGES.map(challengeView),
    criticalClusters: DEMO_CLUSTERS,
    projects: DEMO_PROJECTS.map(projectView),
    pilots: [{ id: 'pil-1', site: 'Angara Block', status: 'ACTIVE' }],
    alerts: [{ id: 'alt-1', title: 'Seasonal Contamination Risk', severity: 'HIGH' }],
    domainDistribution: []
  }),
  marketplace: async () => DEMO_CHALLENGES.map(challengeView),
  applications: async () => [],
  applyToChallenge: async (id: string, body: AnyRecord) => ({ id: `app-${Date.now()}`, challengeId: id, applicantId: auth?.currentUser?.uid || '', ...body, status: 'SUBMITTED' }),
  updateApplication: async (id: string, status: string) => ({ id, status }),
  invitations: async () => [],
  answerInvitation: async (id: string, status: string) => ({ id, status }),
  csrMarketplace: async () => DEMO_PROJECTS.map((project: AnyRecord) => ({
    project: projectView(project),
    funding: [
      { id: `f-${project.id}`, requestedAmount: project.funding_required || 850000, purpose: 'Sensors, solar kits, and village field deployment' }
    ]
  })),
  knowledgeGraph: async () => ({
    nodes: [
      ...ORGANIZATIONS.map(o => ({ id: o.id, label: o.name, type: o.type })),
      ...DEMO_CHALLENGES.map(c => ({ id: c.id, label: c.title, type: 'CHALLENGE' })),
      ...DEMO_PROJECTS.map(p => ({ id: p.id, label: p.title, type: 'PROJECT' })),
      ...DEMO_FACULTY.map(f => ({ id: f.id, label: f.name, type: 'FACULTY' }))
    ],
    edges: [
      { id: 'e1', from: 'org-bit-mesra', to: 'ch-001', relation: 'ASSIGNED_TO' },
      { id: 'e2', from: 'proj-001', to: 'ch-001', relation: 'ADDRESSES' },
      { id: 'e3', from: 'org-bit-mesra', to: 'proj-001', relation: 'HOSTS' },
      { id: 'e4', from: 'fac-1', to: 'proj-001', relation: 'MENTORS' },
      { id: 'e5', from: 'org-nit-jamshedpur', to: 'ch-005', relation: 'ASSIGNED_TO' },
      { id: 'e6', from: 'proj-002', to: 'ch-005', relation: 'ADDRESSES' }
    ]
  }),
  community: async (id: string) => {
    if (db) {
      const signals = await read(`problems/${id}/communitySignals`);
      const comments = await read(`problems/${id}/communityComments`);
      const userId = auth?.currentUser?.uid;
      const mySignals = signals.filter(signal => signal.userId === userId);
      return { communityPriority: signals.length, supporters: signals.filter(signal => signal.type === 'SUPPORT').length, affectedConfirmations: signals.filter(signal => signal.type === 'AFFECTED').length, commentCount: comments.length, evidenceCount: 0, incorrectReports: signals.filter(signal => signal.type === 'INCORRECT_REPORT').length, mySignals, myCommentsCount: comments.filter(comment => comment.userId === userId).length, comments };
    }
    const c = DEMO_CHALLENGES.find(x => x.id === id);
    return {
      communityPriority: c?.priority_score || 85,
      supporters: 42,
      affectedConfirmations: 28,
      commentCount: 3,
      evidenceCount: 2,
      incorrectReports: 0,
      mySignals: [{ type: 'SUPPORT' }],
      myCommentsCount: 0,
      comments: [
        { id: 'com-1', authorName: 'Sunita Devi', authorRole: 'CITIZEN', comment: 'Contamination occurs each year during heavy rainfall. We need clean drinking water alerts.', evidence: [] },
        { id: 'com-2', authorName: 'Mohan Mahto', authorRole: 'CITIZEN', comment: 'Confirmed in our neighbouring tola as well.', evidence: [] },
        { id: 'com-3', authorName: 'Rajesh Kumar', authorRole: 'DISTRICT_OFFICER', comment: 'Field verification conducted with Block Development Officer.', evidence: [] }
      ]
    };
  },
  communitySignal: async (id: string, body: AnyRecord) => {
    if (db && auth?.currentUser) return create(`problems/${id}/communitySignals`, { ...body, challengeId: id, userId: auth.currentUser.uid });
    return { id: `sig-${Date.now()}`, challengeId: id, userId: auth?.currentUser?.uid || '', ...body };
  },
  removeCommunitySignal: async (id: string, type: string) => {
    if (db && auth?.currentUser) {
      const signals = await read(`problems/${id}/communitySignals`);
      const mine = signals.find(signal => signal.userId === auth.currentUser?.uid && signal.type === type);
      if (mine) await remove(`problems/${id}/communitySignals`, mine.id);
    }
    return { deleted: true };
  },
  communityComment: async (id: string, body: AnyRecord) => {
    if (db && auth?.currentUser) return create(`problems/${id}/communityComments`, { ...body, challengeId: id, userId: auth.currentUser.uid, authorId: auth.currentUser.uid, authorName: body.authorName || 'Citizen' });
    return { id: `comment-${Date.now()}`, challengeId: id, userId: auth?.currentUser?.uid || '', ...body };
  },
  citizenBadges: async () => [
    { id: 'badge-1', code: 'COMMUNITY_REPORTER', label: 'Community Problem Reporter', reason: 'Submitted verified societal challenge in Ranchi district', awardedAt: '2026-02-15T00:00:00Z' },
    { id: 'badge-2', code: 'PROBLEM_VALIDATOR', label: 'Civic Field Validator', reason: 'Confirmed ground-level conditions for rural water problem', awardedAt: '2026-03-01T00:00:00Z' }
  ],
  volunteerDashboard: async () => ({
    reports: DEMO_CHALLENGES.map(challengeView),
    verified: 4,
    communities: 12,
    stats: { citizensContacted: 184, problemsCollected: 26, verified: 19 },
    needsVerification: DEMO_CHALLENGES.slice(0, 3).map(challengeView)
  }),
  volunteerReport: async (body: AnyRecord) => challengeView({ id: `vol-${Date.now()}`, challenge_code: `VOL-JH-${Date.now().toString().slice(-4)}`, title: 'Volunteer Field Report', ...body, status: 'PENDING_VALIDATION' }),
  mentorship: async () => [
    { id: 'ment-1', projectId: 'proj-001', mentorName: 'Dr. Suresh Pandey', partnerName: 'Tata Steel CSR', requestedExpertise: ['IoT', 'Power Systems'], status: 'ACCEPTED' }
  ],
  updateMentorship: async (id: string, body: AnyRecord) => ({ id, ...body }),
  scheduleMentorMeeting: async (id: string, body: AnyRecord) => ({ id: `meet-${Date.now()}`, mentorshipId: id, ...body }),
  prototypeReviews: async (projectId: string) => [
    { id: 'rev-1', projectId, reviewerName: 'Tata Steel Innovation Lab', decision: 'READY_FOR_PILOT', feedback: 'Hardware casing is robust. Recommended deploying additional nodes in Silli block.', createdAt: '2026-07-20T00:00:00Z' }
  ],
  reviewPrototype: async (projectId: string, prototypeId: string, body: AnyRecord) => ({ id: `rev-${Date.now()}`, projectId, prototypeId, reviewerId: auth?.currentUser?.uid || '', ...body }),
  supportOffers: async () => [
    { id: 'supp-1', supportTypes: ['TESTING', 'MENTORSHIP'], description: 'Providing lab testing and calibration support for water telemetry devices.', capacity: 'Up to 5 teams', status: 'AVAILABLE' }
  ],
  createSupportOffer: async (body: AnyRecord) => ({ id: `supp-${Date.now()}`, ownerId: auth?.currentUser?.uid || '', ...body }),
  industryCalendar: async () => ({
    meetings: [
      { id: 'm-1', agenda: 'Sensor Architecture & Battery Optimization Review', scheduledAt: new Date(Date.now() + 86400000 * 3).toISOString(), durationMinutes: 45, status: 'SCHEDULED' }
    ],
    testing: []
  }),
  governmentCitizens: async () => {
    const demo = DEMO_CHALLENGES.map(challengeView).reduce((rows: AnyRecord[], challenge: AnyRecord, index) => {
      const id = challenge.reporterId || `demo-citizen-${index + 1}`;
      const existing = rows.find(row => row.id === id);
      const problem = {
        ...challenge,
        createdAt: challenge.createdAt || new Date().toISOString(),
        updatedAt: challenge.updatedAt || challenge.createdAt || new Date().toISOString(),
      };
      if (existing) existing.problems.push(problem);
      else rows.push({ id, name: challenge.submittedByName || 'Citizen', email: '', district: challenge.district, role: 'CITIZEN', joinedAt: problem.createdAt, problems: [problem] });
      return rows;
    }, []);
    if (!db) return demo;
    const [users, rawProblems] = await Promise.all([read('users'), read('problems')]);
    const grouped = new Map<string, AnyRecord>();
    users.filter(user => user.role === 'CITIZEN').forEach(user => grouped.set(user.id, {
      id: user.id,
      name: user.full_name || user.displayName || user.email?.split('@')[0] || 'Citizen',
      email: user.email || '',
      avatarUrl: user.avatar_url || user.photoURL,
      district: user.district || '',
      block: user.block || '',
      village: user.village || '',
      role: 'CITIZEN',
      joinedAt: stamp(user.created_at || user.createdAt),
      problems: [],
    }));
    rawProblems.forEach(raw => {
      const challenge = challengeView(problemToChallenge(raw.id, raw));
      const id = challenge.reporterId || raw.createdBy || raw.userId || raw.citizenId;
      if (!id) return;
      const citizen = grouped.get(id) || {
        id,
        name: raw.createdByName || challenge.submittedByName || 'Citizen',
        email: '',
        district: challenge.district || '',
        role: 'CITIZEN',
        joinedAt: stamp(raw.createdAt),
        problems: [],
      };
      citizen.problems.push(challenge);
      citizen.district ||= challenge.district || '';
      grouped.set(id, citizen);
    });
    return grouped.size ? [...grouped.values()] : demo;
  },
  governmentEcosystem: async () => {
    const [organizations, faculty, students, users, rawProblems, projects] = await Promise.all([
      read('organizations'), read('faculty'), read('students'), read('users'), read('problems'), read('projects'),
    ]);
    const liveOrganizations = organizations.length ? organizations : ORGANIZATIONS;
    const liveFaculty = faculty.length ? faculty : DEMO_FACULTY;
    const liveStudents = students.length ? students : DEMO_STUDENTS;
    const liveProblems = rawProblems.length ? rawProblems.map(problem => challengeView(problemToChallenge(problem.id, problem))) : DEMO_CHALLENGES.map(challengeView);
    const liveProjects = projects.length ? projects.map(projectView) : DEMO_PROJECTS.map(projectView);
    const universities = liveOrganizations.filter(item => String(item.type).toUpperCase() === 'UNIVERSITY');
    const industry = liveOrganizations.filter(item => ['INDUSTRY', 'STARTUP', 'MSME', 'CSR_PARTNER', 'RESEARCH_LAB'].includes(String(item.type).toUpperCase()));
    const funding = liveOrganizations.filter(item => ['CSR_PARTNER', 'FOUNDATION', 'FUNDING_PARTNER'].includes(String(item.type).toUpperCase()));
    const volunteers = users.filter(user => user.role === 'VOLUNTEER');
    const industryMentors = users.filter(user => ['MENTOR', 'INDUSTRY_MENTOR'].includes(String(user.role).toUpperCase()));
    const government = users.filter(user => mainRoleFor(user.role || 'CITIZEN') === 'GOVERNMENT');
    const collaborations = liveProblems.filter(problem => problem.universityName || problem.industryPartnerName || problem.assigned_organization_id || problem.project_id).map(problem => ({
      id: problem.id,
      problem,
      university: problem.universityName || liveOrganizations.find(org => org.id === problem.assigned_organization_id)?.name,
      industry: problem.industryPartnerName,
      faculty: problem.facultyMentorName,
      industryMentor: problem.industryMentorName,
    }));
    const activities = liveProblems.slice().sort((a, b) => new Date(String(b.updatedAt || b.createdAt)).getTime() - new Date(String(a.updatedAt || a.createdAt)).getTime()).slice(0, 6).map(problem => ({
      id: problem.id, title: problem.title, date: problem.updatedAt || problem.createdAt, stage: problem.currentStage || problem.challengeStatus || 'REPORTED',
    }));
    return { universities, industry, funding, faculty: liveFaculty, industryMentors, students: liveStudents, volunteers, government, problems: liveProblems, projects: liveProjects, collaborations, activities };
  },
  governmentMentorship: async () => [],
  governmentAlerts: async () => [
    { id: 'alt-1', title: 'Severe Monsoon Water Contamination Cluster', severity: 'HIGH', message: '14 related reports in Angara block require priority intervention.', createdAt: '2026-09-10T00:00:00Z' }
  ],
  announcements: async () => [
    { id: 'ann-1', title: 'Jharkhand State Innovation Challenge Grant 2026', body: 'Grants up to ₹15 Lakhs available for higher education institutions working on verified rural challenges.', category: 'FUNDING', publishedAt: '2026-09-01T00:00:00Z' }
  ],
  deployments: async () => [
    { id: 'dep-1', projectId: 'proj-001', site: 'Hutwa Panchayat Open Well', district: 'Ranchi', deploymentDate: '2026-06-15', status: 'OPERATIONAL', beneficiaries: 4500, installedUnits: 3 }
  ],
  audit: async () => [
    { id: 'aud-1', action: 'CHALLENGE_VALIDATED', entity: 'Challenge', entityId: 'ch-001', actor: 'District Officer', timestamp: '2026-02-15T14:00:00Z' },
    { id: 'aud-2', action: 'PROJECT_ASSIGNED', entity: 'Project', entityId: 'proj-001', actor: 'Government Admin', timestamp: '2026-02-20T10:00:00Z' }
  ],
  roleRequests: async () => [],
  adminUsers: async () => [
    { id: 'u-1', name: 'Sunita Devi', email: 'citizen@jansetu.demo', role: 'CITIZEN', district: 'Ranchi' },
    { id: 'u-2', name: 'Dr. Rajesh Kumar', email: 'faculty@jansetu.demo', role: 'FACULTY', district: 'Ranchi', organizationId: 'org-bit-mesra' },
    { id: 'u-3', name: 'Priya Sharma', email: 'student@jansetu.demo', role: 'STUDENT', district: 'Ranchi', organizationId: 'org-bit-mesra' },
    { id: 'u-4', name: 'District Officer Ranchi', email: 'district@jansetu.demo', role: 'DISTRICT_OFFICER', district: 'Ranchi' }
  ],
  moderation: async () => [],
  featureFlags: async () => [
    { id: 'f-1', key: 'ENABLE_AI_VOICE_INTAKE', enabled: true, description: 'Allow voice recording for citizen challenge reporting' },
    { id: 'f-2', key: 'ENABLE_REPLICATION_ENGINE', enabled: true, description: 'Cross-district solution matching and replication suggestions' }
  ],
  systemHealth: async () => ({
    status: 'READY',
    mode: 'STATIC_DEMO',
    requests: { total: 1420 },
    uptimeSeconds: 7200,
    services: [
      { name: 'Static Demo Data Store', status: 'HEALTHY' },
      { name: 'Firebase Auth', status: 'HEALTHY' },
      { name: 'Local GIS & Mapping', status: 'HEALTHY' },
      { name: 'AI Simulation Pipeline', status: 'HEALTHY' }
    ]
  }),
  aiJobs: async () => [
    { id: 'job-1', type: 'CHALLENGE_PIPELINE', entityId: 'ch-001', attempts: 1, maxAttempts: 3, processingMs: 420, status: 'SUCCEEDED' },
    { id: 'job-2', type: 'CLUSTER_DETECTION', entityId: 'cluster-001', attempts: 1, maxAttempts: 3, processingMs: 650, status: 'SUCCEEDED' }
  ],
  accountExport: async () => ({
    profile: { email: auth?.currentUser?.email || 'citizen@jansetu.demo' },
    challenges: DEMO_CHALLENGES.filter(c => c.submitted_by === (auth?.currentUser?.uid || 'citizen-001'))
  }),
  deleteAccount: async () => ({ ok: true }),
  translate: async (text: string, targetLanguage = 'en', sourceLanguage = 'en') => {
    if (targetLanguage !== 'en' || sourceLanguage === 'en') return { text, translatedText: text, sourceLanguage, targetLanguage };
    const translationEndpoint = import.meta.env.VITE_TRANSLATION_API_URL as string | undefined;
    const translationSource = sourceLanguage === 'sat' || sourceLanguage === 'nag' ? 'auto' : sourceLanguage;
    if (translationEndpoint) {
      const response = await fetch(translationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sourceLanguage: translationSource, targetLanguage }),
      });
      if (!response.ok) throw new Error('Translation service request failed.');
      const result = await response.json() as { translatedText?: string; text?: string };
      const translatedText = result.translatedText || result.text;
      if (!translatedText) throw new Error('Translation service returned no translation.');
      return { text: translatedText, translatedText, sourceLanguage, targetLanguage };
    }
    try {
      const remote = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(translationSource)}&tl=en&dt=t&q=${encodeURIComponent(text)}`);
      if (remote.ok) {
        const payload = await remote.json() as Array<Array<string>>;
        const translatedText = payload?.[0]?.map((part) => part?.[0] || '').join('').trim();
        if (translatedText && translatedText !== text.trim()) return { text: translatedText, translatedText, sourceLanguage, targetLanguage };
      }
    } catch {
      // Use the local prototype phrases below when the browser cannot reach the service.
    }
    const normalized = text.trim().replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const translations: Record<string, string> = {
      'हमारे गांव में पीने का पानी गंदा हो रहा है': 'The drinking water in our village is becoming contaminated.',
      'हमारे गांव में बारिश के समय पीने का पानी गंदा हो जाता है': 'During rain, the drinking water in our village becomes contaminated.',
      'पानी गंदा हो रहा है': 'The water is becoming contaminated.',
      'আমাদের গ্রামের পানীয় জল দূষিত হচ্ছে': 'The drinking water in our village is becoming contaminated.',
      'ہمارے گاؤں کا پینے کا پانی آلودہ ہو رہا ہے': 'The drinking water in our village is becoming contaminated.',
      'आम गांव में पीये के पानी गंदा होवत हे': 'The drinking water in our village is becoming contaminated.',
      'गांव में पानी की समस्या है': 'There is a water problem in the village.',
      'गांव में सड़क की समस्या है': 'There is a road problem in the village.',
    };
    let translatedText = translations[normalized];
    if (!translatedText && sourceLanguage === 'hi' && /पानी/.test(normalized) && /(गंद|दूषित|खराब)/.test(normalized)) {
      translatedText = /बारिश|बरसात|मानसून/.test(normalized)
        ? 'During rain, the drinking water in our village becomes contaminated.'
        : 'The drinking water in our village is becoming contaminated.';
    }
    if (!translatedText && sourceLanguage === 'hi' && /(सड़क|रास्ते)/.test(normalized)) translatedText = 'There is a road safety problem in the village.';
    if (!translatedText && sourceLanguage === 'bn' && /(পানি|জল)/.test(normalized)) translatedText = 'The drinking water in our village is becoming contaminated.';
    if (!translatedText && sourceLanguage === 'ur' && /(پانی|آلودہ)/.test(normalized)) translatedText = 'The drinking water in our village is becoming contaminated.';
    if (!translatedText) throw new Error('A translation service is not configured for this phrase yet.');
    return { text: translatedText, translatedText, sourceLanguage, targetLanguage };
  },
  tts: async () => { throw new Error('Text-to-speech demo fallback: Audio synthesizer is not configured.'); },
  transcribe: async () => ({ text: 'Water contamination during monsoon season causing health issues.' }),
  scanUpload: async () => ({ safe: true, status: 'SAFE' }),
  impactTemplates: async () => [],
  masterData: async () => JHARKHAND_DISTRICTS.map(d => ({ id: d.id, name: d.name, type: 'DISTRICT', code: d.id.toUpperCase() })),
  notificationTemplates: async () => []
};

const apiProxy = new Proxy(api, {
  get(target, property: string) {
    if (property in target) return target[property];
    return async (...args: any[]) => create('workflowEvents', { action: property, arguments: args, actorId: auth?.currentUser?.uid || '' });
  }
});

export { apiProxy as api };
export type { Evidence };
export const publicApi = {
  stats: apiProxy.stats,
  challenges: apiProxy.challenges,
  solutions: apiProxy.solutions,
  passport: async (publicId: string) => ({
    publicId,
    challenge: await apiProxy.challenge(publicId),
    project: null,
    solution: null,
    impact: []
  })
};
