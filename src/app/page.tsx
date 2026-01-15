'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useLocalStorage, useApiConfig, useUserIdeas } from '@/hooks/useLocalStorage';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { existingIdeas } from '@/lib/ideas';
import { CATEGORIES, type StructuredThought, type Idea, type DynamicIdea, type TabType } from '@/types';

export default function ThinkFlowApp() {
  const [activeTab, setActiveTab] = useState<TabType>('record');
  const [structuredThought, setStructuredThought] = useState<StructuredThought | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [savedThoughts, setSavedThoughts] = useLocalStorage<StructuredThought[]>('thinkflow_saved_thoughts', []);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [filterCategory, setFilterCategory] = useState('Alle');
  const [searchQuery, setSearchQuery] = useState('');
  const [waveHeights, setWaveHeights] = useState(Array(12).fill(8));
  const [manualTranscript, setManualTranscript] = useState('');
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [selectedThought, setSelectedThought] = useState<StructuredThought | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // New states for Gedanken-Ideen workflow
  const [showIdeaPicker, setShowIdeaPicker] = useState(false);
  const [showCreateIdeaModal, setShowCreateIdeaModal] = useState(false);
  const [selectedDynamicIdea, setSelectedDynamicIdea] = useState<DynamicIdea | null>(null);
  const [newIdeaTitle, setNewIdeaTitle] = useState('');
  const [newIdeaIcon, setNewIdeaIcon] = useState('💡');
  const [ideaSearchQuery, setIdeaSearchQuery] = useState('');
  const [pendingThoughtForIdea, setPendingThoughtForIdea] = useState<StructuredThought | null>(null);

  const { config, hasValidConfig } = useApiConfig();
  const { ideas: userIdeas, addIdea, updateIdea, deleteIdea, linkThoughtToIdea, unlinkThoughtFromIdea, getIdeaById } = useUserIdeas();
  const {
    transcript,
    interimTranscript,
    isListening,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Combine speech transcript with manual input
  const currentTranscript = transcript || manualTranscript;

  // Wave animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isListening) {
      interval = setInterval(() => {
        setWaveHeights(prev => prev.map(() => Math.random() * 24 + 8));
      }, 150);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  const toggleRecording = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setManualTranscript('');
      setStructuredThought(null);
      startListening();
    }
  };

  const processWithAI = async () => {
    if (!currentTranscript.trim()) return;
    setIsProcessing(true);
    setProcessingError(null);

    try {
      const response = await fetch('/api/process-thought', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: currentTranscript,
          provider: config.provider,
          apiKey: config.apiKey,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setProcessingError(data.error);
        return;
      }

      const result = data.result;

      // Create structured thought from AI response
      const newThought: StructuredThought = {
        id: Date.now(),
        title: result.title,
        category: result.category,
        summary: result.summary,
        keyPoints: result.keyPoints,
        tasks: (result.tasks || []).map((t: { text: string; priority: string }, i: number) => ({
          id: i + 1,
          text: t.text,
          priority: t.priority as 'Hoch' | 'Mittel' | 'Normal',
          completed: false,
        })),
        createdAt: new Date().toISOString(),
        relatedIdeas: existingIdeas.filter(i => i.category === result.category).slice(0, 3),
        status: 'standalone',
      };

      setStructuredThought(newThought);
    } catch (error) {
      console.error('AI processing error:', error);
      setProcessingError(
        error instanceof Error ? error.message : 'Unbekannter Fehler bei der Verarbeitung'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const saveThought = () => {
    if (structuredThought) {
      setSavedThoughts(prev => [{ ...structuredThought, status: 'standalone' }, ...prev]);
      setActiveTab('thoughts');
      setStructuredThought(null);
      resetTranscript();
      setManualTranscript('');
    }
  };

  // Save thought and link to an existing idea
  const saveThoughtToIdea = (ideaId: number) => {
    if (structuredThought) {
      const linkedThought: StructuredThought = {
        ...structuredThought,
        linkedIdeaId: ideaId,
        status: 'linked',
      };
      setSavedThoughts(prev => [linkedThought, ...prev]);
      linkThoughtToIdea(ideaId, linkedThought.id);
      setActiveTab('ideas');
      setStructuredThought(null);
      setShowIdeaPicker(false);
      resetTranscript();
      setManualTranscript('');
    }
  };

  // Create a new idea from a thought
  const createIdeaFromThought = () => {
    if (structuredThought && newIdeaTitle.trim()) {
      // Create the new idea
      const newIdea = addIdea({
        title: newIdeaTitle.trim(),
        description: structuredThought.summary,
        category: structuredThought.category,
        icon: newIdeaIcon,
        isUserCreated: true,
        thoughtIds: [structuredThought.id],
      });

      // Save the thought with link
      const linkedThought: StructuredThought = {
        ...structuredThought,
        linkedIdeaId: newIdea.id,
        status: 'converted',
      };
      setSavedThoughts(prev => [linkedThought, ...prev]);

      // Reset states
      setShowCreateIdeaModal(false);
      setNewIdeaTitle('');
      setNewIdeaIcon('💡');
      setStructuredThought(null);
      setActiveTab('ideas');
      resetTranscript();
      setManualTranscript('');
    }
  };

  // Link an existing thought to an idea (from thought detail sheet)
  const linkExistingThoughtToIdea = (thought: StructuredThought, ideaId: number) => {
    // Update the thought
    setSavedThoughts(prev => prev.map(t =>
      t.id === thought.id
        ? { ...t, linkedIdeaId: ideaId, status: 'linked' as const }
        : t
    ));
    linkThoughtToIdea(ideaId, thought.id);
    setSelectedThought(null);
    setShowIdeaPicker(false);
    setPendingThoughtForIdea(null);
  };

  // Unlink thought from idea
  const unlinkThought = (thought: StructuredThought) => {
    if (thought.linkedIdeaId) {
      unlinkThoughtFromIdea(thought.linkedIdeaId, thought.id);
      setSavedThoughts(prev => prev.map(t =>
        t.id === thought.id
          ? { ...t, linkedIdeaId: undefined, status: 'standalone' as const }
          : t
      ));
      setSelectedThought(prev => prev ? { ...prev, linkedIdeaId: undefined, status: 'standalone' } : null);
    }
  };

  // Get all ideas (user + library converted to DynamicIdea format)
  const allIdeasForPicker = useMemo(() => {
    const libraryAsDynamic: DynamicIdea[] = existingIdeas.map(idea => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      icon: idea.icon,
      isUserCreated: false,
      thoughtIds: savedThoughts.filter(t => t.linkedIdeaId === idea.id).map(t => t.id),
      createdAt: '',
      updatedAt: '',
    }));
    return [...userIdeas, ...libraryAsDynamic];
  }, [userIdeas, savedThoughts]);

  // Get thoughts for a specific idea
  const getThoughtsForIdea = (ideaId: number) => {
    return savedThoughts.filter(t => t.linkedIdeaId === ideaId);
  };

  // Toggle task completion in saved thoughts
  const toggleTaskInSaved = (thoughtId: number, taskId: number) => {
    setSavedThoughts(prev => prev.map(thought => {
      if (thought.id === thoughtId) {
        return {
          ...thought,
          tasks: thought.tasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          ),
        };
      }
      return thought;
    }));
    // Also update selectedThought if it's the same one
    setSelectedThought(prev => {
      if (prev && prev.id === thoughtId) {
        return {
          ...prev,
          tasks: prev.tasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
          ),
        };
      }
      return prev;
    });
  };

  // Delete thought
  const deleteThought = (id: number) => {
    setSavedThoughts(prev => prev.filter(t => t.id !== id));
    setSelectedThought(null);
    setShowDeleteConfirm(false);
  };

  // Continue developing a thought
  const continueThought = (thought: StructuredThought) => {
    const context = `Weiterentwicklung von "${thought.title}":\n\nBisherige Kernpunkte:\n${thought.keyPoints.map(p => `• ${p}`).join('\n')}\n\nZusammenfassung: ${thought.summary}`;
    setManualTranscript(context);
    setSelectedThought(null);
    setActiveTab('record');
  };

  // Filter and search
  const filteredIdeas = existingIdeas.filter(idea => {
    const matchesCategory = filterCategory === 'Alle' || idea.category === filterCategory;
    const matchesSearch = searchQuery === '' ||
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      idea.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Unique categories
  const uniqueCategories = [...new Set(existingIdeas.map(i => i.category))];

  return (
    <div className="min-h-screen bg-gray-50 font-sans max-w-md mx-auto relative overflow-hidden">
      {/* Status Bar */}
      <div className="bg-white px-6 py-2 flex justify-between items-center text-sm font-semibold">
        <span>9:41</span>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-1 bg-black rounded-sm" style={{ height: `${4 + i * 2}px` }} />
            ))}
          </div>
          <span className="text-xs">5G</span>
          <div className="w-7 h-3 border border-black rounded-sm relative">
            <div className="absolute inset-0.5 bg-black rounded-xs" style={{ width: '80%' }} />
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">ThinkFlow</h1>
            <p className="text-gray-500 text-sm">Gedanken sprechen. Struktur erhalten.</p>
          </div>
          <div className="flex items-center gap-2">
            {/* API Status Indicator */}
            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${
              hasValidConfig
                ? 'bg-green-100 text-green-600'
                : 'bg-amber-100 text-amber-600'
            }`}>
              {hasValidConfig ? 'KI aktiv' : 'Demo'}
            </div>
            <Link
              href="/settings"
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-28 overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
        {/* Record Tab */}
        {activeTab === 'record' && (
          <div className="p-6">
            <div className="bg-white rounded-3xl shadow-sm p-8 mb-6">
              <div className="flex flex-col items-center">
                {/* Speech Recognition Support Warning */}
                {!isSupported && (
                  <div className="mb-4 p-3 bg-amber-50 rounded-xl text-center">
                    <p className="text-amber-700 text-sm">
                      Spracherkennung nicht unterstützt. Du kannst stattdessen Text eingeben.
                    </p>
                  </div>
                )}

                <button
                  onClick={toggleRecording}
                  disabled={!isSupported}
                  className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 transform active:scale-95 ${
                    isListening
                      ? 'bg-red-500 shadow-lg shadow-red-200 animate-pulse-ring'
                      : isSupported
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200 hover:shadow-xl'
                        : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {isListening ? (
                    <div className="w-8 h-8 bg-white rounded-md" />
                  ) : (
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                    </svg>
                  )}
                </button>

                <p className="mt-5 text-lg font-semibold text-gray-900">
                  {isListening ? 'Aufnahme läuft...' : 'Tippe zum Sprechen'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {isListening ? 'Tippe erneut zum Stoppen' : 'Sprich deine Gedanken einfach aus'}
                </p>

                {/* Speech Error */}
                {speechError && (
                  <p className="mt-3 text-red-500 text-sm text-center">{speechError}</p>
                )}

                {/* Wave Animation */}
                {isListening && (
                  <div className="flex items-end gap-1 mt-5 h-8">
                    {waveHeights.map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-500 rounded-full transition-all duration-150"
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                )}

                {/* Interim transcript */}
                {interimTranscript && (
                  <p className="mt-4 text-gray-400 text-sm italic">{interimTranscript}</p>
                )}
              </div>
            </div>

            {/* Manual Text Input */}
            {!isListening && !currentTranscript && (
              <div className="mb-6">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Oder Text eingeben
                </label>
                <textarea
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                  placeholder="Tippe hier deine Gedanken ein..."
                  className="w-full px-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  rows={3}
                />
              </div>
            )}

            {/* Quick Ideas */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Schnellstart mit einer Idee
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
                {existingIdeas.slice(20, 28).map((idea) => (
                  <button
                    key={idea.id}
                    onClick={() => {
                      setManualTranscript(`Ich möchte an "${idea.title}" arbeiten: ${idea.description}`);
                    }}
                    className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-white rounded-xl shadow-sm text-sm hover:shadow-md transition-shadow"
                  >
                    <span>{idea.icon}</span>
                    <span className="text-gray-700 font-medium whitespace-nowrap">{idea.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript Display */}
            {currentTranscript && (
              <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Transkript</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                    {currentTranscript.split(' ').length} Wörter
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm">{currentTranscript}</p>

                {!isListening && (
                  <div className="mt-5 space-y-2">
                    <button
                      onClick={processWithAI}
                      disabled={isProcessing}
                      className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all transform active:scale-98 ${
                        isProcessing
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-black text-white hover:bg-gray-800'
                      }`}
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          KI strukturiert...
                        </span>
                      ) : (
                        <span>
                          {hasValidConfig ? '✨ Mit KI strukturieren' : '✨ Im Demo-Modus strukturieren'}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        resetTranscript();
                        setManualTranscript('');
                        setStructuredThought(null);
                        setProcessingError(null);
                      }}
                      className="w-full py-2 text-gray-500 text-sm font-medium hover:text-gray-700"
                    >
                      Verwerfen
                    </button>

                    {/* Error Display */}
                    {processingError && (
                      <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-200">
                        <p className="text-red-700 text-sm font-semibold mb-1">Fehler:</p>
                        <p className="text-red-600 text-sm">{processingError}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Structured Result */}
            {structuredThought && (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className={`p-5 ${CATEGORIES[structuredThought.category]?.lightColor || 'bg-gray-50'}`}>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${CATEGORIES[structuredThought.category]?.color || 'bg-gray-500'}`}>
                    {structuredThought.category}
                  </span>
                  <h3 className="text-lg font-bold text-gray-900 mt-2">{structuredThought.title}</h3>
                </div>

                <div className="p-5 space-y-5">
                  {/* Key Points */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kernpunkte</h4>
                    <ul className="space-y-2">
                      {structuredThought.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className={`w-5 h-5 rounded-full ${CATEGORIES[structuredThought.category]?.lightColor} ${CATEGORIES[structuredThought.category]?.textColor} flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5`}>
                            {i + 1}
                          </span>
                          <span className="text-gray-700 text-sm">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tasks */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Aufgaben</h4>
                    <ul className="space-y-2">
                      {structuredThought.tasks.map((task) => (
                        <li key={task.id} className="flex items-center gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                          <button
                            onClick={() => {
                              setStructuredThought(prev => prev ? ({
                                ...prev,
                                tasks: prev.tasks.map(t =>
                                  t.id === task.id ? { ...t, completed: !t.completed } : t
                                ),
                              }) : null);
                            }}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              task.completed
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {task.completed && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {task.text}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            task.priority === 'Hoch' ? 'bg-red-100 text-red-600' :
                            task.priority === 'Mittel' ? 'bg-amber-100 text-amber-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {task.priority}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Related Ideas */}
                  {structuredThought.relatedIdeas?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Verwandte Ideen</h4>
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                        {structuredThought.relatedIdeas.map((idea) => (
                          <button
                            key={idea.id}
                            onClick={() => {
                              setSelectedIdea(idea);
                              setActiveTab('ideas');
                            }}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full text-xs hover:bg-gray-200 transition-colors"
                          >
                            <span>{idea.icon}</span>
                            <span className="text-gray-700 font-medium">{idea.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save Options */}
                  <div className="space-y-2">
                    <button
                      onClick={saveThought}
                      className="w-full py-3.5 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 transition-colors transform active:scale-98"
                    >
                      Gedanken speichern
                    </button>
                    <button
                      onClick={() => setShowIdeaPicker(true)}
                      className="w-full py-3.5 bg-blue-500 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 transition-colors transform active:scale-98 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Zu Idee speichern
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Thoughts Tab */}
        {activeTab === 'thoughts' && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Meine Gedanken</h2>

            {savedThoughts.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">Noch keine Gedanken</p>
                <p className="text-gray-400 text-sm mt-1">Sprich deine Ideen ein und strukturiere sie</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedThoughts.map((thought) => {
                  const completedTasks = thought.tasks?.filter(t => t.completed).length || 0;
                  const totalTasks = thought.tasks?.length || 0;
                  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                  return (
                    <button
                      key={thought.id}
                      onClick={() => setSelectedThought(thought)}
                      className="w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all duration-200 active:scale-[0.98] group"
                    >
                      <div className={`p-4 ${CATEGORIES[thought.category]?.lightColor || 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${CATEGORIES[thought.category]?.color || 'bg-gray-500'}`}>
                              {thought.category}
                            </span>
                            <h3 className="font-bold text-gray-900 mt-1.5 text-sm truncate">{thought.title}</h3>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <span className="text-xs text-gray-400">
                              {new Date(thought.createdAt).toLocaleDateString('de-DE')}
                            </span>
                            <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              {totalTasks} Aufgaben
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {completedTasks} erledigt
                            </span>
                          </div>
                          {/* Progress Ring */}
                          {totalTasks > 0 && (
                            <div className="relative w-8 h-8">
                              <svg className="w-8 h-8 transform -rotate-90">
                                <circle
                                  cx="16"
                                  cy="16"
                                  r="12"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  fill="none"
                                  className="text-gray-100"
                                />
                                <circle
                                  cx="16"
                                  cy="16"
                                  r="12"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  fill="none"
                                  strokeLinecap="round"
                                  className={progress === 100 ? 'text-green-500' : 'text-blue-500'}
                                  strokeDasharray={`${progress * 0.754} 75.4`}
                                  style={{ transition: 'stroke-dasharray 0.3s ease' }}
                                />
                              </svg>
                              {progress === 100 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Ideas Tab */}
        {activeTab === 'ideas' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Ideen</h2>
              <span className="text-sm text-gray-500">{userIdeas.length + existingIdeas.length} Ideen</span>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Ideen durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* My Ideas Section */}
            {userIdeas.length > 0 && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Meine Ideen</h3>
                <div className="space-y-3">
                  {userIdeas
                    .filter(idea =>
                      searchQuery === '' ||
                      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      idea.description.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((idea) => {
                      const ideaThoughts = getThoughtsForIdea(idea.id);
                      const completedTasks = ideaThoughts.flatMap(t => t.tasks).filter(t => t.completed).length;
                      const totalTasks = ideaThoughts.flatMap(t => t.tasks).length;

                      return (
                        <button
                          key={`user-${idea.id}`}
                          onClick={() => setSelectedDynamicIdea(idea)}
                          className="w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all active:scale-[0.98] group"
                        >
                          <div className={`p-4 ${CATEGORIES[idea.category]?.lightColor || 'bg-blue-50'}`}>
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{idea.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${CATEGORIES[idea.category]?.color || 'bg-blue-500'}`}>
                                    {idea.category}
                                  </span>
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                    Eigene
                                  </span>
                                </div>
                                <h3 className="font-bold text-gray-900 mt-1 text-sm truncate">{idea.title}</h3>
                              </div>
                              <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                {ideaThoughts.length} Gedanken
                              </span>
                              {totalTasks > 0 && (
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  {completedTasks}/{totalTasks} erledigt
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Category Filter for Library */}
            <div className="mb-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Ideen-Bibliothek</h3>
              <div className="flex gap-2 overflow-x-auto pb-3 -mx-6 px-6 scrollbar-hide">
                <button
                  onClick={() => setFilterCategory('Alle')}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    filterCategory === 'Alle'
                      ? 'bg-black text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Alle
                </button>
                {uniqueCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      filterCategory === cat
                        ? `${CATEGORIES[cat]?.color || 'bg-gray-500'} text-white`
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Library Ideas List */}
            <div className="space-y-3">
              {filteredIdeas
                .filter(idea =>
                  searchQuery === '' ||
                  idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  idea.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((idea) => {
                  const ideaThoughts = getThoughtsForIdea(idea.id);
                  return (
                    <button
                      key={`lib-${idea.id}`}
                      onClick={() => {
                        // Convert library idea to DynamicIdea format for detail view
                        const dynamicIdea: DynamicIdea = {
                          id: idea.id,
                          title: idea.title,
                          description: idea.description,
                          category: idea.category,
                          icon: idea.icon,
                          isUserCreated: false,
                          thoughtIds: ideaThoughts.map(t => t.id),
                          createdAt: '',
                          updatedAt: '',
                        };
                        setSelectedDynamicIdea(dynamicIdea);
                      }}
                      className="w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-all active:scale-[0.98] group"
                    >
                      <div className={`p-4 ${CATEGORIES[idea.category]?.lightColor || 'bg-gray-50'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{idea.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${CATEGORIES[idea.category]?.color || 'bg-gray-500'}`}>
                                {idea.category}
                              </span>
                              {ideaThoughts.length > 0 && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                  {ideaThoughts.length} Gedanken
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-gray-900 mt-1 text-sm truncate">{idea.title}</h3>
                          </div>
                          <svg className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">{idea.description}</p>
                      </div>
                    </button>
                  );
                })}
            </div>

            {filteredIdeas.length === 0 && userIdeas.length === 0 && (
              <div className="text-center py-10">
                <p className="text-gray-500">Keine Ideen gefunden</p>
                <button
                  onClick={() => { setFilterCategory('Alle'); setSearchQuery(''); }}
                  className="mt-2 text-blue-500 text-sm font-medium"
                >
                  Filter zurücksetzen
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Thought Detail Bottom Sheet */}
      {selectedThought && (
        <div className="fixed inset-0 z-50 max-w-md mx-auto">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => {
              setSelectedThought(null);
              setShowDeleteConfirm(false);
            }}
          />

          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slideUp max-h-[85vh] overflow-hidden flex flex-col">
            {/* Handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className={`px-6 pb-4 ${CATEGORIES[selectedThought.category]?.lightColor || 'bg-gray-50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${CATEGORIES[selectedThought.category]?.color || 'bg-gray-500'}`}>
                    {selectedThought.category}
                  </span>
                  <h2 className="text-xl font-bold text-gray-900 mt-2 pr-4">{selectedThought.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {new Date(selectedThought.createdAt).toLocaleDateString('de-DE', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedThought(null);
                    setShowDeleteConfirm(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress Bar */}
              {selectedThought.tasks.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-600 font-medium">Fortschritt</span>
                    <span className="text-gray-900 font-bold">
                      {selectedThought.tasks.filter(t => t.completed).length} / {selectedThought.tasks.length}
                    </span>
                  </div>
                  <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedThought.tasks.filter(t => t.completed).length === selectedThought.tasks.length
                          ? 'bg-green-500'
                          : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${(selectedThought.tasks.filter(t => t.completed).length / selectedThought.tasks.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Summary */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Zusammenfassung</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{selectedThought.summary}</p>
              </div>

              {/* Key Points */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kernpunkte</h3>
                <ul className="space-y-2">
                  {selectedThought.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className={`w-5 h-5 rounded-full ${CATEGORIES[selectedThought.category]?.lightColor} ${CATEGORIES[selectedThought.category]?.textColor} flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5`}>
                        {i + 1}
                      </span>
                      <span className="text-gray-700 text-sm">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tasks */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Aufgaben</h3>
                <ul className="space-y-2">
                  {selectedThought.tasks.map((task) => (
                    <li key={task.id} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
                      <button
                        onClick={() => toggleTaskInSaved(selectedThought.id, task.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 active:scale-90 ${
                          task.completed
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {task.completed && (
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span className={`flex-1 text-sm ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                        {task.text}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        task.priority === 'Hoch' ? 'bg-red-100 text-red-600' :
                        task.priority === 'Mittel' ? 'bg-amber-100 text-amber-600' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {task.priority}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white space-y-2 pb-safe">
              {!showDeleteConfirm ? (
                <>
                  <button
                    onClick={() => continueThought(selectedThought)}
                    className="w-full py-3.5 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Weiterentwickeln
                  </button>
                  {selectedThought.linkedIdeaId ? (
                    <button
                      onClick={() => unlinkThought(selectedThought)}
                      className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Von Idee lösen
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setPendingThoughtForIdea(selectedThought);
                        setShowIdeaPicker(true);
                      }}
                      className="w-full py-3 bg-blue-100 text-blue-700 rounded-xl font-semibold text-sm hover:bg-blue-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Zu Idee hinzufügen
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-3 text-red-600 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors"
                  >
                    Gedanken löschen
                  </button>
                </>
              ) : (
                <div className="animate-fadeIn">
                  <p className="text-center text-gray-600 text-sm mb-3">
                    Möchtest du diesen Gedanken wirklich löschen?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={() => deleteThought(selectedThought.id)}
                      className="flex-1 py-3 bg-red-500 text-white rounded-xl font-semibold text-sm hover:bg-red-600 transition-colors"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-200 px-8 pt-2 pb-6 pb-safe max-w-md mx-auto">
        <div className="flex justify-around">
          {[
            { id: 'record' as TabType, icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', label: 'Aufnehmen' },
            { id: 'thoughts' as TabType, icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', label: 'Gedanken', badge: savedThoughts.length || null },
            { id: 'ideas' as TabType, icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', label: 'Ideen', badge: existingIdeas.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center py-1 px-3 transition-colors ${
                activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'
              }`}
            >
              <svg className="w-6 h-6" fill={activeTab === tab.id ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
              </svg>
              <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
              {tab.badge && (
                <span className={`absolute -top-0.5 right-0 min-w-[18px] h-[18px] ${tab.id === 'ideas' ? 'bg-blue-500' : 'bg-red-500'} text-white text-[10px] rounded-full flex items-center justify-center px-1 font-semibold`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Idea Picker Modal */}
      {showIdeaPicker && (
        <div className="fixed inset-0 z-50 max-w-md mx-auto">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => {
              setShowIdeaPicker(false);
              setIdeaSearchQuery('');
              setPendingThoughtForIdea(null);
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slideUp max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pb-4">
              <h2 className="text-xl font-bold text-gray-900">Idee auswählen</h2>
              <p className="text-sm text-gray-500 mt-1">
                {pendingThoughtForIdea ? 'Gedanken mit einer Idee verknüpfen' : 'Gedanken zu einer Idee speichern'}
              </p>
            </div>

            {/* Search */}
            <div className="px-6 pb-4">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Ideen durchsuchen..."
                  value={ideaSearchQuery}
                  onChange={(e) => setIdeaSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Create New Idea Option */}
            <div className="px-6 pb-3">
              <button
                onClick={() => {
                  setShowIdeaPicker(false);
                  setShowCreateIdeaModal(true);
                }}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neue Idee erstellen
              </button>
            </div>

            {/* Ideas List */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {/* User Ideas */}
              {userIdeas.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Meine Ideen</h3>
                  <div className="space-y-2">
                    {userIdeas
                      .filter(idea =>
                        ideaSearchQuery === '' ||
                        idea.title.toLowerCase().includes(ideaSearchQuery.toLowerCase()) ||
                        idea.description.toLowerCase().includes(ideaSearchQuery.toLowerCase())
                      )
                      .map((idea) => {
                        const thoughtCount = getThoughtsForIdea(idea.id).length;
                        return (
                          <button
                            key={`user-${idea.id}`}
                            onClick={() => {
                              if (pendingThoughtForIdea) {
                                linkExistingThoughtToIdea(pendingThoughtForIdea, idea.id);
                              } else {
                                saveThoughtToIdea(idea.id);
                              }
                            }}
                            className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-3"
                          >
                            <span className="text-2xl">{idea.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${CATEGORIES[idea.category]?.color || 'bg-gray-500'}`}>
                                  {idea.category}
                                </span>
                                <span className="text-xs text-gray-400">{thoughtCount} Gedanken</span>
                              </div>
                              <p className="font-semibold text-gray-900 text-sm mt-1 truncate">{idea.title}</p>
                            </div>
                            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Library Ideas */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ideen-Bibliothek</h3>
                <div className="space-y-2">
                  {existingIdeas
                    .filter(idea =>
                      ideaSearchQuery === '' ||
                      idea.title.toLowerCase().includes(ideaSearchQuery.toLowerCase()) ||
                      idea.description.toLowerCase().includes(ideaSearchQuery.toLowerCase())
                    )
                    .slice(0, 20)
                    .map((idea) => {
                      const thoughtCount = getThoughtsForIdea(idea.id).length;
                      return (
                        <button
                          key={`lib-${idea.id}`}
                          onClick={() => {
                            if (pendingThoughtForIdea) {
                              linkExistingThoughtToIdea(pendingThoughtForIdea, idea.id);
                            } else {
                              saveThoughtToIdea(idea.id);
                            }
                          }}
                          className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-3"
                        >
                          <span className="text-2xl">{idea.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${CATEGORIES[idea.category]?.color || 'bg-gray-500'}`}>
                                {idea.category}
                              </span>
                              {thoughtCount > 0 && (
                                <span className="text-xs text-gray-400">{thoughtCount} Gedanken</span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 text-sm mt-1 truncate">{idea.title}</p>
                          </div>
                          <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Idea Detail Sheet */}
      {selectedDynamicIdea && (
        <div className="fixed inset-0 z-50 max-w-md mx-auto">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => setSelectedDynamicIdea(null)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slideUp max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className={`px-6 pb-4 ${CATEGORIES[selectedDynamicIdea.category]?.lightColor || 'bg-blue-50'}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">{selectedDynamicIdea.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${CATEGORIES[selectedDynamicIdea.category]?.color || 'bg-blue-500'}`}>
                        {selectedDynamicIdea.category}
                      </span>
                      {selectedDynamicIdea.isUserCreated && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                          Eigene Idee
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mt-1">{selectedDynamicIdea.title}</h2>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedDynamicIdea(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Progress Overview */}
              {(() => {
                const ideaThoughts = getThoughtsForIdea(selectedDynamicIdea.id);
                const allTasks = ideaThoughts.flatMap(t => t.tasks);
                const completedTasks = allTasks.filter(t => t.completed).length;
                const totalTasks = allTasks.length;
                const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                return totalTasks > 0 ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-600 font-medium">Gesamtfortschritt</span>
                      <span className="text-gray-900 font-bold">{completedTasks}/{totalTasks} Aufgaben</span>
                    </div>
                    <div className="h-2 bg-white/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Beschreibung</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{selectedDynamicIdea.description}</p>
              </div>

              {/* Linked Thoughts */}
              {(() => {
                const ideaThoughts = getThoughtsForIdea(selectedDynamicIdea.id);
                return ideaThoughts.length > 0 ? (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Verknüpfte Gedanken ({ideaThoughts.length})
                    </h3>
                    <div className="space-y-3">
                      {ideaThoughts.map((thought) => {
                        const completedTasks = thought.tasks.filter(t => t.completed).length;
                        const totalTasks = thought.tasks.length;
                        return (
                          <button
                            key={thought.id}
                            onClick={() => {
                              setSelectedDynamicIdea(null);
                              setSelectedThought(thought);
                            }}
                            className="w-full text-left p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm">{thought.title}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(thought.createdAt).toLocaleDateString('de-DE')}
                                </p>
                              </div>
                              {totalTasks > 0 && (
                                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  completedTasks === totalTasks
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-gray-200 text-gray-600'
                                }`}>
                                  {completedTasks}/{totalTasks}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-xl">
                    <p className="text-gray-500 text-sm">Noch keine Gedanken verknüpft</p>
                    <p className="text-gray-400 text-xs mt-1">Füge Gedanken hinzu, um diese Idee zu entwickeln</p>
                  </div>
                );
              })()}

              {/* All Tasks Aggregated */}
              {(() => {
                const ideaThoughts = getThoughtsForIdea(selectedDynamicIdea.id);
                const allTasks = ideaThoughts.flatMap(t =>
                  t.tasks.map(task => ({ ...task, thoughtId: t.id, thoughtTitle: t.title }))
                );
                const pendingTasks = allTasks.filter(t => !t.completed);

                return pendingTasks.length > 0 ? (
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      Offene Aufgaben ({pendingTasks.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingTasks.slice(0, 10).map((task) => (
                        <div key={`${task.thoughtId}-${task.id}`} className="flex items-center gap-2.5 p-3 bg-gray-50 rounded-xl">
                          <button
                            onClick={() => toggleTaskInSaved(task.thoughtId, task.id)}
                            className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center transition-all flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-gray-700">{task.text}</span>
                            <p className="text-xs text-gray-400 mt-0.5">{task.thoughtTitle}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            task.priority === 'Hoch' ? 'bg-red-100 text-red-600' :
                            task.priority === 'Mittel' ? 'bg-amber-100 text-amber-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      ))}
                      {pendingTasks.length > 10 && (
                        <p className="text-center text-xs text-gray-400 py-2">
                          + {pendingTasks.length - 10} weitere Aufgaben
                        </p>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-100 bg-white space-y-2 pb-safe">
              <button
                onClick={() => {
                  setManualTranscript(`Ich möchte an "${selectedDynamicIdea.title}" weiterarbeiten: ${selectedDynamicIdea.description}`);
                  setSelectedDynamicIdea(null);
                  setActiveTab('record');
                }}
                className="w-full py-3.5 bg-black text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Neuen Gedanken hinzufügen
              </button>
              {selectedDynamicIdea.isUserCreated && (
                <button
                  onClick={() => {
                    const ideaThoughts = getThoughtsForIdea(selectedDynamicIdea.id);
                    if (ideaThoughts.length > 0) {
                      alert(`Diese Idee hat ${ideaThoughts.length} verknüpfte Gedanken. Entferne zuerst alle Gedanken, bevor du die Idee löschen kannst.`);
                    } else {
                      if (confirm('Möchtest du diese Idee wirklich löschen?')) {
                        deleteIdea(selectedDynamicIdea.id);
                        setSelectedDynamicIdea(null);
                      }
                    }
                  }}
                  className="w-full py-3 text-red-600 text-sm font-medium hover:bg-red-50 rounded-xl transition-colors"
                >
                  Idee löschen
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Idea Modal */}
      {showCreateIdeaModal && (
        <div className="fixed inset-0 z-50 max-w-md mx-auto">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
            onClick={() => {
              setShowCreateIdeaModal(false);
              setNewIdeaTitle('');
              setNewIdeaIcon('💡');
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl animate-slideUp">
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="px-6 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Neue Idee erstellen</h2>

              {/* Icon Picker */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Icon</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {['💡', '🚀', '🎯', '⭐', '🔥', '💎', '🌟', '✨', '💪', '🎨', '📚', '🏆', '🌱', '🔮', '💫'].map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setNewIdeaIcon(icon)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                        newIdeaIcon === icon
                          ? 'bg-blue-100 ring-2 ring-blue-500'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">Titel</label>
                <input
                  type="text"
                  value={newIdeaTitle}
                  onChange={(e) => setNewIdeaTitle(e.target.value)}
                  placeholder="Name deiner Idee..."
                  className="w-full px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {/* Preview */}
              {structuredThought && (
                <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Verknüpfter Gedanke:</p>
                  <p className="text-sm font-medium text-gray-700">{structuredThought.title}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCreateIdeaModal(false);
                    setNewIdeaTitle('');
                    setNewIdeaIcon('💡');
                    setShowIdeaPicker(true);
                  }}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm"
                >
                  Zurück
                </button>
                <button
                  onClick={createIdeaFromThought}
                  disabled={!newIdeaTitle.trim()}
                  className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all ${
                    newIdeaTitle.trim()
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  Erstellen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
