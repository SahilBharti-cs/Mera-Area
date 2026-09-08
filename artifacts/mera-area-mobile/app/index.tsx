import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { Answer, Category, Language, Problem, useApp } from '@/context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const mascot = require('@/assets/images/icon.png');

const categories: { label: Category; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { label: 'Jobs', icon: 'briefcase-outline' },
  { label: 'Education', icon: 'school-outline' },
  { label: 'Lost & Found', icon: 'key-chain' },
  { label: 'Local Services', icon: 'tools' },
  { label: 'Health', icon: 'heart-pulse' },
  { label: 'Government Schemes', icon: 'bank-outline' },
  { label: 'Buy / Sell', icon: 'shopping-outline' },
  { label: 'Emergency', icon: 'alert-circle-outline' },
  { label: 'Other', icon: 'dots-horizontal' },
];

type Screen = 'home' | 'leaderboard' | 'profile' | 'moderation';

function initialsColor(initials: string, colors: ReturnType<typeof useColors>) {
  const first = initials.charCodeAt(0) || 0;
  return [colors.primary, colors.coral, colors.lavender, colors.warning][first % 4];
}

function Avatar({ initials, size = 42 }: { initials: string; size?: number }) {
  const colors = useColors();
  return (
    <View accessible accessibilityLabel={`Avatar for ${initials}`} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: initialsColor(initials, colors) }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>{initials}</Text>
    </View>
  );
}

function IconButton({ name, onPress, label, color, size = 22 }: { name: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; color: string; size?: number }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

function PillButton({ label, onPress, icon, active = false }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; active?: boolean }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.pill, { backgroundColor: active ? colors.primary : colors.secondary, borderColor: active ? colors.primary : colors.border }, pressed && styles.pressed]}>
      {icon ? <Ionicons name={icon} size={15} color={active ? colors.primaryForeground : colors.secondaryForeground} /> : null}
      <Text style={[styles.pillText, { color: active ? colors.primaryForeground : colors.secondaryForeground }]}>{label}</Text>
    </Pressable>
  );
}

function EmptyState({ title, body, icon = 'leaf-outline' }: { title: string; body: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>{body}</Text>
    </View>
  );
}

function ProblemCard({ problem, onPress }: { problem: Problem; onPress: () => void }) {
  const colors = useColors();
  const category = categories.find((item) => item.label === problem.category);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open problem: ${problem.title}`} onPress={onPress} style={({ pressed }) => [styles.problemCard, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.cardPressed]}>
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          <Avatar initials={problem.authorInitials} size={34} />
          <View style={styles.authorBlock}>
            <Text style={[styles.authorName, { color: colors.foreground }]}>{problem.authorName}</Text>
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{problem.locality} · {problem.createdAt}</Text>
          </View>
        </View>
        <View style={[styles.categoryDot, { backgroundColor: colors.secondary }]}>
          <MaterialCommunityIcons name={category?.icon ?? 'dots-horizontal'} size={17} color={colors.primary} />
        </View>
      </View>
      <Text style={[styles.problemTitle, { color: colors.foreground }]}>{problem.title}</Text>
      <Text style={[styles.problemBody, { color: colors.mutedForeground }]} numberOfLines={2}>{problem.body}</Text>
      <View style={styles.rowBetween}>
        <View style={styles.rowGap}>
          <View style={[styles.categoryTag, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.categoryTagText, { color: colors.secondaryForeground }]}>{problem.category}</Text>
          </View>
          {problem.solved ? (
            <View style={[styles.solvedTag, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primaryForeground} />
              <Text style={styles.solvedText}>Solved</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.rowGap}>
          <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.mutedForeground} />
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{problem.answers.length}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function BottomNav({ active, onChange }: { active: Screen; onChange: (screen: Screen) => void }) {
  const colors = useColors();
  const items: { screen: Screen; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { screen: 'home', label: 'Home', icon: 'home-outline' },
    { screen: 'leaderboard', label: 'Leaderboard', icon: 'trophy-outline' },
    { screen: 'profile', label: 'Profile', icon: 'person-outline' },
  ];
  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === 'web' ? 34 : 8 }]}>
      {items.map((item) => {
        const isActive = active === item.screen;
        return (
          <Pressable key={item.screen} accessibilityRole="tab" accessibilityState={{ selected: isActive }} accessibilityLabel={item.label} onPress={() => onChange(item.screen)} style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}>
            <Ionicons name={isActive ? item.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap : item.icon} size={23} color={isActive ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.navLabel, { color: isActive ? colors.primary : colors.mutedForeground }]}>{item.label}</Text>
          </Pressable>
        );
      })}
      <Pressable accessibilityRole="button" accessibilityLabel="Share a problem" onPress={() => onChange('home')} style={({ pressed }) => [styles.navCreate, { backgroundColor: colors.accent }, pressed && styles.pressed]}>
        <Ionicons name="add" size={26} color={colors.accentForeground} />
      </Pressable>
    </View>
  );
}

function Onboarding() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  const [language, setLanguage] = useState<Language>('en');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [locality, setLocality] = useState('HSR Layout');
  const [error, setError] = useState('');
  const copy = language === 'hi' ? { eyebrow: 'आपके मोहल्ले की आवाज़', title: 'मदद यहाँ से शुरू होती है', sub: 'अपने इलाके में सवाल पूछें, जवाब दें और साथ मिलकर बदलाव लाएँ।', name: 'आपका नाम', email: 'ईमेल', password: 'पासवर्ड', city: 'शहर', locality: 'इलाका', cta: 'शुरू करें', note: 'डेमो मोड · डेटा इस डिवाइस पर सेव रहेगा' } : { eyebrow: 'YOUR LOCAL COMMUNITY', title: 'Good things happen nearby', sub: 'Ask for help, share what you know, and make your locality a little better every day.', name: 'Your name', email: 'Email address', password: 'Password', city: 'City', locality: 'Locality', cta: 'Enter Mera Area', note: 'Demo mode · your data stays on this device' };
  const submit = () => {
    if (!name.trim() || !email.includes('@') || password.length < 4 || !locality.trim()) {
      setError(language === 'hi' ? 'कृपया सभी जानकारी सही से भरें।' : 'Please fill your name, a valid email, password, and locality.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    completeOnboarding({ name, email, language, city, locality });
  };
  return (
    <KeyboardAwareScrollViewCompat style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={[styles.onboardingContent, { paddingTop: insets.top + 22, paddingBottom: insets.bottom + 30 }]} bottomOffset={30} keyboardShouldPersistTaps="handled">
      <View style={styles.brandMark}>
        <Image source={mascot} style={styles.mascot} />
        <Text style={[styles.brandName, { color: colors.foreground }]}>mera <Text style={{ color: colors.primary }}>area</Text></Text>
      </View>
      <View style={styles.languageSwitch}>
        <PillButton label="English" onPress={() => setLanguage('en')} active={language === 'en'} />
        <PillButton label="हिन्दी" onPress={() => setLanguage('hi')} active={language === 'hi'} />
      </View>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>{copy.eyebrow}</Text>
      <Text style={[styles.heroTitle, { color: colors.foreground }]}>{copy.title}</Text>
      <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>{copy.sub}</Text>
      <View style={styles.formStack}>
        <Field label={copy.name} value={name} onChangeText={setName} placeholder="Aarav Sharma" />
        <Field label={copy.email} value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label={copy.password} value={password} onChangeText={setPassword} placeholder="4+ characters" secureTextEntry />
        <View style={styles.twoFields}>
          <View style={styles.flexField}><Field label={copy.city} value={city} onChangeText={setCity} placeholder="Bengaluru" /></View>
          <View style={styles.flexField}><Field label={copy.locality} value={locality} onChangeText={setLocality} placeholder="HSR Layout" /></View>
        </View>
      </View>
      {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
      <Pressable testID="onboarding-submit" accessibilityRole="button" accessibilityLabel={copy.cta} onPress={submit} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
        <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{copy.cta}</Text>
        <Ionicons name="arrow-forward" size={19} color={colors.primaryForeground} />
      </Pressable>
      <Text style={[styles.demoNote, { color: colors.mutedForeground }]}><Ionicons name="shield-checkmark-outline" size={13} color={colors.success} /> {copy.note}</Text>
      <Text style={[styles.otpNote, { color: colors.mutedForeground }]}>Phone OTP can be added when Supabase auth is connected.</Text>
    </KeyboardAwareScrollViewCompat>
  );
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize = 'sentences', multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; secureTextEntry?: boolean; keyboardType?: 'default' | 'email-address'; autoCapitalize?: 'none' | 'sentences'; multiline?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: colors.secondaryForeground }]}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize} multiline={multiline} style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }, multiline && styles.multilineInput]} />
    </View>
  );
}

function Home({ onOpenProblem, onNewProblem, onProfile }: { onOpenProblem: (problem: Problem) => void; onNewProblem: () => void; onProfile: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, problems, blockedUsers } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [refreshing, setRefreshing] = useState(false);
  const filteredProblems = useMemo(
    () => problems.filter((problem) => problem.locality === profile.locality && !blockedUsers.includes(problem.authorId)).filter((problem) => category === 'All' || problem.category === category).filter((problem) => `${problem.title} ${problem.body}`.toLowerCase().includes(search.toLowerCase())),
    [blockedUsers, category, problems, profile.locality, search],
  );
  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 450);
  };
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />} contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={[styles.smallGreeting, { color: colors.mutedForeground }]}>Good morning, {profile.name.split(' ')[0]}</Text>
            <View style={styles.rowGap}><Ionicons name="location-outline" size={15} color={colors.primary} /><Text style={[styles.locationText, { color: colors.foreground }]}>{profile.locality}, {profile.city}</Text></View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={onProfile} style={({ pressed }) => [pressed && styles.pressed]}>
            <View style={styles.profileBubble}><Avatar initials={profile.initials} size={42} /><View style={[styles.onlineDot, { backgroundColor: colors.success, borderColor: colors.background }]} /></View>
          </Pressable>
        </View>
        <View style={styles.pointsRow}>
          <View style={styles.rowGap}><Ionicons name="sparkles-outline" size={15} color={colors.accentForeground} /><Text style={[styles.pointsText, { color: colors.accentForeground }]}>{profile.points} points</Text></View>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{profile.streak} day streak</Text>
        </View>
        <LinearGradient colors={[colors.primary, colors.lavender]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <View style={styles.heroBadge}><Text style={styles.heroBadgeText}>BOLO BUDDY</Text></View>
            <Text style={styles.heroCardTitle}>What’s on your mind?</Text>
            <Text style={styles.heroCardBody}>A small question can start a big chain of help.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Share a problem" onPress={onNewProblem} style={({ pressed }) => [styles.heroCta, pressed && styles.pressed]}><Text style={[styles.heroCtaText, { color: colors.primary }]}>{'Share a problem'} <Ionicons name="arrow-forward" size={15} color={colors.primary} /></Text></Pressable>
          </View>
          <Image source={mascot} style={styles.heroMascot} />
        </LinearGradient>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="search" size={19} color={colors.mutedForeground} /><TextInput accessibilityLabel="Search local problems" value={search} onChangeText={setSearch} placeholder="Search your area" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} /></View>
          <IconButton name="options-outline" label="Filter problems" color={colors.primary} onPress={() => Alert.alert('Filters', 'Use the category chips below to narrow the feed.')} />
        </View>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Explore your area</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          <PillButton label="All" icon="grid-outline" onPress={() => setCategory('All')} active={category === 'All'} />
          {categories.map((item) => <PillButton key={item.label} label={item.label} onPress={() => setCategory(item.label)} active={category === item.label} />)}
        </ScrollView>
        <View style={[styles.sectionHeader, { marginTop: 22 }]}><Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Around you</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{filteredProblems.length} posts</Text></View>
        <View style={styles.feed}>
          {filteredProblems.length ? filteredProblems.map((problem) => <ProblemCard key={problem.id} problem={problem} onPress={() => onOpenProblem(problem)} />) : <EmptyState title="No posts found" body="Try another search or be the first neighbor to ask." icon="search-outline" />}
        </View>
      </ScrollView>
    </View>
  );
}

function Detail({ problem, onBack }: { problem: Problem; onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, addAnswer, markSolved, reportContent, blockUser } = useApp();
  const [answer, setAnswer] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const { toggleHelpful } = useApp();
  const submitAnswer = () => {
    if (!answer.trim()) return;
    addAnswer(problem.id, answer);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    setAnswer('');
    Keyboard.dismiss();
  };
  const reportProblem = () => {
    setShowOptions(false);
    Alert.alert('Report this post', 'Why are you reporting it?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Spam or misleading', onPress: () => reportContent('problem', problem.id, 'Spam or misleading') },
      { text: 'Something else', onPress: () => reportContent('problem', problem.id, 'Something else') },
    ]);
  };
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10, paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.rowBetween}>
          <IconButton name="arrow-back" label="Go back" color={colors.foreground} onPress={onBack} />
          <View style={styles.rowGap}><Ionicons name="location-outline" size={15} color={colors.primary} /><Text style={[styles.meta, { color: colors.mutedForeground }]}>{problem.locality}</Text><IconButton name="ellipsis-horizontal" label="More options" color={colors.foreground} onPress={() => setShowOptions(true)} /></View>
        </View>
        <View style={[styles.detailHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rowBetween}><View style={[styles.categoryTag, { backgroundColor: colors.secondary }]}><Text style={[styles.categoryTagText, { color: colors.secondaryForeground }]}>{problem.category}</Text></View>{problem.solved ? <View style={[styles.solvedTag, { backgroundColor: colors.success }]}><Ionicons name="checkmark-circle" size={14} color={colors.primaryForeground} /><Text style={styles.solvedText}>Solved</Text></View> : null}</View>
          <Text style={[styles.detailTitle, { color: colors.foreground }]}>{problem.title}</Text>
          <Text style={[styles.detailBody, { color: colors.mutedForeground }]}>{problem.body}</Text>
          <View style={[styles.row, { marginTop: 18 }]}><Avatar initials={problem.authorInitials} size={36} /><View style={styles.authorBlock}><Text style={[styles.authorName, { color: colors.foreground }]}>{problem.authorName}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{problem.createdAt} · {problem.city}</Text></View></View>
          {problem.imageUri ? <Image source={{ uri: problem.imageUri }} style={styles.problemImage} /> : null}
          {problem.voiceUri ? <View style={[styles.voiceNote, { backgroundColor: colors.secondary }]}><Ionicons name="mic" size={17} color={colors.primary} /><Text style={[styles.meta, { color: colors.secondaryForeground }]}>Voice note attached</Text></View> : null}
        </View>
        {!problem.solved && problem.authorId === profile.id ? <Pressable accessibilityRole="button" accessibilityLabel="Mark problem as solved" onPress={() => { markSolved(problem.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined); }} style={({ pressed }) => [styles.solveButton, { backgroundColor: colors.secondary, borderColor: colors.primary }, pressed && styles.pressed]}><Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} /><Text style={[styles.solveButtonText, { color: colors.primary }]}>I found the solution</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>+25 pts</Text></Pressable> : null}
        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>{problem.answers.length} helpful answers</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>Be kind · Be useful</Text></View>
        <View style={styles.answerList}>
          {problem.answers.length ? problem.answers.map((item) => <AnswerCard key={item.id} answer={item} problemId={problem.id} onHelpful={() => toggleHelpful(problem.id, item.id)} onReport={() => reportContent('answer', item.id, 'Community report')} />) : <EmptyState title="No answers yet" body="Know something useful? Your local knowledge could help." icon="chatbubble-ellipses-outline" />}
        </View>
      </ScrollView>
      <View style={[styles.answerComposer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 8 }]}>
        <Avatar initials={profile.initials} size={34} />
        <TextInput accessibilityLabel="Write an answer" value={answer} onChangeText={setAnswer} placeholder="Share what you know..." placeholderTextColor={colors.mutedForeground} style={[styles.composerInput, { backgroundColor: colors.secondary, color: colors.foreground }]} multiline />
        <Pressable testID="answer-submit" accessibilityRole="button" accessibilityLabel="Submit answer" onPress={submitAnswer} style={({ pressed }) => [styles.sendButton, { backgroundColor: answer.trim() ? colors.primary : colors.muted }, pressed && styles.pressed]}><Ionicons name="arrow-up" size={20} color={answer.trim() ? colors.primaryForeground : colors.mutedForeground} /></Pressable>
      </View>
      <Modal visible={showOptions} transparent animationType="fade" onRequestClose={() => setShowOptions(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowOptions(false)}>
          <View style={[styles.optionsCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Post options</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Report post" onPress={reportProblem} style={styles.optionRow}><Ionicons name="flag-outline" size={20} color={colors.destructive} /><Text style={[styles.optionText, { color: colors.foreground }]}>Report post</Text></Pressable>
            {problem.authorId !== profile.id ? <Pressable accessibilityRole="button" accessibilityLabel="Block user" onPress={() => { setShowOptions(false); blockUser(problem.authorId); onBack(); }} style={styles.optionRow}><Ionicons name="person-remove-outline" size={20} color={colors.destructive} /><Text style={[styles.optionText, { color: colors.foreground }]}>Block {problem.authorName}</Text></Pressable> : null}
            <Pressable accessibilityRole="button" accessibilityLabel="Close post options" onPress={() => setShowOptions(false)} style={styles.optionRow}><Ionicons name="close" size={20} color={colors.mutedForeground} /><Text style={[styles.optionText, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function AnswerCard({ answer, problemId: _problemId, onHelpful, onReport }: { answer: Answer; problemId: string; onHelpful: () => void; onReport: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.answerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.rowBetween}><View style={styles.row}><Avatar initials={answer.authorInitials} size={32} /><View style={styles.authorBlock}><Text style={[styles.authorName, { color: colors.foreground }]}>{answer.authorName}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{answer.createdAt}</Text></View></View><IconButton name="flag-outline" label="Report answer" color={colors.mutedForeground} onPress={onReport} size={18} /></View>
      <Text style={[styles.answerBody, { color: colors.foreground }]}>{answer.body}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Mark answer helpful" onPress={onHelpful} style={({ pressed }) => [styles.helpfulButton, { backgroundColor: answer.helpfulByMe ? colors.secondary : colors.background }, pressed && styles.pressed]}><Ionicons name={answer.helpfulByMe ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={answer.helpfulByMe ? colors.primary : colors.mutedForeground} /><Text style={[styles.meta, { color: answer.helpfulByMe ? colors.primary : colors.mutedForeground }]}>{answer.helpfulCount} found this helpful</Text></Pressable>
    </View>
  );
}

function CreateProblem({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addProblem } = useApp();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<Category>('Other');
  const [imageUri, setImageUri] = useState<string>();
  const [voiceUri, setVoiceUri] = useState<string>();
  const [recording, setRecording] = useState<Audio.Recording>();
  const [error, setError] = useState('');
  const chooseImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Photo permission needed', 'Allow photo access to attach an image to your post.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0]?.uri);
  };
  const toggleRecording = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      setVoiceUri(recording.getURI() ?? undefined);
      setRecording(undefined);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      return;
    }
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) { Alert.alert('Microphone permission needed', 'Allow microphone access to add a short voice note.'); return; }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const next = new Audio.Recording();
    await next.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await next.startAsync();
    setRecording(next);
  };
  const submit = () => {
    if (title.trim().length < 8 || body.trim().length < 12) { setError('Add a clear title and a little more detail so neighbors can help.'); return; }
    addProblem({ title, body, category, imageUri, voiceUri });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onCreated();
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalScreen, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
          <IconButton name="close" label="Close new post" color={colors.foreground} onPress={onClose} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Share with your area</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Publish problem" onPress={submit}><Text style={[styles.publishText, { color: colors.primary }]}>Post</Text></Pressable>
        </View>
        <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 25 }]} bottomOffset={80} keyboardShouldPersistTaps="handled">
          <View style={[styles.tipCard, { backgroundColor: colors.secondary }]}><Image source={mascot} style={styles.tipMascot} /><Text style={[styles.tipText, { color: colors.secondaryForeground }]}>Bolo Buddy tip: include your locality and what kind of help you need.</Text></View>
          <Field label="What do you need help with?" value={title} onChangeText={setTitle} placeholder="e.g. Need a maths tutor near..." />
          <Field label="Tell your neighbors a little more" value={body} onChangeText={setBody} placeholder="Add useful details, dates, landmarks..." multiline />
          <Text style={[styles.fieldLabel, { color: colors.secondaryForeground, marginTop: 6 }]}>Choose a category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>{categories.map((item) => <PillButton key={item.label} label={item.label} onPress={() => setCategory(item.label)} active={category === item.label} />)}</ScrollView>
          <View style={styles.attachRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Attach a photo" onPress={chooseImage} style={({ pressed }) => [styles.attachButton, { borderColor: colors.border, backgroundColor: colors.card }, pressed && styles.pressed]}><Ionicons name="image-outline" size={20} color={colors.primary} /><Text style={[styles.attachText, { color: colors.foreground }]}>{imageUri ? 'Photo attached' : 'Add photo'}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={recording ? 'Stop voice recording' : 'Record a voice note'} onPress={toggleRecording} style={({ pressed }) => [styles.attachButton, { borderColor: recording ? colors.coral : colors.border, backgroundColor: recording ? colors.secondary : colors.card }, pressed && styles.pressed]}><Ionicons name={recording ? 'stop-circle-outline' : 'mic-outline'} size={20} color={recording ? colors.coral : colors.primary} /><Text style={[styles.attachText, { color: colors.foreground }]}>{recording ? 'Recording…' : voiceUri ? 'Voice attached' : 'Voice note'}</Text></Pressable>
          </View>
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : null}
          {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
          <Text style={[styles.demoNote, { color: colors.mutedForeground }]}><Ionicons name="lock-closed-outline" size={13} color={colors.success} /> Stored locally in demo mode. You can connect Supabase later.</Text>
        </KeyboardAwareScrollViewCompat>
      </View>
    </Modal>
  );
}

function Leaderboard() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const people = [
    { name: 'Vikram N.', initials: 'VN', points: 642, badge: 'Local Hero' },
    { name: profile.name, initials: profile.initials, points: profile.points, badge: 'You' },
    { name: 'Meera P.', initials: 'MP', points: 205, badge: 'First Helper' },
    { name: 'Arjun P.', initials: 'AP', points: 188, badge: '5 Answers' },
    { name: 'Sana Q.', initials: 'SQ', points: 156, badge: 'First Helper' },
  ].sort((a, b) => b.points - a.points);
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 14, paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>HSR LAYOUT · THIS MONTH</Text>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Local heroes</Text>
        <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Every answer makes our neighborhood stronger.</Text>
        <LinearGradient colors={[colors.accent, colors.coral]} style={styles.leaderHero}>
          <Ionicons name="trophy" size={32} color={colors.accentForeground} />
          <Text style={[styles.leaderHeroTitle, { color: colors.accentForeground }]}>Help more, climb higher</Text>
          <Text style={[styles.leaderHeroSub, { color: colors.accentForeground }]}>You are {Math.max(1, people.findIndex((person) => person.name === profile.name) + 1)}th in your locality.</Text>
        </LinearGradient>
        <View style={styles.leaderList}>
          {people.map((person, index) => <View key={`${person.name}-${index}`} style={[styles.leaderRow, { backgroundColor: person.name === profile.name ? colors.secondary : colors.card, borderColor: person.name === profile.name ? colors.primary : colors.border }]}><Text style={[styles.rank, { color: index === 0 ? colors.accentForeground : colors.mutedForeground }]}>{index + 1}</Text><Avatar initials={person.initials} size={40} /><View style={styles.leaderPerson}><Text style={[styles.authorName, { color: colors.foreground }]}>{person.name}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{person.badge}</Text></View><Text style={[styles.leaderPoints, { color: colors.primary }]}>{person.points}</Text></View>)}
        </View>
        <View style={[styles.rewardCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="sparkles-outline" size={22} color={colors.primary} /><View style={styles.flexField}><Text style={[styles.authorName, { color: colors.foreground }]}>Next badge: 7-Day Streak</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>Keep showing up for one more day.</Text></View><Text style={[styles.rewardCount, { color: colors.primary }]}>{profile.streak}/7</Text></View>
      </ScrollView>
    </View>
  );
}

function Profile({ onModeration }: { onModeration: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, problems, updateProfile, resetDemo } = useApp();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [locality, setLocality] = useState(profile.locality);
  const [city, setCity] = useState(profile.city);
  const mine = problems.filter((problem) => problem.authorId === profile.id);
  const save = () => { updateProfile({ name, locality, city }); setEditing(false); };
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 14, paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.rowBetween}><Text style={[styles.pageTitle, { color: colors.foreground, marginBottom: 0 }]}>Your profile</Text><IconButton name="settings-outline" label="Profile settings" color={colors.foreground} onPress={() => setEditing((value) => !value)} /></View>
        <View style={styles.profileHeader}><Avatar initials={profile.initials} size={78} /><Text style={[styles.profileName, { color: colors.foreground }]}>{profile.name}</Text><Text style={[styles.pageSub, { color: colors.mutedForeground }]}>{profile.locality}, {profile.city}</Text><View style={styles.profileStats}><Stat value={String(profile.points)} label="points" /><Stat value={String(mine.length)} label="posts" /><Stat value={`${profile.streak}d`} label="streak" /></View></View>
        {editing ? <View style={[styles.editCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Field label="Name" value={name} onChangeText={setName} /><Field label="City" value={city} onChangeText={setCity} /><Field label="Locality" value={locality} onChangeText={setLocality} /><Pressable accessibilityRole="button" accessibilityLabel="Save profile" onPress={save} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>Save changes</Text></Pressable></View> : null}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your badges</Text>
        <View style={styles.badgeGrid}>{['First Helper', '5 Answers', '10 Solved', 'Local Hero', '7-Day Streak'].map((badge) => { const earned = profile.badges.includes(badge); return <View key={badge} style={[styles.badgeCard, { backgroundColor: earned ? colors.card : colors.muted, borderColor: earned ? colors.accent : colors.border, opacity: earned ? 1 : 0.55 }]}><View style={[styles.badgeIcon, { backgroundColor: earned ? colors.accent : colors.border }]}><Ionicons name={earned ? 'ribbon-outline' : 'lock-closed-outline'} size={20} color={earned ? colors.accentForeground : colors.mutedForeground} /></View><Text style={[styles.badgeText, { color: colors.foreground }]}>{badge}</Text><Text style={[styles.badgeStatus, { color: earned ? colors.success : colors.mutedForeground }]}>{earned ? 'Earned' : 'Locked'}</Text></View>; })}</View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open moderation dashboard" onPress={onModeration} style={({ pressed }) => [styles.adminCard, { backgroundColor: colors.secondary }, pressed && styles.pressed]}><View style={[styles.adminIcon, { backgroundColor: colors.primary }]}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primaryForeground} /></View><View style={styles.flexField}><Text style={[styles.authorName, { color: colors.foreground }]}>Community care</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>Review reports and keep your area kind.</Text></View><Ionicons name="chevron-forward" size={20} color={colors.primary} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Reset demo data" onPress={() => Alert.alert('Reset demo?', 'This removes your local posts and returns to the welcome screen.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Reset', style: 'destructive', onPress: resetDemo }])} style={styles.resetButton}><Text style={[styles.meta, { color: colors.destructive }]}>Reset demo data</Text></Pressable>
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const colors = useColors();
  return <View style={styles.stat}><Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{label}</Text></View>;
}

function Moderation({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { reports } = useApp();
  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10, paddingBottom: 40 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.rowBetween}><IconButton name="arrow-back" label="Go back" color={colors.foreground} onPress={onBack} /><Text style={[styles.modalTitle, { color: colors.foreground }]}>Community care</Text><View style={{ width: 42 }} /></View>
        <View style={[styles.moderationHero, { backgroundColor: colors.secondary }]}><Ionicons name="shield-checkmark" size={26} color={colors.primary} /><Text style={[styles.detailTitle, { color: colors.foreground }]}>Keep Mera Area helpful</Text><Text style={[styles.pageSub, { color: colors.mutedForeground }]}>Reports are private and go to the community care team.</Text></View>
        <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>Reports</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{reports.length} open</Text></View>
        {reports.length ? reports.map((report) => <View key={report.id} style={[styles.reportRow, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.reportIcon, { backgroundColor: colors.muted }]}><Ionicons name="flag-outline" size={18} color={colors.destructive} /></View><View style={styles.flexField}><Text style={[styles.authorName, { color: colors.foreground }]}>{report.targetType === 'problem' ? 'Post' : 'Answer'} reported</Text><Text style={[styles.meta, { color: colors.mutedForeground }]}>{report.reason} · {report.createdAt}</Text></View><Text style={[styles.reportStatus, { color: colors.warning }]}>{report.status}</Text></View>) : <EmptyState title="All clear for now" body="No community reports need your attention." icon="shield-checkmark-outline" />}
        <Text style={[styles.privacyNote, { color: colors.mutedForeground }]}>Demo dashboard: Supabase moderation roles and RLS policies are documented in the project setup files.</Text>
      </ScrollView>
    </View>
  );
}

export default function Index() {
  const colors = useColors();
  const { hydrated, onboardingComplete } = useApp();
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedProblem, setSelectedProblem] = useState<Problem>();
  const [createOpen, setCreateOpen] = useState(false);
  const { problems } = useApp();
  useEffect(() => {
    if (selectedProblem) setSelectedProblem(problems.find((problem) => problem.id === selectedProblem.id));
  }, [problems, selectedProblem]);
  if (!hydrated) return <View style={[styles.loading, { backgroundColor: colors.background }]}><Image source={mascot} style={styles.loadingMascot} /><Text style={[styles.loadingText, { color: colors.foreground }]}>Getting your area ready…</Text></View>;
  if (!onboardingComplete) return <Onboarding />;
  if (selectedProblem) return <Detail problem={selectedProblem} onBack={() => setSelectedProblem(undefined)} />;
  if (screen === 'moderation') return <Moderation onBack={() => setScreen('profile')} />;
  return (
    <View style={{ flex: 1 }}>
      {screen === 'home' ? <Home onOpenProblem={setSelectedProblem} onNewProblem={() => setCreateOpen(true)} onProfile={() => setScreen('profile')} /> : screen === 'leaderboard' ? <Leaderboard /> : <Profile onModeration={() => setScreen('moderation')} />}
      <BottomNav active={screen} onChange={(next) => { if (next === 'home') { setSelectedProblem(undefined); setScreen('home'); } else setScreen(next); }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Create a new problem" onPress={() => setCreateOpen(true)} style={({ pressed }) => [styles.floatingCreate, { backgroundColor: colors.primary, bottom: Platform.OS === 'web' ? 86 : 76 }, pressed && styles.pressed]}><Ionicons name="add" size={26} color={colors.primaryForeground} /></Pressable>
      <CreateProblem onClose={() => setCreateOpen(false)} onCreated={() => setCreateOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingMascot: { width: 92, height: 92, borderRadius: 28 },
  loadingText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  scrollContent: { paddingHorizontal: 18 },
  onboardingContent: { paddingHorizontal: 22 },
  brandMark: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  mascot: { width: 48, height: 48, borderRadius: 16 },
  brandName: { fontFamily: 'Inter_700Bold', fontSize: 23, letterSpacing: -0.6 },
  languageSwitch: { flexDirection: 'row', gap: 8, marginBottom: 34 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.2, marginBottom: 10 },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 37, lineHeight: 43, letterSpacing: -1.4, maxWidth: 330 },
  heroSub: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, marginTop: 13, maxWidth: 340 },
  formStack: { gap: 12, marginTop: 28 },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  input: { minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 15, fontFamily: 'Inter_400Regular', fontSize: 15 },
  multilineInput: { minHeight: 110, textAlignVertical: 'top', paddingTop: 14 },
  twoFields: { flexDirection: 'row', gap: 10 },
  flexField: { flex: 1 },
  primaryButton: { minHeight: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 17 },
  primaryButtonText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, marginTop: 10 },
  demoNote: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 17 },
  otpNote: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center', marginTop: 7 },
  smallGreeting: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 4 },
  locationText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontFamily: 'Inter_700Bold' },
  authorBlock: { marginLeft: 9 },
  authorName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  meta: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  profileBubble: { position: 'relative' },
  onlineDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2, position: 'absolute', right: 0, bottom: 0 },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 16 },
  pointsText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  heroCard: { minHeight: 166, borderRadius: 24, padding: 20, overflow: 'hidden', flexDirection: 'row', marginBottom: 18 },
  heroCopy: { flex: 1, zIndex: 1 },
  heroBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.22)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, marginBottom: 12 },
  heroBadgeText: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  heroCardTitle: { color: '#ffffff', fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.6 },
  heroCardBody: { color: 'rgba(255,255,255,0.82)', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 6, maxWidth: 200 },
  heroCta: { alignSelf: 'flex-start', backgroundColor: '#ffffff', borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9, marginTop: 15 },
  heroCtaText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  heroMascot: { width: 130, height: 130, borderRadius: 38, position: 'absolute', right: -12, bottom: -12, opacity: 0.95 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchBox: { flex: 1, minHeight: 48, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13 },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: 'Inter_400Regular', fontSize: 14 },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, letterSpacing: -0.3, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 17, marginBottom: 12 },
  categoryScroll: { gap: 8, paddingRight: 16 },
  pill: { minHeight: 34, borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  pillText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  feed: { gap: 11 },
  problemCard: { borderRadius: 20, borderWidth: 1, padding: 15, gap: 11 },
  cardPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  categoryDot: { width: 31, height: 31, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  problemTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 22, letterSpacing: -0.2 },
  problemBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  categoryTag: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7 },
  categoryTagText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  solvedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 7 },
  solvedText: { color: '#ffffff', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 44, paddingHorizontal: 25 },
  emptyIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 5 },
  emptyBody: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  bottomNav: { height: 68, position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 50 },
  navItem: { alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 65 },
  navLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  navCreate: { width: 50, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', position: 'absolute', right: 18, top: -25, shadowColor: '#000000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  floatingCreate: { display: 'none', position: 'absolute', right: 16, width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.76 },
  detailHeader: { borderRadius: 22, borderWidth: 1, padding: 17, marginTop: 10, marginBottom: 12 },
  detailTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 30, letterSpacing: -0.8, marginTop: 16 },
  detailBody: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginTop: 10 },
  problemImage: { width: '100%', height: 180, borderRadius: 15, marginTop: 16 },
  voiceNote: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, marginTop: 12 },
  solveButton: { minHeight: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  solveButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, flex: 1 },
  answerList: { gap: 11 },
  answerCard: { borderRadius: 19, borderWidth: 1, padding: 14, gap: 12 },
  answerBody: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21 },
  helpfulButton: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10 },
  answerComposer: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingHorizontal: 13, paddingTop: 9, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  composerInput: { flex: 1, minHeight: 39, maxHeight: 90, borderRadius: 15, paddingHorizontal: 12, paddingVertical: 9, fontFamily: 'Inter_400Regular', fontSize: 13 },
  sendButton: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(14,34,28,0.38)', justifyContent: 'flex-end' },
  optionsCard: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 32, gap: 4 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  optionRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 13 },
  optionText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  modalScreen: { flex: 1 },
  modalHeader: { minHeight: 58, borderBottomWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  publishText: { fontFamily: 'Inter_700Bold', fontSize: 14, padding: 10 },
  formContent: { paddingHorizontal: 18, paddingTop: 18, gap: 15 },
  tipCard: { borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipMascot: { width: 40, height: 40, borderRadius: 13 },
  tipText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17 },
  attachRow: { flexDirection: 'row', gap: 10 },
  attachButton: { flex: 1, minHeight: 58, borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  attachText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  previewImage: { width: '100%', height: 170, borderRadius: 16 },
  pageTitle: { fontFamily: 'Inter_700Bold', fontSize: 30, letterSpacing: -0.8, marginBottom: 5 },
  pageSub: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 20 },
  leaderHero: { borderRadius: 22, padding: 19, marginTop: 22, marginBottom: 15, gap: 7 },
  leaderHeroTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5 },
  leaderHeroSub: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  leaderList: { gap: 9 },
  leaderRow: { borderRadius: 17, borderWidth: 1, minHeight: 66, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 20, fontFamily: 'Inter_700Bold', fontSize: 15, textAlign: 'center' },
  leaderPerson: { flex: 1, gap: 2 },
  leaderPoints: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  rewardCard: { borderRadius: 17, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 18 },
  rewardCount: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  profileHeader: { alignItems: 'center', paddingVertical: 24 },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 23, marginTop: 11, letterSpacing: -0.5 },
  profileStats: { flexDirection: 'row', marginTop: 22, gap: 42 },
  stat: { alignItems: 'center', gap: 3 },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  editCard: { borderRadius: 19, borderWidth: 1, padding: 15, gap: 12, marginBottom: 20 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  badgeCard: { width: '31.8%', minHeight: 106, borderRadius: 15, borderWidth: 1, padding: 9, alignItems: 'center', justifyContent: 'center', gap: 5 },
  badgeIcon: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textAlign: 'center' },
  badgeStatus: { fontFamily: 'Inter_500Medium', fontSize: 9 },
  adminCard: { minHeight: 65, borderRadius: 17, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 21 },
  adminIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  resetButton: { alignItems: 'center', paddingVertical: 22 },
  moderationHero: { borderRadius: 20, padding: 18, gap: 8, marginTop: 18 },
  reportRow: { minHeight: 70, borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  reportIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reportStatus: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  privacyNote: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 24 },
});