import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { PlatformProvider } from '@/context/PlatformContext';
import LandingPage from '@/components/landing/LandingPage';
import AuthPage from '@/components/auth/AuthPage';
import DashboardShell from '@/components/dashboard/DashboardShell';
import CitizenDashboard from '@/components/dashboard/pages/CitizenDashboard';
import SubmitWizard from '@/components/dashboard/pages/SubmitWizard';
import ChallengeList from '@/components/dashboard/pages/ChallengeList';
import GovDashboard from '@/components/dashboard/pages/GovDashboard';
import ValidationQueue from '@/components/dashboard/pages/ValidationQueue';
import ProjectWorkspace from '@/components/dashboard/pages/ProjectWorkspace';
import {InstitutionsPage,FacultyPage,PartnersPage,TasksPage,AdminUsersPage,AuditPage,ModerationPage,SearchPage,CopilotPage,SettingsPage} from '@/components/dashboard/pages/OperationsPages';
import {
  SolutionsPage, ImpactPage, MapPage, ClustersPage,
  ProfilePage, NotificationsPage,
} from '@/components/dashboard/pages/SimplePages';
import { LoadingState } from '@/components/ui';
import { TransparencyPortal, ImpactPassport } from '@/components/public/PublicPages';
import {StudentCommandCentre,FacultyCommandCentre,UniversityCommandCentre,IndustryCommandCentre,DistrictCommandCentre} from '@/components/dashboard/pages/RoleDashboards';
import {ChallengeMarketplace,CSRMarketplace,KnowledgeGraphPage,AIJobsPage,SystemHealthPage,AdminConfigurationPage} from '@/components/dashboard/pages/AdvancedPages';
import {I18nProvider} from '@/context/I18nContext';
import {StudentPortfolioPage,MentorshipPage,ProposalReviewQueuePage,MatchedChallengesPage,TeamFormationPage,RegisteredTeamsPage,UniversityMilestonesPage,UniversityIndustryCollaborationPage,UniversityProjectsPage,UniversityProjectDetailPage} from '@/components/dashboard/pages/RoleWorkflowPages';
import {CommunityPage,VolunteerDashboard} from '@/components/dashboard/pages/CommunityVolunteerPages';
import {GovernmentEcosystemPage,GovernmentMentorshipMonitor,GovernmentAlertsPage,AnnouncementsPage,DeploymentManagementPage} from '@/components/dashboard/pages/GovernmentExtendedPages';
import GovernmentCitizensView from '@/components/dashboard/pages/GovernmentCitizensView';
import GovernmentEcosystemView from '@/components/dashboard/pages/GovernmentEcosystemView';
import {IndustryMentorWorkspace,PrototypeReviewPage,IndustrySupportPage} from '@/components/dashboard/pages/IndustryExtendedPages';
import ProblemWorkspace from '@/components/dashboard/pages/ProblemWorkspace';
import {PlatformAdminDashboard} from '@/components/dashboard/pages/OperationsPages';
import {mainRoleFor} from '@/types';

function AppContent() {
  const { session, profile, loading } = useAuth();
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');

  useEffect(() => {
    const onHashChange = () => setRoute(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((r: string) => {
    window.location.hash = r;
    setRoute(r);
  }, []);

  // Loading state
  if (loading && session) {
    return <LoadingState label="Loading your dashboard..." />;
  }

  // Public transparency surfaces
  if (route === '/transparency') return <TransparencyPortal onNavigate={navigate} />;
  if (route.startsWith('/passport/')) return <ImpactPassport publicId={decodeURIComponent(route.slice('/passport/'.length))} onNavigate={navigate} />;

  // Auth pages
  if (route === '/signin') {
    return <AuthPage mode="signin" onNavigate={navigate} />;
  }
  if (route === '/signup') {
    return <AuthPage mode="signup" onNavigate={navigate} />;
  }

  // Dashboard routes (require auth)
  if (route.startsWith('/dashboard')) {
    if (!session) {
      return <AuthPage mode="signin" onNavigate={navigate} />;
    }

    const role = profile?.role || 'CITIZEN';
    const mainRole = mainRoleFor(role);
    const isGovRole = mainRole === 'GOVERNMENT' || ['PANCHAYAT_OFFICER','ULB_OFFICER','DISTRICT_OFFICER','GOVERNMENT_OFFICER','DEPARTMENT_ADMIN','PROJECT_OFFICER','FINANCE_OFFICER','ANALYTICS_OFFICER'].includes(role);
    const isAdminRole = ['PLATFORM_ADMIN', 'SUPER_ADMIN'].includes(role);

    function renderPage() {
      // Government roles see command centre as overview
      if (route === '/dashboard' && mainRole === 'PLATFORM_ADMIN') return <PlatformAdminDashboard onNavigate={navigate} />;
      if (route === '/dashboard' && role === 'VOLUNTEER') return <VolunteerDashboard />;
      if (route === '/dashboard' && role === 'STUDENT') return <StudentCommandCentre onNavigate={navigate} />;
      if (route === '/dashboard' && role === 'FACULTY') return <FacultyCommandCentre onNavigate={navigate} />;
      if (route === '/dashboard' && role === 'UNIVERSITY_ADMIN') return <UniversityCommandCentre onNavigate={navigate} />;
      if (route === '/dashboard' && ['INDUSTRY_PARTNER','STARTUP','MSME','CSR_PARTNER','RESEARCH_LAB'].includes(role)) return <IndustryCommandCentre onNavigate={navigate} />;
      if (route === '/dashboard' && isGovRole) return ['DISTRICT_OFFICER','PANCHAYAT_OFFICER','ULB_OFFICER'].includes(role) ? <DistrictCommandCentre onNavigate={navigate} /> : <GovDashboard onNavigate={navigate} />;
      if (route === '/dashboard' && isAdminRole) return <AdminUsersPage />;
      if (route === '/dashboard') return <CitizenDashboard onNavigate={navigate} />;

      // Shared pages
      if (route === '/dashboard/challenges') return isGovRole ? <ProblemWorkspace mode="GOVERNMENT" view="CHALLENGES" /> : <ProblemWorkspace />;
      if (route === '/dashboard/my-challenges') return <ChallengeList onNavigate={navigate} personal />;
      if (route === '/dashboard/submit') return <SubmitWizard onNavigate={navigate} />;
      if (route === '/dashboard/projects' && ['INDUSTRY_PARTNER','STARTUP','MSME','CSR_PARTNER','RESEARCH_LAB'].includes(role)) return <ProblemWorkspace mode="INDUSTRY" />;
      if (route === '/dashboard/projects' && role === 'UNIVERSITY_ADMIN') return <UniversityProjectsPage onNavigate={navigate} />;
      if (route.startsWith('/dashboard/projects/') && role === 'UNIVERSITY_ADMIN') return <UniversityProjectDetailPage projectId={route.replace('/dashboard/projects/', '')} onNavigate={navigate} />;
      if (route === '/dashboard/projects') return <ProjectWorkspace onNavigate={navigate} />;
      if (route === '/dashboard/solutions') return <SolutionsPage onNavigate={navigate} />;
      if (route === '/dashboard/impact') return <ImpactPage onNavigate={navigate} />;
      if (route === '/dashboard/map') return <MapPage onNavigate={navigate} />;
      if (route === '/dashboard/clusters') return <ClustersPage onNavigate={navigate} />;
      if (route === '/dashboard/validation') return isGovRole ? <ProblemWorkspace mode="GOVERNMENT" view="VALIDATION" /> : <CitizenDashboard onNavigate={navigate} />;
      if (route === '/dashboard/profile') return <ProfilePage onNavigate={navigate} />;
      if (route === '/dashboard/notifications') return <NotificationsPage onNavigate={navigate} />;
      if (route === '/dashboard/nearby') return <ChallengeList onNavigate={navigate} />;
      if (route === '/dashboard/marketplace') return <ProblemWorkspace />;
      if (route === '/dashboard/knowledge-graph') return <KnowledgeGraphPage />;
      if (route === '/dashboard/system-health') return <SystemHealthPage />;
      if (route === '/dashboard/ai-jobs') return <AIJobsPage />;
      if (route === '/dashboard/configuration') return <AdminConfigurationPage />;
      if (route === '/dashboard/community') return <CommunityPage />;
      if (route === '/dashboard/universities') return <InstitutionsPage />;
      if (route === '/dashboard/industry-mentors') return <PartnersPage />;
      if (route === '/dashboard/volunteer') return <VolunteerDashboard />;
      if (route === '/dashboard/gov-citizens') return isGovRole || isAdminRole ? <GovernmentCitizensView /> : <CitizenDashboard onNavigate={navigate} />;
      if (route === '/dashboard/gov-ecosystem') return isGovRole || isAdminRole ? <GovernmentEcosystemView onNavigate={navigate} /> : <CitizenDashboard onNavigate={navigate} />;
      if (route === '/dashboard/gov-mentorship') return <GovernmentMentorshipMonitor />;
      if (route === '/dashboard/alerts') return <GovernmentAlertsPage />;
      if (route === '/dashboard/announcements') return <AnnouncementsPage />;
      if (route === '/dashboard/deployments') return <DeploymentManagementPage />;
      if (route === '/dashboard/industry-mentorship') return <IndustryMentorWorkspace />;
      if (route === '/dashboard/prototype-reviews') return <PrototypeReviewPage />;
      if (route === '/dashboard/industry-support') return <IndustrySupportPage />;

      // Role workflow pages
      if (route === '/dashboard/tasks') return <TasksPage />;
      if (route === '/dashboard/teams') return role === 'UNIVERSITY_ADMIN' ? <RegisteredTeamsPage /> : <TeamFormationPage />;
      if (route === '/dashboard/portfolio') return <StudentPortfolioPage />;
      if (route === '/dashboard/mentorship') return <MentorshipPage />;
      if (route === '/dashboard/reviews') return <ProposalReviewQueuePage onNavigate={navigate} />;
      if (route === '/dashboard/matched') return <ProblemWorkspace mode="UNIVERSITY" />;
      if (route === '/dashboard/faculty') return <FacultyPage />;
      if (route === '/dashboard/industry-collaboration' || route === '/university/industry-collaboration') return role === 'UNIVERSITY_ADMIN' ? <UniversityIndustryCollaborationPage onNavigate={navigate} /> : <PartnersPage />;
      if (route === '/dashboard/milestones') return role === 'UNIVERSITY_ADMIN' ? <UniversityMilestonesPage onNavigate={navigate} /> : <ProjectWorkspace onNavigate={navigate} />;
      if (route === '/dashboard/collaborations') return <PartnersPage />;
      if (route === '/dashboard/csr') return <CSRMarketplace />;
      if (route === '/dashboard/audit') return <AuditPage />;
      if (route === '/dashboard/users') return <AdminUsersPage />;
      if (route === '/dashboard/organizations') return <InstitutionsPage />;
      if (route === '/dashboard/analytics') return <GovDashboard onNavigate={navigate} />;
      if (route === '/dashboard/settings') return <SettingsPage />;
      if (route === '/dashboard/copilot') return <CopilotPage />;
      if (route === '/dashboard/search') return <SearchPage />;
      if (route === '/dashboard/moderation') return <ModerationPage />;

      return <CitizenDashboard onNavigate={navigate} />;
    }

    return (
      <DashboardShell currentPage={route} onNavigate={navigate}>
        {renderPage()}
      </DashboardShell>
    );
  }

  // University routes (require auth)
  if (route.startsWith('/university')) {
    if (!session) {
      return <AuthPage mode="signin" onNavigate={navigate} />;
    }

    const role = profile?.role || 'CITIZEN';

    if (role !== 'UNIVERSITY_ADMIN') {
      return <CitizenDashboard onNavigate={navigate} />;
    }

    if (route === '/university' || route === '/university/') return <UniversityCommandCentre onNavigate={navigate} />;
    if (route === '/university/projects') return <UniversityProjectsPage onNavigate={navigate} />;
    if (route.startsWith('/university/projects/')) return <UniversityProjectDetailPage projectId={route.replace('/university/projects/', '')} onNavigate={navigate} />;
    if (route === '/university/industry-collaboration') return <UniversityIndustryCollaborationPage onNavigate={navigate} />;
    if (route === '/university/milestones') return <UniversityMilestonesPage onNavigate={navigate} />;
    if (route === '/university/notifications') return <NotificationsPage onNavigate={navigate} />;

    return <UniversityCommandCentre onNavigate={navigate} />;
  }

  // Landing page (default)
  return <LandingPage onNavigate={navigate} />;
}

export default function App() {
  return (
    <ToastProvider>
      <I18nProvider>
        <AuthProvider>
          <PlatformProvider>
            <AppContent />
          </PlatformProvider>
        </AuthProvider>
      </I18nProvider>
    </ToastProvider>
  );
}
