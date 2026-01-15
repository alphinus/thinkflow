'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useApiConfig } from '@/hooks/useLocalStorage';

export default function SettingsPage() {
  const { config, updateConfig, clearConfig, hasValidConfig } = useApiConfig();
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'anthropic' | 'google'>(
    config.provider || 'google'
  );
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const validateAndSave = async () => {
    if (!apiKey.trim()) {
      setValidationResult({ success: false, message: 'Bitte gib einen API Key ein.' });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const response = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey: apiKey.trim(),
        }),
      });

      const data = await response.json();

      if (data.valid) {
        updateConfig({
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          isValid: true,
        });
        setValidationResult({
          success: true,
          message: 'API Key ist gültig und wurde gespeichert!',
        });
      } else {
        setValidationResult({
          success: false,
          message: data.error || 'API Key ist ungültig.',
        });
      }
    } catch {
      setValidationResult({
        success: false,
        message: 'Fehler bei der Validierung. Bitte versuche es erneut.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleClear = () => {
    clearConfig();
    setApiKey('');
    setValidationResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Einstellungen</h1>
            <p className="text-gray-500 text-sm">API-Konfiguration</p>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Current Status */}
        <div className={`p-4 rounded-2xl ${hasValidConfig ? 'bg-green-50' : 'bg-amber-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              hasValidConfig ? 'bg-green-500' : 'bg-amber-500'
            }`}>
              {hasValidConfig ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <p className={`font-semibold ${hasValidConfig ? 'text-green-700' : 'text-amber-700'}`}>
                {hasValidConfig ? 'KI-Modus aktiv' : 'Demo-Modus aktiv'}
              </p>
              <p className={`text-sm ${hasValidConfig ? 'text-green-600' : 'text-amber-600'}`}>
                {hasValidConfig
                  ? `${config.provider === 'openai' ? 'OpenAI' : config.provider === 'anthropic' ? 'Anthropic' : 'Google Gemini'} verbunden`
                  : 'Hinterlege einen API Key für echte KI-Verarbeitung'}
              </p>
            </div>
          </div>
        </div>

        {/* Provider Selection */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">KI-Anbieter wählen</h2>

          <div className="space-y-3">
            <button
              onClick={() => setSelectedProvider('openai')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selectedProvider === 'openai'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedProvider === 'openai' ? 'bg-green-500' : 'bg-gray-200'
                }`}>
                  <span className="text-lg">🤖</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">OpenAI</p>
                  <p className="text-sm text-gray-500">GPT-4o Mini - schnell & günstig</p>
                </div>
                {selectedProvider === 'openai' && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>

            <button
              onClick={() => setSelectedProvider('anthropic')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selectedProvider === 'anthropic'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedProvider === 'anthropic' ? 'bg-orange-500' : 'bg-gray-200'
                }`}>
                  <span className="text-lg">🧠</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Anthropic</p>
                  <p className="text-sm text-gray-500">Claude 3 Haiku - präzise & sicher</p>
                </div>
                {selectedProvider === 'anthropic' && (
                  <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>

            <button
              onClick={() => setSelectedProvider('google')}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                selectedProvider === 'google'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  selectedProvider === 'google' ? 'bg-blue-500' : 'bg-gray-200'
                }`}>
                  <span className="text-lg">✨</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Google Gemini</p>
                  <p className="text-sm text-gray-500">Gemini 2.0 Flash - kostenlos!</p>
                </div>
                {selectedProvider === 'google' && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* API Key Input */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">API Key eingeben</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                {selectedProvider === 'openai' ? 'OpenAI API Key' : selectedProvider === 'anthropic' ? 'Anthropic API Key' : 'Google Gemini API Key'}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={selectedProvider === 'openai' ? 'sk-...' : selectedProvider === 'anthropic' ? 'sk-ant-...' : 'AIza...'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {validationResult && (
              <div className={`p-3 rounded-xl ${
                validationResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                <p className="text-sm font-medium">{validationResult.message}</p>
              </div>
            )}

            <button
              onClick={validateAndSave}
              disabled={isValidating || !apiKey.trim()}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                isValidating || !apiKey.trim()
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800 active:scale-98'
              }`}
            >
              {isValidating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Validiere...
                </span>
              ) : (
                'Key testen & speichern'
              )}
            </button>

            {hasValidConfig && (
              <button
                onClick={handleClear}
                className="w-full py-3 rounded-xl font-medium text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                API Key entfernen
              </button>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 rounded-2xl p-5">
          <h3 className="font-semibold text-blue-900 mb-2">Wo bekomme ich einen API Key?</h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>
                <strong>Google Gemini (kostenlos!):</strong>{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">
                  aistudio.google.com/apikey
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>
                <strong>OpenAI:</strong>{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">
                  platform.openai.com/api-keys
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span>•</span>
              <span>
                <strong>Anthropic:</strong>{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">
                  console.anthropic.com/settings/keys
                </a>
              </span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-blue-600">
            Dein API Key wird nur lokal in deinem Browser gespeichert und niemals an unsere Server gesendet.
          </p>
        </div>
      </main>
    </div>
  );
}
