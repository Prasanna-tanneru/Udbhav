import {useEffect,useMemo,useState,type ReactNode} from 'react';
import {Landmark,Search,Bell,Settings,Home,MapPin,FileText,Users,Building2,Rocket,BarChart3,ShieldCheck,Layers,Copy,Target,Award,Briefcase,GraduationCap,HeartHandshake,AlertTriangle,Zap,Plus,ChevronRight,CheckSquare,BrainCircuit,Leaf,Handshake,LayoutDashboard,Compass,UsersRound,FolderKanban,ListChecks,UserRound,type LucideIcon} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {useI18n} from '@/context/I18nContext';
import type {UserRole} from '@/types';
import TopBar from '@/components/layout/TopBar';

interface DashboardShellProps{children:ReactNode;currentPage:string;onNavigate:(route:string)=>void}
interface NavItem{label:string;route:string;icon:LucideIcon;badge?:string}

function getNavItems(role:UserRole):NavItem[]{
 const common:NavItem[]=[{label:'Overview',route:'/dashboard',icon:Home},{label:'Innovation Map',route:'/dashboard/map',icon:MapPin},{label:'Challenges',route:'/dashboard/challenges',icon:FileText},{label:'Marketplace',route:'/dashboard/marketplace',icon:Target},{label:'Projects',route:'/dashboard/projects',icon:Rocket},{label:'Solutions',route:'/dashboard/solutions',icon:Copy}];
 switch(role){
  case'CITIZEN':return[
    {label:'Overview',route:'/dashboard',icon:Home},
   {label:'Report Problem',route:'/dashboard/submit',icon:Plus},
   {label:'My Problems',route:'/dashboard/my-challenges',icon:FileText},
    {label:'Community Problems',route:'/dashboard/community',icon:Users},
   {label:'AI Analysis',route:'/dashboard/copilot',icon:BrainCircuit},
    {label:'Notifications',route:'/dashboard/notifications',icon:Bell},
   {label:'Profile',route:'/dashboard/profile',icon:Settings},
  ];
  case'VOLUNTEER':return[{label:'Volunteer Dashboard',route:'/dashboard',icon:HeartHandshake},{label:'Collect Problem',route:'/dashboard/volunteer',icon:Plus,badge:'Field'},{label:'Community Priority',route:'/dashboard/community',icon:Users},{label:'Challenges',route:'/dashboard/challenges',icon:FileText},{label:'Nearby',route:'/dashboard/nearby',icon:MapPin},{label:'Profile',route:'/dashboard/profile',icon:Settings}];
  case'STUDENT':return[...common,{label:'My Tasks',route:'/dashboard/tasks',icon:CheckSquare},{label:'My Teams',route:'/dashboard/teams',icon:Users},{label:'Portfolio',route:'/dashboard/portfolio',icon:Award}];
  case'FACULTY':return[...common,{label:'Mentorship',route:'/dashboard/mentorship',icon:GraduationCap},{label:'Reviews',route:'/dashboard/reviews',icon:ShieldCheck}];
  case'UNIVERSITY_ADMIN':return[
   {label:'Overview',route:'/dashboard',icon:LayoutDashboard},
   {label:'Discover Challenges',route:'/dashboard/challenges',icon:Compass},
   {label:'My Teams',route:'/dashboard/teams',icon:UsersRound},
   {label:'Projects',route:'/dashboard/projects',icon:FolderKanban},
   {label:'Faculty Mentors',route:'/dashboard/faculty',icon:GraduationCap},
   {label:'Industry Collaboration',route:'/dashboard/industry-collaboration',icon:Handshake},
   {label:'Milestones',route:'/dashboard/milestones',icon:ListChecks},
   {label:'Notifications',route:'/dashboard/notifications',icon:Bell},
   {label:'Profile',route:'/dashboard/profile',icon:UserRound},
  ];
  case'INDUSTRY_PARTNER':case'STARTUP':case'MSME':case'CSR_PARTNER':case'RESEARCH_LAB':return[...common,{label:'Mentorship',route:'/dashboard/industry-mentorship',icon:GraduationCap},{label:'Prototype Reviews',route:'/dashboard/prototype-reviews',icon:ShieldCheck},{label:'Industry Support',route:'/dashboard/industry-support',icon:Briefcase},{label:'Collaborations',route:'/dashboard/collaborations',icon:HeartHandshake},{label:'CSR Marketplace',route:'/dashboard/csr',icon:Target}];
  case'PANCHAYAT_OFFICER':case'ULB_OFFICER':case'DISTRICT_OFFICER':case'GOVERNMENT_OFFICER':case'DEPARTMENT_ADMIN':case'PROJECT_OFFICER':case'FINANCE_OFFICER':case'ANALYTICS_OFFICER':return[{label:'Command Centre',route:'/dashboard',icon:BarChart3},{label:'Validation Queue',route:'/dashboard/validation',icon:ShieldCheck},{label:'Challenges',route:'/dashboard/challenges',icon:FileText},{label:'Citizens',route:'/dashboard/gov-citizens',icon:Users},{label:'Ecosystem',route:'/dashboard/gov-ecosystem',icon:Building2},{label:'Mentor Monitoring',route:'/dashboard/gov-mentorship',icon:GraduationCap},{label:'Problem Map',route:'/dashboard/map',icon:MapPin},{label:'Clusters',route:'/dashboard/clusters',icon:Layers},{label:'Projects',route:'/dashboard/projects',icon:Rocket},{label:'Deployments',route:'/dashboard/deployments',icon:Rocket},{label:'Alerts',route:'/dashboard/alerts',icon:AlertTriangle},{label:'Announcements',route:'/dashboard/announcements',icon:Bell},{label:'Analytics',route:'/dashboard/analytics',icon:BarChart3}];
  case'PLATFORM_ADMIN':case'SUPER_ADMIN':return[{label:'Admin Panel',route:'/dashboard',icon:ShieldCheck},{label:'Users',route:'/dashboard/users',icon:Users},{label:'Organizations',route:'/dashboard/organizations',icon:Building2},{label:'Challenges',route:'/dashboard/challenges',icon:FileText},{label:'Projects',route:'/dashboard/projects',icon:Rocket},{label:'Analytics',route:'/dashboard/analytics',icon:BarChart3},{label:'AI Jobs',route:'/dashboard/ai-jobs',icon:Zap},{label:'System Health',route:'/dashboard/system-health',icon:BarChart3},{label:'Configuration',route:'/dashboard/configuration',icon:Settings},{label:'Audit Logs',route:'/dashboard/audit',icon:AlertTriangle},{label:'Settings',route:'/dashboard/settings',icon:Settings}];
  default:return common;
 }
}

const labelKeys:Record<string,string>={Overview:'overview',Home:'overview','Innovation Map':'map','Problem Map':'map',Challenges:'challenges',Marketplace:'marketplace',Projects:'projects',Solutions:'solutions','Report Problem':'reportNew','Report New':'reportNew',Impact:'impact',Notifications:'notifications',Teams:'teams',Faculty:'faculty',Collaborations:'collaborations','CSR Marketplace':'csr','Validation Queue':'validation',Clusters:'clusters',Analytics:'analytics',Users:'users',Organizations:'organizations','Admin Panel':'admin','System Health':'health','AI Jobs':'jobs',Configuration:'configuration',Settings:'settings'};

export default function DashboardShell({children,currentPage,onNavigate}:DashboardShellProps){
 const{profile}=useAuth();
 const{t}=useI18n();
 const[sidebarOpen,setSidebarOpen]=useState(false),[paletteOpen,setPaletteOpen]=useState(false),[paletteQuery,setPaletteQuery]=useState('');
 const navItems=getNavItems(profile?.role||'CITIZEN');
 const navLabel=(label:string)=>t(labelKeys[label]||'',label);
 const paletteItems=useMemo(()=>navItems.filter(x=>!paletteQuery||`${x.label} ${x.route}`.toLowerCase().includes(paletteQuery.toLowerCase())),[navItems,paletteQuery]);
 useEffect(()=>{const fn=(e:KeyboardEvent)=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setPaletteOpen(v=>!v)}if(e.key==='Escape')setPaletteOpen(false)};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn)},[]);
 function handleNav(route:string){onNavigate(route);setSidebarOpen(false)}
 return <div className="civic-shell min-h-screen flex">
  <aside className={`civic-sidebar fixed lg:sticky top-0 left-0 z-40 flex flex-col transition-transform duration-300 ${sidebarOpen?'translate-x-0':'-translate-x-full lg:translate-x-0'}`}>
   <div className="civic-sidebar-header">
    <button onClick={()=>onNavigate('/')} className="civic-brand-button">
     <div className="civic-brand-mark"><Landmark className="text-white" size={19} /></div>
     <div className="civic-brand-copy">
       <span className="civic-brand-name">JANSAMADHAN</span>
       <span className="civic-brand-subtitle">{profile?.role === 'UNIVERSITY_ADMIN' ? 'University Portal' : 'Government of Jharkhand'}</span>
     </div>
     <ChevronRight size={15} className="civic-brand-chevron" />
    </button>
   </div>
   <nav className="civic-sidebar-nav">
    {navItems.map(item=>{const Icon=item.icon,isActive=currentPage===item.route;return <a key={item.route} href={`#${item.route}`} onClick={()=>handleNav(item.route)} aria-current={isActive?'page':undefined} className={`civic-nav-item ${isActive?'is-active':''}`}><Icon size={17}/><span>{navLabel(item.label)}</span>{item.badge&&<span className="civic-nav-badge">{item.badge}</span>}</a>})}
   </nav>
   <div className="civic-sidebar-footer" aria-label="Community message">
    <div className="civic-footer-shapes" aria-hidden="true">
      <span className="civic-shape shape-one" />
      <span className="civic-shape shape-two" />
      <span className="civic-shape shape-three" />
    </div>
    <div className="civic-footer-copy">
      <div className="civic-footer-brand"><Leaf size={14} /> JanSamadhan</div>
      <div className="civic-footer-title">INNOVATION FOR<br />COMMUNITY IMPACT</div>
      <div className="civic-footer-text">Discover · Build · Deploy</div>
    </div>
   </div>
  </aside>
  {sidebarOpen&&<div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={()=>setSidebarOpen(false)}/>} 
  <div className="civic-main-shell flex-1 flex flex-col min-w-0">
  <TopBar pageTitle={navItems.find(item=>item.route===currentPage)?.label || 'JanSamadhan'} onNavigate={handleNav} onSearch={()=>setPaletteOpen(true)} sidebarOpen={sidebarOpen} onToggleSidebar={()=>setSidebarOpen(value=>!value)} />
   <main className="civic-main flex-1 overflow-y-auto">{children}</main>
  </div>
  {paletteOpen&&<div className="fixed inset-0 z-[80] bg-primary-950/35 p-4 flex items-start justify-center pt-[12vh]" onMouseDown={()=>setPaletteOpen(false)}><div className="w-full max-w-xl rounded-2xl bg-[#fffaf0] shadow-2xl border border-neutral-200 overflow-hidden" onMouseDown={e=>e.stopPropagation()}><div className="p-3 border-b border-neutral-200 flex items-center gap-2"><Search size={18} className="text-neutral-400"/><input autoFocus value={paletteQuery} onChange={e=>setPaletteQuery(e.target.value)} className="w-full outline-none text-sm bg-transparent" placeholder="Search commands and pages…"/><kbd className="text-xs text-neutral-400">Esc</kbd></div><div className="max-h-96 overflow-auto p-2">{paletteItems.map(item=>{const Icon=item.icon;return <button key={item.route} onClick={()=>{handleNav(item.route);setPaletteOpen(false);setPaletteQuery('')}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary-50 text-sm"><Icon size={16} className="text-primary-600"/><span>{navLabel(item.label)}</span><span className="ml-auto text-xs text-neutral-400">{item.route}</span></button>})}<button onClick={()=>{handleNav('/dashboard/search');setPaletteOpen(false)}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary-50 text-sm"><Search size={16}/><span>Advanced global search</span></button></div></div></div>}
 </div>
}
