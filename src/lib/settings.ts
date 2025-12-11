// Настройки приложения
export interface CallHistoryItem {
  id: string;
  roomId: string;
  roomName?: string;
  date: string;
  duration?: number; // в секундах
  participants?: string[];
}

export interface AppSettings {
  userName: string;
  videoQuality: '720p' | '1080p';
  theme: 'dark' | 'light';
  callHistory: CallHistoryItem[];
}

const SETTINGS_KEY = 'flozmeet_settings';

const defaultSettings: AppSettings = {
  userName: '',
  videoQuality: '1080p',
  theme: 'dark',
  callHistory: [],
};

export function getSettings(): AppSettings {
  if (typeof window === 'undefined') return defaultSettings;
  
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error reading settings:', e);
  }
  return defaultSettings;
}

export function saveSettings(settings: Partial<AppSettings>): AppSettings {
  const current = getSettings();
  const updated = { ...current, ...settings };
  
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error saving settings:', e);
  }
  
  return updated;
}

export function addCallToHistory(roomId: string, roomName?: string): CallHistoryItem {
  const current = getSettings();
  const newCall: CallHistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    roomId,
    roomName: roomName || `Встреча ${roomId.slice(0, 6)}`,
    date: new Date().toISOString(),
  };
  
  // Добавляем в начало, ограничиваем 50 записями
  const updatedHistory = [newCall, ...current.callHistory].slice(0, 50);
  saveSettings({ callHistory: updatedHistory });
  
  return newCall;
}

export function updateCallDuration(callId: string, duration: number, participants?: string[]): void {
  const current = getSettings();
  const updatedHistory = current.callHistory.map((call) => 
    call.id === callId ? { ...call, duration, participants } : call
  );
  saveSettings({ callHistory: updatedHistory });
}

export function clearCallHistory(): void {
  saveSettings({ callHistory: [] });
}

export function getVideoConstraints(quality: '720p' | '1080p'): MediaTrackConstraints {
  if (quality === '720p') {
    return {
      width: { ideal: 1280, min: 640 },
      height: { ideal: 720, min: 480 },
      frameRate: { ideal: 30, min: 24 },
      facingMode: 'user',
    };
  }
  return {
    width: { ideal: 1920, min: 1280 },
    height: { ideal: 1080, min: 720 },
    frameRate: { ideal: 60, min: 30 },
    facingMode: 'user',
  };
}

export function getAudioConstraints(): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 2,
  };
}
