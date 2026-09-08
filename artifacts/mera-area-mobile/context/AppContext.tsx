import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'hi';
export type Category =
  | 'Jobs'
  | 'Education'
  | 'Lost & Found'
  | 'Local Services'
  | 'Health'
  | 'Government Schemes'
  | 'Buy / Sell'
  | 'Emergency'
  | 'Other';

export interface Answer {
  id: string;
  body: string;
  authorName: string;
  authorInitials: string;
  createdAt: string;
  helpfulCount: number;
  helpfulByMe: boolean;
  reported: boolean;
}

export interface Problem {
  id: string;
  title: string;
  body: string;
  category: Category;
  locality: string;
  city: string;
  authorId: string;
  authorName: string;
  authorInitials: string;
  createdAt: string;
  solved: boolean;
  answers: Answer[];
  imageUri?: string;
  voiceUri?: string;
  reported: boolean;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  initials: string;
  city: string;
  locality: string;
  points: number;
  streak: number;
  language: Language;
  badges: string[];
}

export interface Report {
  id: string;
  targetType: 'problem' | 'answer';
  targetId: string;
  reason: string;
  status: 'Open' | 'Reviewing' | 'Resolved';
  createdAt: string;
}

interface AppContextValue {
  hydrated: boolean;
  profile: Profile;
  problems: Problem[];
  reports: Report[];
  blockedUsers: string[];
  onboardingComplete: boolean;
  completeOnboarding: (input: { name: string; email: string; language: Language; city: string; locality: string }) => void;
  addProblem: (input: { title: string; body: string; category: Category; imageUri?: string; voiceUri?: string }) => void;
  addAnswer: (problemId: string, body: string) => void;
  toggleHelpful: (problemId: string, answerId: string) => void;
  markSolved: (problemId: string) => void;
  reportContent: (targetType: 'problem' | 'answer', targetId: string, reason: string) => void;
  blockUser: (userId: string) => void;
  updateProfile: (input: Partial<Pick<Profile, 'name' | 'city' | 'locality' | 'language'>>) => void;
  resetDemo: () => void;
}

const STORAGE_KEY = 'mera-area-demo-v1';

const seedProblems: Problem[] = [
  {
    id: 'problem-1',
    title: 'Need a reliable maths tutor near HSR Layout',
    body: 'Looking for a patient tutor for class 10 maths, preferably around Sector 2. Evening classes would work best.',
    category: 'Education',
    locality: 'HSR Layout',
    city: 'Bengaluru',
    authorId: 'user-ananya',
    authorName: 'Ananya S.',
    authorInitials: 'AS',
    createdAt: '20 min ago',
    solved: false,
    reported: false,
    answers: [
      {
        id: 'answer-1',
        body: 'Try Kavita Ma’am near the community park. She has helped three students from our lane and explains very clearly.',
        authorName: 'Rohit K.',
        authorInitials: 'RK',
        createdAt: '8 min ago',
        helpfulCount: 6,
        helpfulByMe: false,
        reported: false,
      },
    ],
  },
  {
    id: 'problem-2',
    title: 'Where can I register for the new e-Shram camp?',
    body: 'Does anyone know the dates and documents needed for the e-Shram registration camp in our area?',
    category: 'Government Schemes',
    locality: 'HSR Layout',
    city: 'Bengaluru',
    authorId: 'user-priya',
    authorName: 'Priya M.',
    authorInitials: 'PM',
    createdAt: '1 hr ago',
    solved: true,
    reported: false,
    answers: [
      {
        id: 'answer-2',
        body: 'The camp is at the BBMP office on 14 March. Aadhaar and bank details are enough. Sharing the notice with the ward volunteer helped me.',
        authorName: 'Vikram N.',
        authorInitials: 'VN',
        createdAt: '42 min ago',
        helpfulCount: 14,
        helpfulByMe: true,
        reported: false,
      },
    ],
  },
  {
    id: 'problem-3',
    title: 'Found a set of keys outside the metro entrance',
    body: 'Found three keys on a blue ring around 7:30 pm today near HSR BDA Complex. Message me with a description to collect them.',
    category: 'Lost & Found',
    locality: 'HSR Layout',
    city: 'Bengaluru',
    authorId: 'user-meera',
    authorName: 'Meera P.',
    authorInitials: 'MP',
    createdAt: '2 hrs ago',
    solved: false,
    reported: false,
    answers: [],
  },
  {
    id: 'problem-4',
    title: 'Affordable electrician who can come today?',
    body: 'Our kitchen switchboard is sparking. Looking for a safe, local electrician available this afternoon.',
    category: 'Local Services',
    locality: 'HSR Layout',
    city: 'Bengaluru',
    authorId: 'user-arjun',
    authorName: 'Arjun P.',
    authorInitials: 'AP',
    createdAt: '3 hrs ago',
    solved: false,
    reported: false,
    answers: [
      {
        id: 'answer-4',
        body: 'Call Suresh Electricals on 98XX XX12. He is near 27th Main and usually reaches within an hour.',
        authorName: 'Deepa R.',
        authorInitials: 'DR',
        createdAt: '2 hrs ago',
        helpfulCount: 9,
        helpfulByMe: false,
        reported: false,
      },
    ],
  },
  {
    id: 'problem-5',
    title: 'Free health check-up camp this Sunday',
    body: 'Sharing for neighbours: free BP, sugar and eye check-up at the ward library from 9 am to 1 pm.',
    category: 'Health',
    locality: 'HSR Layout',
    city: 'Bengaluru',
    authorId: 'user-sana',
    authorName: 'Sana Q.',
    authorInitials: 'SQ',
    createdAt: 'Yesterday',
    solved: false,
    reported: false,
    answers: [],
  },
];

const initialProfile: Profile = {
  id: 'me',
  name: 'Aarav Sharma',
  email: 'aarav@example.com',
  initials: 'AS',
  city: 'Bengaluru',
  locality: 'HSR Layout',
  points: 248,
  streak: 6,
  language: 'en',
  badges: ['First Helper', '5 Answers', 'Local Hero'],
};

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

const getEarnedBadges = (profile: Profile, problems: Problem[]) => {
  const answers = problems.reduce((count, problem) => count + problem.answers.filter((answer) => answer.authorName === profile.name).length, 0);
  const solved = problems.filter((problem) => problem.authorId === profile.id && problem.solved).length;
  const badges = new Set(profile.badges);
  if (answers >= 1) badges.add('First Helper');
  if (answers >= 5) badges.add('5 Answers');
  if (solved >= 10) badges.add('10 Solved');
  if (profile.points >= 200) badges.add('Local Hero');
  if (profile.streak >= 7) badges.add('7-Day Streak');
  return Array.from(badges);
};

const makeSnapshot = (value: Pick<AppContextValue, 'profile' | 'problems' | 'reports' | 'blockedUsers' | 'onboardingComplete'>) =>
  JSON.stringify(value);

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [problems, setProblems] = useState<Problem[]>(seedProblems);
  const [reports, setReports] = useState<Report[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Pick<AppContextValue, 'profile' | 'problems' | 'reports' | 'blockedUsers' | 'onboardingComplete'>>;
        if (saved.profile) setProfile(saved.profile);
        if (saved.problems) setProblems(saved.problems);
        if (saved.reports) setReports(saved.reports);
        if (saved.blockedUsers) setBlockedUsers(saved.blockedUsers);
        if (saved.onboardingComplete !== undefined) setOnboardingComplete(saved.onboardingComplete);
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(
      STORAGE_KEY,
      makeSnapshot({ profile, problems, reports, blockedUsers, onboardingComplete }),
    ).catch(() => undefined);
  }, [blockedUsers, hydrated, onboardingComplete, problems, profile, reports]);

  const completeOnboarding = (input: { name: string; email: string; language: Language; city: string; locality: string }) => {
    const nextProfile = {
      ...profile,
      name: input.name.trim() || profile.name,
      email: input.email.trim() || profile.email,
      initials: getInitials(input.name.trim() || profile.name),
      language: input.language,
      city: input.city.trim() || profile.city,
      locality: input.locality.trim() || profile.locality,
    };
    setProfile(nextProfile);
    setOnboardingComplete(true);
  };

  const addProblem = (input: { title: string; body: string; category: Category; imageUri?: string; voiceUri?: string }) => {
    const problem: Problem = {
      id: createId('problem'),
      title: input.title.trim(),
      body: input.body.trim(),
      category: input.category,
      locality: profile.locality,
      city: profile.city,
      authorId: profile.id,
      authorName: profile.name,
      authorInitials: profile.initials,
      createdAt: 'Just now',
      solved: false,
      answers: [],
      reported: false,
      imageUri: input.imageUri,
      voiceUri: input.voiceUri,
    };
    setProblems((current) => [problem, ...current]);
    setProfile((current) => ({ ...current, points: current.points + 10, badges: getEarnedBadges(current, [problem, ...problems]) }));
  };

  const addAnswer = (problemId: string, body: string) => {
    const answer: Answer = {
      id: createId('answer'),
      body: body.trim(),
      authorName: profile.name,
      authorInitials: profile.initials,
      createdAt: 'Just now',
      helpfulCount: 0,
      helpfulByMe: false,
      reported: false,
    };
    setProblems((current) => current.map((problem) => (problem.id === problemId ? { ...problem, answers: [...problem.answers, answer] } : problem)));
    setProfile((current) => {
      const next = { ...current, points: current.points + 15 };
      return { ...next, badges: getEarnedBadges(next, problems) };
    });
  };

  const toggleHelpful = (problemId: string, answerId: string) => {
    setProblems((current) =>
      current.map((problem) =>
        problem.id === problemId
          ? {
              ...problem,
              answers: problem.answers.map((answer) =>
                answer.id === answerId
                  ? { ...answer, helpfulByMe: !answer.helpfulByMe, helpfulCount: answer.helpfulCount + (answer.helpfulByMe ? -1 : 1) }
                  : answer,
              ),
            }
          : problem,
      ),
    );
    const answer = problems.find((problem) => problem.id === problemId)?.answers.find((item) => item.id === answerId);
    if (answer && !answer.helpfulByMe) setProfile((current) => ({ ...current, points: current.points + 5 }));
  };

  const markSolved = (problemId: string) => {
    setProblems((current) => current.map((problem) => (problem.id === problemId ? { ...problem, solved: true } : problem)));
    setProfile((current) => {
      const next = { ...current, points: current.points + 25 };
      return { ...next, badges: getEarnedBadges(next, problems) };
    });
  };

  const reportContent = (targetType: 'problem' | 'answer', targetId: string, reason: string) => {
    const report: Report = { id: createId('report'), targetType, targetId, reason, status: 'Open', createdAt: 'Just now' };
    setReports((current) => [report, ...current]);
    setProblems((current) =>
      current.map((problem) => ({
        ...problem,
        reported: targetType === 'problem' && problem.id === targetId ? true : problem.reported,
        answers: problem.answers.map((answer) => ({
          ...answer,
          reported: targetType === 'answer' && answer.id === targetId ? true : answer.reported,
        })),
      })),
    );
  };

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      profile,
      problems,
      reports,
      blockedUsers,
      onboardingComplete,
      completeOnboarding,
      addProblem,
      addAnswer,
      toggleHelpful,
      markSolved,
      reportContent,
      blockUser: (userId: string) => setBlockedUsers((current) => (current.includes(userId) ? current : [...current, userId])),
      updateProfile: (input) =>
        setProfile((current) => ({
          ...current,
          ...input,
          initials: input.name ? getInitials(input.name) : current.initials,
        })),
      resetDemo: () => {
        setProfile(initialProfile);
        setProblems(seedProblems);
        setReports([]);
        setBlockedUsers([]);
        setOnboardingComplete(false);
      },
    }),
    [blockedUsers, hydrated, onboardingComplete, problems, profile, reports],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
