// @ts-expect-error: No types for 'gedcom' parser
import { parse } from 'gedcom';
import { Node, Edge } from '@stubs/xyflow';
import { PersonData, UnionNodeData, FamilyEdgeData } from '@/types/familyTree';
import { getLayoutedElements } from '../layout';

/**
 * Converts GEDCOM text to nodes and edges for the app's family tree format.
 * @param gedcomText The raw GEDCOM file content as string
 * @returns { nodes, edges } for the app
 */
export function gedcomToFamilyTree(gedcomText: string): { nodes: Node[]; edges: Edge[] } {
  const tree = parse(gedcomText);
  const individuals = tree.children.filter(child => child.tag === 'INDI');
  const families = tree.children.filter(child => child.tag === 'FAM');

  // 1. Parse Individuals
  const nodes: Node[] = individuals.map((individual, index) => {
    const id = individual.pointer || `I${index}`;
    const nameRec = individual.children.find(c => c.tag === 'NAME');
    const name = nameRec ? nameRec.data.replace(/\//g, '') : 'Unknown';
    const sexRec = individual.children.find(c => c.tag === 'SEX');
    const gender = sexRec ? (sexRec.data === 'M' ? 'male' : sexRec.data === 'F' ? 'female' : 'other') : 'other';
    const birthRec = individual.children.find(c => c.tag === 'BIRT');
    const birthDateRec = birthRec?.children.find(c => c.tag === 'DATE');
    const birthPlaceRec = birthRec?.children.find(c => c.tag === 'PLAC');
    const birthDate = birthDateRec?.data;
    const birthPlace = birthPlaceRec?.data;
    const deathRec = individual.children.find(c => c.tag === 'DEAT');
    const deathDateRec = deathRec?.children.find(c => c.tag === 'DATE');
    const deathPlaceRec = deathRec?.children.find(c => c.tag === 'PLAC');
    const deathDate = deathDateRec?.data;
    const deathPlace = deathPlaceRec?.data;
    const status = deathDate ? 'deceased' : 'alive';
    const locations = [];
    if (birthPlace) {
      locations.push({ type: 'birth', place: birthPlace, date: birthDate });
    }
    if (deathPlace) {
      locations.push({ type: 'death', place: deathPlace, date: deathDate });
    }
    return {
      id,
      type: 'person',
      position: { x: 0, y: 0 }, // Will be auto-laid out
      data: {
        id,
        name,
        gender,
        birthDate,
        deathDate,
        status,
        locations,
        marriages: [],
      } as PersonData,
    };
  });

  // Build a map for quick lookup
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  // 2. Parse Families
  const edges: Edge[] = [];
  families.forEach((fam, idx) => {
    const famId = fam.pointer || `F${idx}`;
    const husbandRec = fam.children.find(c => c.tag === 'HUSB');
    const wifeRec = fam.children.find(c => c.tag === 'WIFE');
    const childrenRecs = fam.children.filter(c => c.tag === 'CHIL');
    const parent1 = husbandRec?.data;
    const parent2 = wifeRec?.data;
    const marriageRec = fam.children.find(c => c.tag === 'MARR');
    const marriageDateRec = marriageRec?.children.find(c => c.tag === 'DATE');
    const marriageDate = marriageDateRec?.data;
    const divorceRec = fam.children.find(c => c.tag === 'DIV');
    const divorceDateRec = divorceRec?.children.find(c => c.tag === 'DATE');
    const divorceDate = divorceDateRec?.data;
    const unionNodeId = `union-${famId}`;

    // Create union node
    nodes.push({
      id: unionNodeId,
      type: 'union',
      position: { x: 0, y: 0 },
      data: {
        label: parent1 && parent2 ? `${parent1} & ${parent2}` : 'Union',
        parent1Gender: nodeMap[parent1]?.data.gender || 'other',
        parent2Gender: nodeMap[parent2]?.data.gender || 'other',
        type: 'union',
      } as UnionNodeData,
    });

    // Partner edge (marriage)
    if (parent1 && parent2) {
      edges.push({
        id: `marriage-${parent1}-${parent2}`,
        source: parent1,
        target: parent2,
        type: 'family',
        sourceHandle: 'marriage-right',
        targetHandle: 'marriage-left',
        data: {
          type: 'marriage',
          label: 'Married',
          date: marriageDate,
        } as FamilyEdgeData,
      });
      // Divorce edge if present
      if (divorceDate) {
        edges.push({
          id: `divorce-${parent1}-${parent2}`,
          source: parent1,
          target: parent2,
          type: 'family',
          sourceHandle: 'marriage-right',
          targetHandle: 'marriage-left',
          data: {
            type: 'divorce',
            label: 'Divorced',
            date: divorceDate,
          } as FamilyEdgeData,
        });
      }
    }
    // Parent-to-union edges
    if (parent1) {
      edges.push({
        id: `${parent1}-to-${unionNodeId}`,
        source: parent1,
        target: unionNodeId,
        type: 'family',
        sourceHandle: 'child',
        targetHandle: 'parent',
        data: { type: 'parent-to-union', label: parent2 ? 'Parent' : 'Step-Parent' } as FamilyEdgeData,
      });
    }
    if (parent2) {
      edges.push({
        id: `${parent2}-to-${unionNodeId}`,
        source: parent2,
        target: unionNodeId,
        type: 'family',
        sourceHandle: 'child',
        targetHandle: 'parent',
        data: { type: 'parent-to-union', label: parent1 ? 'Parent' : 'Step-Parent' } as FamilyEdgeData,
      });
    }
    // Union-to-child edges
    childrenRecs.forEach(childRec => {
      const childId = childRec.data;
      edges.push({
        id: `${unionNodeId}-to-${childId}`,
        source: unionNodeId,
        target: childId,
        type: 'family',
        sourceHandle: 'child',
        targetHandle: 'parent',
        data: { type: 'union-to-child', label: (parent1 && parent2) ? 'Child' : 'Step-Child' } as FamilyEdgeData,
      });
    });
  });

  // 4. Auto-layout
  const { nodes: layoutedNodes } = getLayoutedElements(nodes, edges);

  return { nodes: layoutedNodes, edges };
} 