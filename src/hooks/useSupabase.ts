'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, DbIdea, DbThought } from '../lib/supabase';
import type { DynamicIdea, StructuredThought, UserName } from '../types';

// Storage key for family credentials
const FAMILY_STORAGE_KEY = 'thinkflow_family';

interface FamilyCredentials {
  familyId: string;
  familyCode: string;
}

// Hook for family authentication
export function useFamilyAuth() {
  const [credentials, setCredentials] = useState<FamilyCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load credentials from localStorage on mount
    const stored = localStorage.getItem(FAMILY_STORAGE_KEY);
    if (stored) {
      try {
        setCredentials(JSON.parse(stored));
      } catch (e) {
        console.error('Error parsing family credentials:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((familyId: string, familyCode: string) => {
    const creds = { familyId, familyCode };
    localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(creds));
    setCredentials(creds);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(FAMILY_STORAGE_KEY);
    setCredentials(null);
  }, []);

  return {
    credentials,
    isAuthenticated: !!credentials,
    isLoading,
    login,
    logout,
  };
}

// Convert DB idea to app format
function dbIdeaToApp(dbIdea: DbIdea): DynamicIdea {
  return {
    id: dbIdea.id,
    title: dbIdea.title,
    description: dbIdea.description || '',
    category: dbIdea.category || 'Allgemein',
    icon: dbIdea.icon || '💡',
    isUserCreated: dbIdea.is_user_created,
    thoughtIds: dbIdea.thought_ids || [],
    createdAt: dbIdea.created_at,
    updatedAt: dbIdea.updated_at,
  };
}

// Convert app idea to DB format
function appIdeaToDb(idea: DynamicIdea, familyId: string): Omit<DbIdea, 'created_at' | 'updated_at'> & { created_at?: string; updated_at?: string } {
  return {
    id: idea.id,
    family_id: familyId,
    title: idea.title,
    description: idea.description,
    category: idea.category,
    icon: idea.icon,
    is_user_created: idea.isUserCreated,
    thought_ids: idea.thoughtIds,
    created_at: idea.createdAt,
    updated_at: idea.updatedAt,
  };
}

// Convert DB thought to app format
function dbThoughtToApp(dbThought: DbThought): StructuredThought {
  return {
    id: dbThought.id,
    title: dbThought.title,
    category: dbThought.category || 'Allgemein',
    summary: dbThought.summary || '',
    keyPoints: dbThought.key_points || [],
    tasks: dbThought.tasks || [],
    createdAt: dbThought.created_at,
    relatedIdeas: [],
    linkedIdeaId: dbThought.linked_idea_id || undefined,
    status: (dbThought.status as 'standalone' | 'linked' | 'converted') || 'standalone',
    createdBy: dbThought.created_by as UserName | undefined,
  };
}

// Convert app thought to DB format
function appThoughtToDb(thought: StructuredThought, familyId: string): Omit<DbThought, 'created_at'> & { created_at?: string } {
  return {
    id: thought.id,
    family_id: familyId,
    title: thought.title,
    category: thought.category,
    summary: thought.summary,
    key_points: thought.keyPoints,
    tasks: thought.tasks,
    status: thought.status,
    linked_idea_id: thought.linkedIdeaId || null,
    created_by: thought.createdBy || null,
    created_at: thought.createdAt,
  };
}

// Hook for cloud-synced ideas
export function useCloudIdeas(familyId: string | null) {
  const [ideas, setIdeas] = useState<DynamicIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load ideas and set up real-time subscription
  useEffect(() => {
    if (!familyId) {
      setIdeas([]);
      setIsLoading(false);
      return;
    }

    const loadIdeas = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('ideas')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading ideas:', error);
      } else {
        setIdeas((data || []).map(dbIdeaToApp));
      }
      setIsLoading(false);
    };

    loadIdeas();

    // Set up real-time subscription
    subscriptionRef.current = supabase
      .channel(`ideas-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ideas',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newIdea = dbIdeaToApp(payload.new as DbIdea);
            setIdeas(prev => [newIdea, ...prev.filter(i => i.id !== newIdea.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedIdea = dbIdeaToApp(payload.new as DbIdea);
            setIdeas(prev => prev.map(i => i.id === updatedIdea.id ? updatedIdea : i));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: number }).id;
            setIdeas(prev => prev.filter(i => i.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [familyId]);

  const addIdea = useCallback(async (idea: Omit<DynamicIdea, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!familyId) return null;

    const now = new Date().toISOString();
    const newIdea: DynamicIdea = {
      ...idea,
      id: Date.now(),
      createdAt: now,
      updatedAt: now,
    };

    // Optimistic update
    setIdeas(prev => [newIdea, ...prev]);

    const { error } = await supabase
      .from('ideas')
      .insert(appIdeaToDb(newIdea, familyId));

    if (error) {
      console.error('Error adding idea:', error);
      // Rollback on error
      setIdeas(prev => prev.filter(i => i.id !== newIdea.id));
      return null;
    }

    return newIdea;
  }, [familyId]);

  const updateIdea = useCallback(async (id: number, updates: Partial<DynamicIdea>) => {
    if (!familyId) return;

    const now = new Date().toISOString();

    // Optimistic update
    setIdeas(prev => prev.map(idea =>
      idea.id === id ? { ...idea, ...updates, updatedAt: now } : idea
    ));

    const { error } = await supabase
      .from('ideas')
      .update({
        ...updates,
        updated_at: now,
        // Map camelCase to snake_case
        ...(updates.isUserCreated !== undefined && { is_user_created: updates.isUserCreated }),
        ...(updates.thoughtIds !== undefined && { thought_ids: updates.thoughtIds }),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating idea:', error);
    }
  }, [familyId]);

  const deleteIdea = useCallback(async (id: number) => {
    if (!familyId) return;

    // Store for potential rollback
    const deletedIdea = ideas.find(i => i.id === id);

    // Optimistic update
    setIdeas(prev => prev.filter(idea => idea.id !== id));

    const { error } = await supabase
      .from('ideas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting idea:', error);
      // Rollback on error
      if (deletedIdea) {
        setIdeas(prev => [...prev, deletedIdea]);
      }
    }
  }, [familyId, ideas]);

  const linkThoughtToIdea = useCallback(async (ideaId: number, thoughtId: number) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;

    await updateIdea(ideaId, {
      thoughtIds: [...idea.thoughtIds, thoughtId],
    });
  }, [ideas, updateIdea]);

  const unlinkThoughtFromIdea = useCallback(async (ideaId: number, thoughtId: number) => {
    const idea = ideas.find(i => i.id === ideaId);
    if (!idea) return;

    await updateIdea(ideaId, {
      thoughtIds: idea.thoughtIds.filter(id => id !== thoughtId),
    });
  }, [ideas, updateIdea]);

  const getIdeaById = useCallback((id: number) => {
    return ideas.find(idea => idea.id === id);
  }, [ideas]);

  return {
    ideas,
    setIdeas,
    isLoading,
    addIdea,
    updateIdea,
    deleteIdea,
    linkThoughtToIdea,
    unlinkThoughtFromIdea,
    getIdeaById,
  };
}

// Hook for cloud-synced thoughts
export function useCloudThoughts(familyId: string | null) {
  const [thoughts, setThoughts] = useState<StructuredThought[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load thoughts and set up real-time subscription
  useEffect(() => {
    if (!familyId) {
      setThoughts([]);
      setIsLoading(false);
      return;
    }

    const loadThoughts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('thoughts')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading thoughts:', error);
      } else {
        setThoughts((data || []).map(dbThoughtToApp));
      }
      setIsLoading(false);
    };

    loadThoughts();

    // Set up real-time subscription
    subscriptionRef.current = supabase
      .channel(`thoughts-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'thoughts',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newThought = dbThoughtToApp(payload.new as DbThought);
            setThoughts(prev => [newThought, ...prev.filter(t => t.id !== newThought.id)]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedThought = dbThoughtToApp(payload.new as DbThought);
            setThoughts(prev => prev.map(t => t.id === updatedThought.id ? updatedThought : t));
          } else if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id: number }).id;
            setThoughts(prev => prev.filter(t => t.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [familyId]);

  const addThought = useCallback(async (thought: StructuredThought) => {
    if (!familyId) return;

    // Optimistic update
    setThoughts(prev => [thought, ...prev]);

    const { error } = await supabase
      .from('thoughts')
      .insert(appThoughtToDb(thought, familyId));

    if (error) {
      console.error('Error adding thought:', error);
      // Rollback on error
      setThoughts(prev => prev.filter(t => t.id !== thought.id));
    }
  }, [familyId]);

  const updateThought = useCallback(async (id: number, updates: Partial<StructuredThought>) => {
    if (!familyId) return;

    // Optimistic update
    setThoughts(prev => prev.map(thought =>
      thought.id === id ? { ...thought, ...updates } : thought
    ));

    const { error } = await supabase
      .from('thoughts')
      .update({
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.summary !== undefined && { summary: updates.summary }),
        ...(updates.keyPoints !== undefined && { key_points: updates.keyPoints }),
        ...(updates.tasks !== undefined && { tasks: updates.tasks }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.linkedIdeaId !== undefined && { linked_idea_id: updates.linkedIdeaId }),
        ...(updates.createdBy !== undefined && { created_by: updates.createdBy }),
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating thought:', error);
    }
  }, [familyId]);

  const deleteThought = useCallback(async (id: number) => {
    if (!familyId) return;

    // Store for potential rollback
    const deletedThought = thoughts.find(t => t.id === id);

    // Optimistic update
    setThoughts(prev => prev.filter(thought => thought.id !== id));

    const { error } = await supabase
      .from('thoughts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting thought:', error);
      // Rollback on error
      if (deletedThought) {
        setThoughts(prev => [...prev, deletedThought]);
      }
    }
  }, [familyId, thoughts]);

  return {
    thoughts,
    setThoughts,
    isLoading,
    addThought,
    updateThought,
    deleteThought,
  };
}

// Migration function to transfer localStorage data to cloud
export async function migrateLocalStorageToCloud(familyId: string) {
  const localIdeas = JSON.parse(localStorage.getItem('thinkflow_user_ideas') || '[]');
  const localThoughts = JSON.parse(localStorage.getItem('thinkflow_saved_thoughts') || '[]');

  // Migrate ideas
  if (localIdeas.length > 0) {
    const ideasToInsert = localIdeas.map((idea: DynamicIdea) => ({
      id: idea.id,
      family_id: familyId,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      icon: idea.icon,
      is_user_created: idea.isUserCreated,
      thought_ids: idea.thoughtIds || [],
      created_at: idea.createdAt,
      updated_at: idea.updatedAt,
    }));

    const { error: ideasError } = await supabase
      .from('ideas')
      .upsert(ideasToInsert, { onConflict: 'id' });

    if (ideasError) {
      console.error('Error migrating ideas:', ideasError);
    }
  }

  // Migrate thoughts
  if (localThoughts.length > 0) {
    const thoughtsToInsert = localThoughts.map((thought: StructuredThought) => ({
      id: thought.id,
      family_id: familyId,
      title: thought.title,
      category: thought.category,
      summary: thought.summary,
      key_points: thought.keyPoints || [],
      tasks: thought.tasks || [],
      status: thought.status || 'standalone',
      linked_idea_id: thought.linkedIdeaId || null,
      created_by: thought.createdBy || null,
      created_at: thought.createdAt,
    }));

    const { error: thoughtsError } = await supabase
      .from('thoughts')
      .upsert(thoughtsToInsert, { onConflict: 'id' });

    if (thoughtsError) {
      console.error('Error migrating thoughts:', thoughtsError);
    }
  }

  console.log(`Migrated ${localIdeas.length} ideas and ${localThoughts.length} thoughts to cloud`);
}
