export * from "./generated/api";
// Explicit type re-exports for non-conflicting types from generated/types
// (The conflicting names like CreateOpenaiConversationBody, SendOpenaiMessageBody,
// SendOpenaiVoiceMessageBody, UpdateProgressBody are already exported
// as zod schemas from generated/api, which provide both values and inferred types.)
export type {
  ActivityItem,
  AnalyzeBody,
  AnalyzeResult,
  CompanionAnswerScore,
  CompanionAnswerScoreInput,
  CompanionInterviewProfile,
  CompanionMessage,
  CompanionMessageRole,
  CompanionRespondInput,
  CompanionRespondInputLanguage,
  CompanionRespondInputMode,
  GrammarCheckBody,
  GrammarCheckResult,
  HealthStatus,
  HistoryPoint,
  OpenaiConversation,
  OpenaiConversationWithMessages,
  OpenaiError,
  OpenaiMessage,
  SpeakingSessionBody,
  SpeakingSessionResult,
  UserProgress,
  VocabularyLookupBody,
  VocabularyLookupResult,
  VocabularyLookupResultDefinitionsItem,
} from "./generated/types";