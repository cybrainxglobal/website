// Pre-fills an app manifest from an Expo / React Native project: name, store
// package, colors, icon and — most importantly for the privacy policy — the
// third-party services and permissions the app really uses, read from its
// dependencies and app.json. Texts (headline, tagline, features) are left for
// you to write.

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

import { shiftHue } from './util.mjs';

const DEPENDENCY_SERVICES = {
  'react-native-google-mobile-ads': 'admob',
  '@react-native-firebase/analytics': 'firebase-analytics',
  '@react-native-firebase/crashlytics': 'crashlytics',
  '@react-native-firebase/auth': 'firebase-auth',
  '@react-native-firebase/firestore': 'firestore',
  'react-native-purchases': 'revenuecat',
  '@cybrainx/mobile-kit': 'cybrainx-kit',
  '@react-native-google-signin/google-signin': 'google-sign-in',
  'expo-apple-authentication': 'apple-sign-in',
  'react-native-fbsdk-next': 'facebook-login',
};

const DEPENDENCY_PERMISSIONS = {
  'expo-notifications': 'notifications',
  '@notifee/react-native': 'notifications',
  'expo-camera': 'camera',
  'react-native-vision-camera': 'camera',
  'expo-location': 'location',
  'expo-contacts': 'contacts',
  'expo-calendar': 'calendar',
  'expo-image-picker': 'photos',
  'expo-media-library': 'photos',
  'expo-speech-recognition': 'microphone',
  '@react-native-voice/voice': 'microphone',
};

const ANDROID_PERMISSIONS = {
  POST_NOTIFICATIONS: 'notifications',
  SCHEDULE_EXACT_ALARM: 'exact-alarm',
  USE_EXACT_ALARM: 'exact-alarm',
  CAMERA: 'camera',
  RECORD_AUDIO: 'microphone',
  READ_MEDIA_IMAGES: 'photos',
  ACCESS_FINE_LOCATION: 'location',
  ACCESS_COARSE_LOCATION: 'location',
  READ_CONTACTS: 'contacts',
  READ_CALENDAR: 'calendar',
  WRITE_CALENDAR: 'calendar',
  SYSTEM_ALERT_WINDOW: 'overlay',
  BIND_ACCESSIBILITY_SERVICE: 'accessibility',
};

const PERMISSION_ORDER = ['notifications', 'exact-alarm', 'microphone', 'camera', 'photos', 'location', 'contacts', 'calendar', 'accessibility', 'overlay'];

const AI_RE = /openrouter|api\.openai\.com|generativelanguage\.googleapis|api\.anthropic\.com|api\.groq\.com|api\.mistral\.ai/i;

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function sourceMentionsAI(dir, depth = 0) {
  if (!existsSync(dir) || depth > 6) return false;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (sourceMentionsAI(abs, depth + 1)) return true;
    } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name) && AI_RE.test(readFileSync(abs, 'utf8'))) {
      return true;
    }
  }
  return false;
}

const kebab = (text) =>
  String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function appFromExpoProject(projectDir, { slug: slugArg, lang, siteRoot }) {
  const appJson = readJson(join(projectDir, 'app.json'));
  const pkg = readJson(join(projectDir, 'package.json'));
  if (!appJson?.expo && !pkg) return { error: `no app.json or package.json found in ${projectDir}` };
  const expo = appJson?.expo || {};
  const deps = { ...(pkg?.dependencies || {}) };
  const notes = [];

  const name = expo.name || pkg?.name || 'My App';
  const slug = slugArg || kebab(expo.slug || name);

  const services = new Set();
  for (const [dep, id] of Object.entries(DEPENDENCY_SERVICES)) if (deps[dep]) services.add(id);
  if (services.has('revenuecat')) services.add(expo.ios && !expo.android ? 'app-store' : 'google-play');
  if (['src', 'app', 'lib', 'worker'].some((d) => sourceMentionsAI(join(projectDir, d)))) services.add('ai');

  const blocked = new Set((expo.android?.blockedPermissions || []).map((p) => p.replace('android.permission.', '')));
  const permissions = new Set();
  for (const [dep, id] of Object.entries(DEPENDENCY_PERMISSIONS)) if (deps[dep]) permissions.add(id);
  for (const raw of expo.android?.permissions || []) {
    const perm = raw.replace('android.permission.', '');
    if (ANDROID_PERMISSIONS[perm] && !blocked.has(perm)) permissions.add(ANDROID_PERMISSIONS[perm]);
  }
  if (blocked.has('SYSTEM_ALERT_WINDOW')) permissions.delete('overlay');
  if (blocked.has('RECORD_AUDIO')) permissions.delete('microphone');

  const providers = [];
  if (services.has('firebase-auth')) providers.push('email');
  if (services.has('google-sign-in')) providers.push('google');
  if (services.has('apple-sign-in')) providers.push('apple');
  if (services.has('facebook-login')) providers.push('facebook');

  const color = [expo.primaryColor, expo.android?.adaptiveIcon?.backgroundColor].find((c) => /^#[0-9a-fA-F]{6}$/.test(c || ''));
  const base = color ? color.toLowerCase() : '#6366f1';

  // Copy the launcher icon into the site so the page and the home card use it.
  let image;
  if (expo.icon && existsSync(join(projectDir, expo.icon)) && extname(expo.icon) === '.png') {
    const targetDir = join(siteRoot, slug);
    const target = join(targetDir, 'icon.png');
    if (!existsSync(target)) {
      mkdirSync(targetDir, { recursive: true });
      copyFileSync(join(projectDir, expo.icon), target);
      notes.push(`copied the app icon to ${slug}/icon.png`);
    }
    image = 'icon.png';
  }

  const manifest = {
    name,
    mode: 'generated',
    lang: lang || 'en',
    headline: '',
    tagline: '',
    description: expo.description || '',
    icon: 'fa-solid fa-star',
    ...(image ? { image } : {}),
    colors: [base, shiftHue(base, 35)],
    tags: [],
    stores: {
      googlePlay: expo.android?.package || '',
      appStore: '',
    },
    features: [],
    home: { listed: true },
    legal: {
      services: [...services],
      permissions: PERMISSION_ORDER.filter((p) => permissions.has(p)),
      ...(providers.length ? { account: { providers, optional: true } } : {}),
      ...(services.has('admob') ? { ads: { personalized: true } } : {}),
      purpose: '',
      onDevice: '',
      dataCards: [],
    },
  };

  notes.push(`services detected: ${[...services].join(', ') || 'none'}`);
  notes.push(`permissions detected: ${manifest.legal.permissions.join(', ') || 'none'}`);
  if (services.has('admob')) notes.push('ads: set "legal.ads.personalized" to false if the app only requests non-personalized ads');
  if (expo.ios?.bundleIdentifier) notes.push('iOS bundle found: add "stores.appStore" once the App Store listing exists');
  return { slug, manifest, notes };
}
