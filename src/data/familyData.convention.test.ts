// @jest-environment node
import { expect, describe, it } from '@jest/globals';
import { initialEdges } from './familyData';

describe('FamilyData edge conventions', () => {
  it('all partner edges use lateral handles', () => {
    const partnerTypes = ['marriage', 'divorce', 'separated', 'dating', 'ex-partner', 'common-law', 'engaged'];
    const partnerEdges = initialEdges.filter(e => partnerTypes.includes(String(e.data?.type)));
    for (const edge of partnerEdges) {
      expect(edge.sourceHandle).toBe('marriage-right');
      expect(edge.targetHandle).toBe('marriage-left');
    }
  });

  it('all union parent-child edges use top/bottom handles', () => {
    // Union parent-child edges: source or target is a union node, type is parent-child
    const parentChildEdges = initialEdges.filter(e => String(e.data?.type) === 'parent-child');
    for (const edge of parentChildEdges) {
      expect(edge.sourceHandle).toBe('child');
      expect(edge.targetHandle).toBe('parent');
    }
  });
}); 