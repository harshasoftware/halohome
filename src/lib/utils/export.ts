import { Node, Edge } from '@stubs/xyflow';
import type { PersonData, UnionNodeData } from '../../types/familyTree';

// Usage example for analytics event capture:
// import { analytics, AnalyticsEvent } from './eventConstants';
// analytics.capture(AnalyticsEvent.PERSON_ADDED, { personId: '123', name: 'John Doe' });

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

export function nodesEdgesToGedcom(nodes: Node[], edges: Edge[]): string {
  // Minimal GEDCOM exporter for family tree
  let gedcom = '0 HEAD\n1 SOUR AstroCart\n1 GEDC\n2 VERS 5.5.1\n1 CHAR UTF-8\n';
  // Map node ids to indices for GEDCOM
  const indiNodes = nodes.filter(n => n.type === 'person');
  const famNodes = nodes.filter(n => n.type === 'union');
  const indiMap = Object.fromEntries(indiNodes.map((n, i) => [n.id, `@I${i+1}@`]));
  const famMap = Object.fromEntries(famNodes.map((n, i) => [n.id, `@F${i+1}@`]));

  // Individuals
  indiNodes.forEach((n, i) => {
    const d = n.data as PersonData | UnionNodeData;
    gedcom += `0 ${indiMap[n.id]} INDI\n`;
    gedcom += `1 NAME ${d.name || ''}\n`;
    if (d.gender) gedcom += `1 SEX ${d.gender[0].toUpperCase()}\n`;
    if (d.birthDate) {
      gedcom += `1 BIRT\n2 DATE ${d.birthDate}\n`;
    }
    if (d.deathDate) {
      gedcom += `1 DEAT\n2 DATE ${d.deathDate}\n`;
    }
  });

  // Families
  famNodes.forEach((n, i) => {
    gedcom += `0 ${famMap[n.id]} FAM\n`;
    // Find parents and children via edges
    const parentEdges = edges.filter(e => e.target === n.id && e.type === 'family');
    const childEdges = edges.filter(e => e.source === n.id && e.type === 'family');
    const parents = parentEdges.map(e => indiMap[e.source]).filter(Boolean);
    const children = childEdges.map(e => indiMap[e.target]).filter(Boolean);
    if (parents[0]) gedcom += `1 HUSB ${parents[0]}\n`;
    if (parents[1]) gedcom += `1 WIFE ${parents[1]}\n`;
    children.forEach(c => gedcom += `1 CHIL ${c}\n`);

    // Relationship events (marriage, divorce, separation, etc.)
    const relEdges = parentEdges.filter(e => e.data && e.data.type);
    relEdges.forEach(e => {
      const type = e.data.type;
      const date = e.data.date || e.data.marriageDate;
      if (type === 'marriage' && date) {
        gedcom += `1 MARR\n2 DATE ${date}\n`;
      } else if (type === 'divorce' && date) {
        gedcom += `1 DIV\n2 DATE ${date}\n`;
      } else if (type === 'separated' && date) {
        gedcom += `1 SEP\n2 DATE ${date}\n`;
      } else if (type === 'common-law' && date) {
        gedcom += `1 EVEN\n2 TYPE Common-Law\n2 DATE ${date}\n`;
      } else if (type === 'engaged' && date) {
        gedcom += `1 EVEN\n2 TYPE Engaged\n2 DATE ${date}\n`;
      } else if (type === 'ex-partner' && date) {
        gedcom += `1 EVEN\n2 TYPE Ex-Partner\n2 DATE ${date}\n`;
      } else if (type === 'dating' && date) {
        gedcom += `1 EVEN\n2 TYPE Dating\n2 DATE ${date}\n`;
      }
      // Add more relationship types as needed
      if (e.data.endDate) {
        gedcom += `2 NOTE Ended: ${e.data.endDate}\n`;
      }
    });

    // Adoption and step-parent relationships (as notes)
    childEdges.forEach(e => {
      if (e.data && e.data.adoption) {
        gedcom += `1 CHIL ${indiMap[e.target]}\n2 ADOP BOTH\n2 NOTE Adopted\n`;
      }
      if (e.data && typeof e.data.label === 'string' && e.data.label.toLowerCase().includes('step-parent')) {
        gedcom += `1 CHIL ${indiMap[e.target]}\n2 NOTE Step-Parent Relationship\n`;
      }
    });
  });

  gedcom += '0 TRLR\n';
  return gedcom;
} 