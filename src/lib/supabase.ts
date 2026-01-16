import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for database tables
export interface DbFamily {
  id: string;
  family_code: string;
  created_at: string;
}

export interface DbIdea {
  id: number;
  family_id: string;
  title: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  is_user_created: boolean;
  thought_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface DbThought {
  id: number;
  family_id: string;
  title: string;
  category: string | null;
  summary: string | null;
  key_points: string[];
  tasks: {
    id: number;
    text: string;
    priority: 'Hoch' | 'Mittel' | 'Normal';
    completed: boolean;
  }[];
  status: 'standalone' | 'linked' | 'converted';
  linked_idea_id: number | null;
  created_by: 'Elvis' | 'Mario' | null;
  created_at: string;
}

// Helper to get or create family by code
export async function getOrCreateFamily(familyCode: string): Promise<DbFamily | null> {
  // First try to find existing family
  const { data: existing, error: findError } = await supabase
    .from('families')
    .select('*')
    .eq('family_code', familyCode)
    .single();

  if (existing) {
    return existing;
  }

  // Create new family if not found
  if (findError?.code === 'PGRST116') {
    const { data: newFamily, error: createError } = await supabase
      .from('families')
      .insert({ family_code: familyCode })
      .select()
      .single();

    if (createError) {
      console.error('Error creating family:', createError);
      return null;
    }

    return newFamily;
  }

  console.error('Error finding family:', findError);
  return null;
}

// Validate family code exists
export async function validateFamilyCode(familyCode: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('families')
    .select('id')
    .eq('family_code', familyCode)
    .single();

  return !error && !!data;
}
