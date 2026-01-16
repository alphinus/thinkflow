'use client';

import { useState } from 'react';
import { supabase, getOrCreateFamily, validateFamilyCode } from '../lib/supabase';

interface FamilyCodeModalProps {
  onAuthenticated: (familyId: string, familyCode: string) => void;
  onMigrate?: (familyId: string) => Promise<void>;
}

export default function FamilyCodeModal({ onAuthenticated, onMigrate }: FamilyCodeModalProps) {
  const [code, setCode] = useState(['', '', '', '']);
  const [mode, setMode] = useState<'input' | 'create'>('input');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMigrate, setShowMigrate] = useState(false);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`code-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const fullCode = code.join('');

  const handleJoin = async () => {
    if (fullCode.length !== 4) {
      setError('Bitte gib einen 4-stelligen Code ein');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const isValid = await validateFamilyCode(fullCode);
      if (!isValid) {
        setError('Code nicht gefunden. Erstelle einen neuen Code.');
        setLoading(false);
        return;
      }

      const family = await getOrCreateFamily(fullCode);
      if (family) {
        // Check if there's local data to migrate
        const localIdeas = localStorage.getItem('thinkflow_user_ideas');
        const localThoughts = localStorage.getItem('thinkflow_saved_thoughts');

        if ((localIdeas && JSON.parse(localIdeas).length > 0) ||
            (localThoughts && JSON.parse(localThoughts).length > 0)) {
          setShowMigrate(true);
          setLoading(false);
          // Store family info temporarily
          sessionStorage.setItem('pending_family_id', family.id);
          sessionStorage.setItem('pending_family_code', fullCode);
          return;
        }

        onAuthenticated(family.id, fullCode);
      } else {
        setError('Fehler beim Verbinden. Bitte versuche es erneut.');
      }
    } catch (err) {
      setError('Verbindungsfehler. Bitte versuche es erneut.');
    }

    setLoading(false);
  };

  const handleCreate = async () => {
    if (fullCode.length !== 4) {
      setError('Bitte gib einen 4-stelligen Code ein');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if code already exists
      const exists = await validateFamilyCode(fullCode);
      if (exists) {
        setError('Dieser Code existiert bereits. Bitte wähle einen anderen.');
        setLoading(false);
        return;
      }

      const family = await getOrCreateFamily(fullCode);
      if (family) {
        // Check if there's local data to migrate
        const localIdeas = localStorage.getItem('thinkflow_user_ideas');
        const localThoughts = localStorage.getItem('thinkflow_saved_thoughts');

        if ((localIdeas && JSON.parse(localIdeas).length > 0) ||
            (localThoughts && JSON.parse(localThoughts).length > 0)) {
          setShowMigrate(true);
          setLoading(false);
          // Store family info temporarily
          sessionStorage.setItem('pending_family_id', family.id);
          sessionStorage.setItem('pending_family_code', fullCode);
          return;
        }

        onAuthenticated(family.id, fullCode);
      } else {
        setError('Fehler beim Erstellen. Bitte versuche es erneut.');
      }
    } catch (err) {
      setError('Verbindungsfehler. Bitte versuche es erneut.');
    }

    setLoading(false);
  };

  const handleMigrationChoice = async (migrate: boolean) => {
    const familyId = sessionStorage.getItem('pending_family_id');
    const familyCode = sessionStorage.getItem('pending_family_code');

    if (!familyId || !familyCode) {
      setError('Sitzungsfehler. Bitte versuche es erneut.');
      setShowMigrate(false);
      return;
    }

    if (migrate && onMigrate) {
      setLoading(true);
      try {
        await onMigrate(familyId);
      } catch (err) {
        console.error('Migration error:', err);
      }
      setLoading(false);
    }

    // Clean up
    sessionStorage.removeItem('pending_family_id');
    sessionStorage.removeItem('pending_family_code');

    onAuthenticated(familyId, familyCode);
  };

  if (showMigrate) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            Lokale Daten gefunden
          </h2>

          <p className="text-gray-600 text-sm mb-6 text-center">
            Auf diesem Gerät sind bereits Ideen und Gedanken gespeichert.
            Sollen diese in die Cloud übertragen werden?
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleMigrationChoice(true)}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Wird übertragen...' : 'Ja, Daten übertragen'}
            </button>
            <button
              onClick={() => handleMigrationChoice(false)}
              disabled={loading}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Nein, neu starten
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">💭</div>
          <h1 className="text-2xl font-bold text-gray-800">ThinkFlow</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'input' ? 'Familien-Code eingeben' : 'Neuen Code erstellen'}
          </p>
        </div>

        {/* Code Input */}
        <div className="flex justify-center gap-3 mb-4">
          {code.map((digit, index) => (
            <input
              key={index}
              id={`code-input-${index}`}
              type="text"
              inputMode="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-colors uppercase"
              autoFocus={index === 0}
            />
          ))}
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">{error}</p>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {mode === 'input' ? (
            <>
              <button
                onClick={handleJoin}
                disabled={loading || fullCode.length !== 4}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Verbinde...' : 'Beitreten'}
              </button>
              <button
                onClick={() => setMode('create')}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Neuen Code erstellen
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCreate}
                disabled={loading || fullCode.length !== 4}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Erstelle...' : 'Code erstellen'}
              </button>
              <button
                onClick={() => setMode('input')}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Zurück
              </button>
            </>
          )}
        </div>

        <p className="text-gray-400 text-xs text-center mt-4">
          Der Code wird auf diesem Gerät gespeichert
        </p>
      </div>
    </div>
  );
}
