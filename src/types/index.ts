// ============================================================
// ThinkFlow Type Definitions
// ============================================================

export type AIProvider = 'openai' | 'anthropic' | 'google';

export interface APIConfig {
  provider: AIProvider | null;
  apiKey: string | null;
  isValid: boolean;
}

export interface ActionItem {
  id: number;
  text: string;
  priority: 'Hoch' | 'Mittel' | 'Normal';
  completed: boolean;
}

export interface StructuredThought {
  id: number;
  title: string;
  category: string;
  summary: string;
  keyPoints: string[];
  tasks: ActionItem[];
  createdAt: string;
  relatedIdeas: Idea[];
}

export interface Idea {
  id: number;
  category: string;
  title: string;
  description: string;
  icon: string;
}

export interface CategoryStyle {
  color: string;
  lightColor: string;
  textColor: string;
}

export type TabType = 'record' | 'thoughts' | 'ideas' | 'settings';

// Storage Keys
export const STORAGE_KEYS = {
  API_CONFIG: 'thinkflow_api_config',
  SAVED_THOUGHTS: 'thinkflow_saved_thoughts',
  CUSTOM_IDEAS: 'thinkflow_custom_ideas',
} as const;

// Category Styles
export const CATEGORIES: Record<string, CategoryStyle> = {
  "Gesundheit": { color: "bg-red-500", lightColor: "bg-red-50", textColor: "text-red-600" },
  "Kreativität": { color: "bg-purple-500", lightColor: "bg-purple-50", textColor: "text-purple-600" },
  "Lifestyle": { color: "bg-orange-500", lightColor: "bg-orange-50", textColor: "text-orange-600" },
  "Nachhaltigkeit": { color: "bg-green-500", lightColor: "bg-green-50", textColor: "text-green-600" },
  "Soziales": { color: "bg-pink-500", lightColor: "bg-pink-50", textColor: "text-pink-600" },
  "Innovation": { color: "bg-indigo-500", lightColor: "bg-indigo-50", textColor: "text-indigo-600" },
  "Sicherheit": { color: "bg-amber-500", lightColor: "bg-amber-50", textColor: "text-amber-600" },
  "Technik": { color: "bg-blue-500", lightColor: "bg-blue-50", textColor: "text-blue-600" },
  "Arbeit": { color: "bg-teal-500", lightColor: "bg-teal-50", textColor: "text-teal-600" },
  "Reisen": { color: "bg-cyan-500", lightColor: "bg-cyan-50", textColor: "text-cyan-600" },
  "Forschung": { color: "bg-slate-500", lightColor: "bg-slate-50", textColor: "text-slate-600" },
  "Familie": { color: "bg-rose-500", lightColor: "bg-rose-50", textColor: "text-rose-600" },
  "Lokal": { color: "bg-lime-500", lightColor: "bg-lime-50", textColor: "text-lime-600" },
  "Produktivität": { color: "bg-violet-500", lightColor: "bg-violet-50", textColor: "text-violet-600" },
  "Selbstreflexion": { color: "bg-fuchsia-500", lightColor: "bg-fuchsia-50", textColor: "text-fuchsia-600" },
  "Kommunikation": { color: "bg-sky-500", lightColor: "bg-sky-50", textColor: "text-sky-600" },
  "Allgemein": { color: "bg-gray-500", lightColor: "bg-gray-50", textColor: "text-gray-600" },
  "Business": { color: "bg-emerald-500", lightColor: "bg-emerald-50", textColor: "text-emerald-600" }
};
