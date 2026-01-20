/**
 * AI Module for Vastu (chat + helpers)
 * Exports AI-related components and utilities
 */

export { VastuChat } from './AstroChat';
export { getLineInterpretation, getLineOneLiner, getLineThemes, LINE_INTERPRETATIONS } from './line-interpretations';
export { useAstroAI, positionsToContext, analysisToContext } from './useAstroAI';
// CopilotKit context is legacy astrocartography wiring; keep available for now.
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
