/**
 * AI Module for Astrocartography
 * Exports all AI-related components and utilities
 */

export { AstroChat } from './AstroChat';
export { getLineInterpretation, getLineOneLiner, getLineThemes, LINE_INTERPRETATIONS } from './line-interpretations';
export { useAstroAI, positionsToContext, analysisToContext } from './useAstroAI';
export { useCopilotContext } from './useCopilotContext';
export type {
  ZoneAnalysis,
  AstroAIContext,
  AstroAIActions,
  AstroLineInfo,
  LocationInfo,
  BirthDataContext,
  ChatMessage,
  LineInterpretation,
  LocationComparison,
  TravelSuggestion,
  TimingRecommendation,
} from './types';
