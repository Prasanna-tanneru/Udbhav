import { describe, expect, it } from 'vitest';
import { filterUniversityCollaborationProjects, supportTypeMatchesProject } from './RoleWorkflowPages';

describe('University industry collaboration filters', () => {
  const projects = [
    {
      id: 'p-1',
      universityId: 'u-1',
      title: 'Water quality sensor pilot',
      supportTypes: ['TESTING', 'MENTORSHIP'],
      industryPartnerName: 'Tata Steel CSR',
    },
    {
      id: 'p-2',
      universityId: 'u-2',
      title: 'Solar micro-grid model',
      supportTypes: ['DEPLOYMENT', 'FUNDING'],
      industryPartnerName: 'RenewGrid Labs',
    },
    {
      id: 'p-3',
      universityId: 'u-1',
      title: 'Agri-sensor field trial',
      supportTypes: ['RESEARCH'],
    },
  ];

  it('keeps only the active university projects', () => {
    expect(filterUniversityCollaborationProjects(projects, 'u-1')).toHaveLength(2);
    expect(filterUniversityCollaborationProjects(projects, 'u-1').map(project => project.id)).toEqual(['p-1', 'p-3']);
  });

  it('filters by the selected support type', () => {
    expect(filterUniversityCollaborationProjects(projects, 'u-1', 'TESTING')).toHaveLength(1);
    expect(filterUniversityCollaborationProjects(projects, 'u-1', 'TESTING')[0].id).toBe('p-1');
    expect(supportTypeMatchesProject(projects[0], 'TESTING')).toBe(true);
    expect(supportTypeMatchesProject(projects[0], 'DEPLOYMENT')).toBe(false);
  });
});
