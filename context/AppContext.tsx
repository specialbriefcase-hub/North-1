
import React, { createContext, useContext, useState, useEffect, ReactNode, PropsWithChildren } from 'react';
import { UserProfile, JournalEntry, AppSettings, AppTheme, Goal, Language } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  user: UserProfile | null;
  entries: JournalEntry[];
  settings: AppSettings;
  goals: Goal[];
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  completeOnboarding: (analysis: string, statement: string) => void;
  addEntry: (entry: JournalEntry) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  // Goal methods
  addGoalSuggestions: (newGoals: Omit<Goal, 'id' | 'createdAt' | 'status' | 'isAiGenerated'>[]) => void;
  approveGoal: (id: string) => void;
  discardGoal: (id: string) => void;
  toggleGoalCompletion: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Storage Keys
const KEY_USERS = 'app_users';
const KEY_PREFIX_ENTRIES = 'entries_';
const KEY_PREFIX_SETTINGS = 'settings_';
const KEY_PREFIX_GOALS = 'goals_';

// Seed User Data
const SEED_EMAIL = 'eloygarcia@waldendos.edu.mx';
const SEED_USER = {
  username: 'Eloy Garcia',
  email: SEED_EMAIL,
  password: '123',
  onboardingComplete: true,
  purposeAnalysis: "Eres una persona profundamente comprometida con el bienestar de los demás. Tu sentido se deriva de la conexión humana y el crecimiento compartido.",
  purposeStatement: "Guiar y crecer junto a otros con empatía."
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: AppTheme.LIGHT,
  fontSize: 'medium',
  language: 'es'
};

const SimpleUUID = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const AppProvider = ({ children }: PropsWithChildren) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [goals, setGoals] = useState<Goal[]>([]);

  // Initialize DB and Seed User if not exists
  useEffect(() => {
    const usersJson = localStorage.getItem(KEY_USERS);
    let users = usersJson ? JSON.parse(usersJson) : [];
    
    const seedExists = users.find((u: any) => u.email === SEED_EMAIL);
    if (!seedExists) {
      users.push(SEED_USER);
      localStorage.setItem(KEY_USERS, JSON.stringify(users));
    }
  }, []);

  // Load user data when user changes
  useEffect(() => {
    if (user) {
      // Load Entries
      const storedEntries = localStorage.getItem(KEY_PREFIX_ENTRIES + user.email);
      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      } else {
        setEntries([]);
      }

      // Load Goals
      const storedGoals = localStorage.getItem(KEY_PREFIX_GOALS + user.email);
      if (storedGoals) {
        setGoals(JSON.parse(storedGoals));
      } else {
        setGoals([]);
      }

      // Load Settings
      const storedSettings = localStorage.getItem(KEY_PREFIX_SETTINGS + user.email);
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        // Migration: Ensure language exists in old settings
        if (!parsed.language) parsed.language = 'es';
        setSettings(parsed);
        // Apply theme immediately
        if (parsed.theme === AppTheme.DARK) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } else {
        setSettings(DEFAULT_SETTINGS);
        document.documentElement.classList.remove('dark');
      }
    } else {
        setEntries([]);
        setGoals([]);
        setSettings(DEFAULT_SETTINGS);
    }
  }, [user]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const usersJson = localStorage.getItem(KEY_USERS);
    const users = usersJson ? JSON.parse(usersJson) : [];
    
    const foundUser = users.find((u: any) => u.email === email && u.password === password);
    
    if (foundUser) {
      const { password, ...safeUser } = foundUser;
      setUser(safeUser);
      return true;
    }
    return false;
  };

  const register = async (username: string, email: string, password: string): Promise<boolean> => {
    const usersJson = localStorage.getItem(KEY_USERS);
    const users = usersJson ? JSON.parse(usersJson) : [];
    
    if (users.find((u: any) => u.email === email)) {
      return false; // User exists
    }

    const newUser = {
      username,
      email,
      password,
      onboardingComplete: false,
    };

    users.push(newUser);
    localStorage.setItem(KEY_USERS, JSON.stringify(users));
    
    const { password: _, ...safeUser } = newUser;
    setUser(safeUser);
    
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const completeOnboarding = (analysis: string, statement: string) => {
    if (!user) return;
    
    const updatedUser = { ...user, onboardingComplete: true, purposeAnalysis: analysis, purposeStatement: statement };
    setUser(updatedUser);

    const usersJson = localStorage.getItem(KEY_USERS);
    const users = usersJson ? JSON.parse(usersJson) : [];
    const idx = users.findIndex((u: any) => u.email === user.email);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updatedUser, password: users[idx].password }; 
      localStorage.setItem(KEY_USERS, JSON.stringify(users));
    }
  };

  const addEntry = (entry: JournalEntry) => {
    if (!user) return;
    const newEntries = [entry, ...entries];
    setEntries(newEntries);
    localStorage.setItem(KEY_PREFIX_ENTRIES + user.email, JSON.stringify(newEntries));
  };

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    if (!user) return;
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(KEY_PREFIX_SETTINGS + user.email, JSON.stringify(updated));

    if (updated.theme === AppTheme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // --- Goal Functions ---
  const persistGoals = (newGoals: Goal[]) => {
    if (!user) return;
    setGoals(newGoals);
    localStorage.setItem(KEY_PREFIX_GOALS + user.email, JSON.stringify(newGoals));
  };

  const addGoalSuggestions = (suggestions: Omit<Goal, 'id' | 'createdAt' | 'status' | 'isAiGenerated'>[]) => {
    const newGoals: Goal[] = suggestions.map(s => ({
        ...s,
        id: SimpleUUID(),
        createdAt: Date.now(),
        status: 'suggested',
        isAiGenerated: true
    }));
    persistGoals([...goals, ...newGoals]);
  };

  const approveGoal = (id: string) => {
    const updated = goals.map(g => g.id === id ? { ...g, status: 'active' as const } : g);
    persistGoals(updated);
  };

  const discardGoal = (id: string) => {
    const updated = goals.filter(g => g.id !== id);
    persistGoals(updated);
  };

  const toggleGoalCompletion = (id: string) => {
    const updated = goals.map(g => {
        if (g.id === id) {
            return { ...g, status: (g.status === 'completed' ? 'active' : 'completed') as any };
        }
        return g;
    });
    persistGoals(updated);
  };

  return (
    <AppContext.Provider value={{ 
        user, entries, settings, goals,
        login, register, logout, completeOnboarding, addEntry, updateSettings,
        addGoalSuggestions, approveGoal, discardGoal, toggleGoalCompletion
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
