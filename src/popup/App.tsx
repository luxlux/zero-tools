import React, { useEffect, useState } from 'react';
import { Clock, Save, Info, Eye, Power, Activity, Zap } from 'lucide-react';

declare const chrome: any;

interface Settings {
  isActive: boolean;
  // Feature 1: Latency Monitor
  latencyMonitorEnabled: boolean;
  warningThreshold: number; // Yellow
  criticalThreshold: number; // Red

  // Feature 2: Finanzen Zero (Placeholder)
  featureTwoEnabled: boolean;

  // Sub-feature: Auto-Check
  autoCheckEnabled: boolean;

  // Sub-feature: Offset Buttons
  offsetButtonsEnabled: boolean;
  customOffsets: string;
  // Sub-feature: Limit Adjuster
  limitAdjusterEnabled: boolean;
  // Sub-feature: Confirm Page
  confirmPageEnabled: boolean;
  confirmPagePerformanceInfoEnabled: boolean;
  // Feature 3: Postbox Downloader
  postboxDownloaderEnabled: boolean;
  postboxFilenameMode: 'original' | 'display';
}

// Assuming there's a translations object that was omitted from the provided content
// and the user wants to add this to it.
// Based on the provided `Code Edit` snippet, it seems to be part of a larger
// configuration or translation object that was not fully included in the `content`.
// I will insert it where the `Code Edit` snippet indicates, assuming the surrounding
// context (like `limitAdjuster`) exists in the full file.
const translations = {
  // ... other translations
  limitAdjuster: 'Limit-Anpassung (+/- Buttons)',
  shiftAlternative: 'Alternativ: Shift-Taste halten',
};

const defaultSettings: Settings = {
  isActive: true,
  latencyMonitorEnabled: true,
  warningThreshold: 5,
  criticalThreshold: 20,
  featureTwoEnabled: false,
  autoCheckEnabled: false,
  offsetButtonsEnabled: false,
  customOffsets: '0,1%; 0,2%; 0,5%; 1,0%',
  limitAdjusterEnabled: true,
  confirmPageEnabled: false,
  confirmPagePerformanceInfoEnabled: false,
  postboxDownloaderEnabled: true,
  postboxFilenameMode: 'display',
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    // Load settings from chrome storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get(['latencySettings'], (result: any) => {
        if (result.latencySettings) {
          const loaded = result.latencySettings;
          // Migration logic: ensure isActive is present, default to true
          if (typeof loaded.isActive === 'undefined') {
            loaded.isActive = true;
          }
          setSettings(prev => ({ ...prev, ...loaded }));
        }
      });
    }
  }, []);

  const handleSave = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ latencySettings: settings }, () => {
        setStatus('Settings saved!');
        setTimeout(() => setStatus(''), 2000);
      });
    } else {
      setStatus('Dev mode: Saved');
    }
  };

  // Auto-save helper
  const updateSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ latencySettings: newSettings });
    }
  };

  const toggleMasterSwitch = () => {
    updateSettings({ ...settings, isActive: !settings.isActive });
  };

  const toggleLatencyMonitor = () => {
    updateSettings({ ...settings, latencyMonitorEnabled: !settings.latencyMonitorEnabled });
  };

  const toggleFeatureTwo = () => {
    updateSettings({ ...settings, featureTwoEnabled: !settings.featureTwoEnabled });
  };

  const toggleAutoCheck = () => {
    const newValue = !settings.autoCheckEnabled;
    updateSettings({
      ...settings,
      autoCheckEnabled: newValue,
      // Force limit adjuster off if auto check is enabled
      limitAdjusterEnabled: newValue ? false : settings.limitAdjusterEnabled
    });
  };

  const toggleLimitAdjuster = () => {
    if (settings.autoCheckEnabled) return; // Prevent enabling if auto check is on
    updateSettings({ ...settings, limitAdjusterEnabled: !settings.limitAdjusterEnabled });
  };

  const toggleOffsetButtons = () => {
    updateSettings({ ...settings, offsetButtonsEnabled: !settings.offsetButtonsEnabled });
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-sans selection:bg-pink-100 min-h-fit pb-2 w-[350px] overflow-hidden">
      {/* Brand Header */}
      {/* Brand Header */}
      <div className="bg-gradient-to-r from-[#ec008c] to-[#00a1e4] p-4 text-white shadow-md flex justify-between items-start">
        {/* Left Column */}
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-white/90" />
            <h1 className="text-xl tracking-tight leading-none">
              <span className="font-light">zero</span>
              <span className="font-semibold ml-1">TOOLS</span>
            </h1>
          </div>
          <p className="text-blue-50 text-[10px] font-medium tracking-wide opacity-90 mt-1 uppercase">
            Unofficial Extension Suite
          </p>
        </div>

        {/* Right Column: Master Switch */}
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[9px] font-medium uppercase tracking-wider opacity-90 leading-tight text-right">
            Auf <a href="#disclaimer" className="underline decoration-white/50 hover:decoration-white cursor-pointer">eigenes Risiko</a><br />verwenden:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">
              {settings.isActive ? 'AN' : 'AUS'}
            </span>
            <button
              onClick={toggleMasterSwitch}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#00a1e4] ${settings.isActive ? 'bg-white/90' : 'bg-black/20'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform ${settings.isActive ? 'translate-x-5 bg-[#00a1e4]' : 'translate-x-0.5 bg-white/90'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`p-3 space-y-3 transition-opacity duration-300 ${settings.isActive ? 'opacity-100' : 'opacity-50 pointer-events-none grayscale'}`}>

        {/* Feature 1: Latency Monitor */}
        <div className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${settings.latencyMonitorEnabled ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200 grayscale-[0.5]'}`}>
          <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${settings.latencyMonitorEnabled ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'}`}>
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Latenz-Monitor</h3>
                <p className="text-[10px] text-slate-500">Echtzeit-Latenz-Erkennung</p>
              </div>
            </div>
            <button
              onClick={toggleLatencyMonitor}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${settings.latencyMonitorEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${settings.latencyMonitorEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {settings.latencyMonitorEnabled && (
            <div className="p-3 bg-white animate-fade-in">
              <div className="flex items-start gap-2 mb-3 text-[11px] text-slate-600">
                <Info className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                <p>Zeigt Zeitverzögerung bei Derivat Kursen (Turbos/Optionsscheine). Hilft, veraltete Kurse zu erkennen.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Warnung (Sek)</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.warningThreshold}
                    onChange={(e) => updateSettings({ ...settings, warningThreshold: Number(e.target.value) })}
                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-orange-200 focus:border-orange-400 outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-500">Kritisch (Sek)</label>
                  <input
                    type="number"
                    min="1"
                    value={settings.criticalThreshold}
                    onChange={(e) => updateSettings({ ...settings, criticalThreshold: Number(e.target.value) })}
                    className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-red-200 focus:border-red-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Feature 2: Set as Limit */}
        <div className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${settings.featureTwoEnabled ? 'border-purple-200 ring-1 ring-purple-100' : 'border-slate-200 grayscale-[0.5]'}`}>
          <div className="p-3 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${settings.featureTwoEnabled ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-500'}`}>
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Als Limit setzen</h3>
                <p className="text-[10px] text-slate-500">Schnelle Limit-Eingabe</p>
              </div>
            </div>
            <button
              onClick={toggleFeatureTwo}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${settings.featureTwoEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${settings.featureTwoEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {settings.featureTwoEnabled && (
            <div className="p-3 bg-white border-t border-slate-100 animate-fade-in">
              <div className="flex items-start gap-2 mb-3 text-[11px] text-slate-600">
                <Info className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                <p>Fügt Buttons unter Bid/Ask-Preisen hinzu, um diese als Limit zu setzen.</p>
              </div>

              {/* Auto-Check Toggle */}
              <div className="flex items-center justify-between bg-purple-50 p-2 rounded border border-purple-100 mb-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-purple-900">Automatisch prüfen</span>
                  <span className="text-[10px] text-purple-700">Klick betätigt auch "Order prüfen"</span>
                  <span className="text-[9px] text-purple-600/80 block mt-0.5">(Alternativ: Shift-Taste halten)</span>
                </div>
                <button
                  onClick={toggleAutoCheck}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${settings.autoCheckEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${settings.autoCheckEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Limit Adjuster Toggle */}
              <div className={`flex items-center justify-between bg-purple-50 p-2 rounded border border-purple-100 mb-2 ${settings.autoCheckEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-purple-900">Limit-Anpassung</span>
                  <span className="text-[10px] text-purple-700">Buttons für +/- Anpassung</span>
                </div>
                <button
                  onClick={toggleLimitAdjuster}
                  disabled={settings.autoCheckEnabled}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${settings.limitAdjusterEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${settings.limitAdjusterEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Confirm Page Toggle */}
              <div className="flex items-center justify-between bg-purple-50 p-2 rounded border border-purple-100 mb-2">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-purple-900">Order-Änderung</span>
                  <span className="text-[10px] text-purple-700">Limit ändern auf Bestätigungsseite</span>
                </div>
                <button
                  onClick={() => updateSettings({ ...settings, confirmPageEnabled: !settings.confirmPageEnabled })}
                  className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${settings.confirmPageEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${settings.confirmPageEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </button>
              </div>

              {/* Confirm Page Performance Info Toggle */}
              {settings.confirmPageEnabled && (
                <div className="flex items-center justify-between bg-purple-50 p-2 rounded border border-purple-100 mb-2 ml-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-purple-900">Performance-Info</span>
                    <span className="text-[10px] text-purple-700">Zeigt "Meine Position" Details</span>
                  </div>
                  <button
                    onClick={() => updateSettings({ ...settings, confirmPagePerformanceInfoEnabled: !settings.confirmPagePerformanceInfoEnabled })}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${settings.confirmPagePerformanceInfoEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${settings.confirmPagePerformanceInfoEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>
              )}

              {/* Offset Buttons Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">Offset-Buttons</span>
                    <span className="text-[10px] text-slate-500">Zusätzliche %-Buttons</span>
                  </div>
                  <button
                    onClick={toggleOffsetButtons}
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none ${settings.offsetButtonsEnabled ? 'bg-purple-500' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${settings.offsetButtonsEnabled ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {settings.offsetButtonsEnabled && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Prozentwerte (mit Semikolon getrennt)</label>
                    <input
                      type="text"
                      value={settings.customOffsets}
                      onChange={(e) => updateSettings({ ...settings, customOffsets: e.target.value })}
                      className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none"
                      placeholder="0,1; 0,5; 1,0"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Feature 3: Postbox Downloader */}
        <div className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${settings.postboxDownloaderEnabled ? 'border-green-200 ring-1 ring-green-100' : 'border-slate-200 grayscale-[0.5]'}`}>
          <div className="p-3 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${settings.postboxDownloaderEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                <Save className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Posteingang</h3>
                <p className="text-[10px] text-slate-500">PDF Massen-Download</p>
              </div>
            </div>
            <button
              onClick={() => updateSettings({ ...settings, postboxDownloaderEnabled: !settings.postboxDownloaderEnabled })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${settings.postboxDownloaderEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${settings.postboxDownloaderEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {settings.postboxDownloaderEnabled && (
            <div className="p-3 bg-white border-t border-slate-100 animate-fade-in">
              <div className="flex items-start gap-2 mb-3 text-[11px] text-slate-600">
                <Info className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                <p title="Lädt alle aufgelisteten PDFs als ZIP-Archiv mit Dateidatum entsprechend Liste herunter.">Lädt alle aufgelisteten PDFs als ZIP-Archiv mit Dateidatum entsprechend Liste herunter.</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Dateinamen</label>
                <select
                  value={settings.postboxFilenameMode}
                  onChange={(e) => updateSettings({ ...settings, postboxFilenameMode: e.target.value as 'original' | 'display' })}
                  className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none"
                >
                  <option value="original">Original (vom Server)</option>
                  <option value="display">Datum + Angezeigter Titel</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Legal Disclaimer */}
        <div className="text-center px-2 pb-2">
          <p id="disclaimer" className="text-[10px] text-slate-400 leading-tight text-justify">
            Inoffizielle Erweiterung. Nicht verbunden mit der finanzen.net zero GmbH. Nutzung auf eigene Gefahr! Der Ersteller der Erweiterung gibt keine Funktionsgarantie. Börsenhandel kann zu Totalverlusten führen. &nbsp;
            <strong className="text-slate-500 font-bold">KONTROLLIERE deine Order immer SELBST, bevor du sie absendest! </strong>
            Verwende die Erweiterung NICHT, wenn du nicht bereit bist Risiken zu 100% selbst zu tragen!
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;