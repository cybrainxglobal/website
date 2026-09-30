// Catalog of the third-party services and device permissions an app can
// declare in its manifest (`legal.services` / `legal.permissions`).
// Each entry carries the wording used by the generated privacy policy and
// terms, in English and Portuguese. Add a new service here once and every app
// can reference it by id.

export const SERVICES = {
  admob: {
    name: 'Google AdMob (Google Mobile Ads)',
    url: 'https://policies.google.com/technologies/partner-sites',
    purpose: {
      en: 'displays ads and measures ad performance in the free version of the app',
      pt: 'exibe anúncios e mede o desempenho dos anúncios na versão gratuita do app',
    },
  },
  'firebase-analytics': {
    name: 'Google Analytics for Firebase',
    url: 'https://firebase.google.com/support/privacy',
    purpose: {
      en: 'measures how the app is used, in aggregate, so we can improve it',
      pt: 'mede, de forma agregada, como o app é usado para que possamos melhorá-lo',
    },
  },
  crashlytics: {
    name: 'Firebase Crashlytics',
    url: 'https://firebase.google.com/support/privacy',
    purpose: {
      en: 'reports crashes and technical errors so we can fix them',
      pt: 'informa falhas e erros técnicos para que possamos corrigi-los',
    },
  },
  'firebase-auth': {
    name: 'Firebase Authentication',
    url: 'https://firebase.google.com/support/privacy',
    purpose: { en: 'handles account creation and sign-in', pt: 'gerencia a criação de conta e o login' },
  },
  firestore: {
    name: 'Cloud Firestore (Firebase)',
    url: 'https://firebase.google.com/support/privacy',
    purpose: {
      en: 'stores and syncs the content of signed-in users',
      pt: 'armazena e sincroniza o conteúdo de usuários com login',
    },
  },
  revenuecat: {
    name: 'RevenueCat',
    url: 'https://www.revenuecat.com/privacy',
    purpose: {
      en: 'manages subscriptions, entitlements and purchase restoration',
      pt: 'gerencia assinaturas, direitos de acesso e restauração de compras',
    },
  },
  'google-play': {
    name: 'Google Play',
    url: 'https://policies.google.com/privacy',
    purpose: {
      en: 'distributes the app and processes in-app purchases',
      pt: 'distribui o app e processa as compras no app',
    },
  },
  'app-store': {
    name: 'Apple App Store',
    url: 'https://www.apple.com/legal/privacy/',
    purpose: {
      en: 'distributes the app and processes in-app purchases',
      pt: 'distribui o app e processa as compras no app',
    },
  },
  ai: {
    name: 'OpenRouter (AI model providers)',
    url: 'https://openrouter.ai/privacy',
    purpose: {
      en: 'generates the results of AI features from the text you submit, relayed through our server',
      pt: 'gera os resultados dos recursos de IA a partir do texto que você envia, repassado pelo nosso servidor',
    },
  },
  'cybrainx-kit': {
    name: 'Cybrainx support services (hosted on Cloudflare)',
    url: 'https://www.cloudflare.com/privacypolicy/',
    purpose: {
      en: 'delivers the feedback and support messages you choose to send, receives technical error reports, and checks whether your app version is up to date',
      pt: 'entrega as mensagens de feedback e suporte que você decide enviar, recebe relatórios técnicos de erro e verifica se a versão do app está atualizada',
    },
  },
  'google-sign-in': {
    name: 'Google Sign-In',
    url: 'https://policies.google.com/privacy',
    purpose: { en: 'lets you sign in with your Google account', pt: 'permite entrar com a sua conta Google' },
  },
  'apple-sign-in': {
    name: 'Sign in with Apple',
    url: 'https://www.apple.com/legal/privacy/',
    purpose: { en: 'lets you sign in with your Apple ID', pt: 'permite entrar com o seu Apple ID' },
  },
  'facebook-login': {
    name: 'Facebook Login',
    url: 'https://www.facebook.com/privacy/policy/',
    purpose: { en: 'lets you sign in with your Facebook account', pt: 'permite entrar com a sua conta do Facebook' },
  },
};

export const PERMISSIONS = {
  notifications: {
    name: { en: 'Notifications', pt: 'Notificações' },
    why: {
      en: 'to show the reminders and alerts you turn on',
      pt: 'para exibir os lembretes e alertas que você ativar',
    },
  },
  'exact-alarm': {
    name: { en: 'Alarms & reminders', pt: 'Alarmes e lembretes' },
    why: {
      en: 'to fire alarms and reminders at the exact time you set',
      pt: 'para disparar alarmes e lembretes no horário exato que você definir',
    },
  },
  microphone: {
    name: { en: 'Microphone', pt: 'Microfone' },
    why: {
      en: 'only while you use a voice feature, such as dictating text',
      pt: 'somente enquanto você usa um recurso de voz, como ditar um texto',
    },
  },
  camera: {
    name: { en: 'Camera', pt: 'Câmera' },
    why: {
      en: 'only while you use a feature that captures photos or scans content',
      pt: 'somente enquanto você usa um recurso que tira fotos ou lê conteúdo',
    },
  },
  photos: {
    name: { en: 'Photos and media', pt: 'Fotos e mídia' },
    why: {
      en: 'to attach, import or save the images you choose',
      pt: 'para anexar, importar ou salvar as imagens que você escolher',
    },
  },
  location: {
    name: { en: 'Location', pt: 'Localização' },
    why: {
      en: 'to provide location-based features you turn on',
      pt: 'para oferecer os recursos baseados em localização que você ativar',
    },
  },
  contacts: {
    name: { en: 'Contacts', pt: 'Contatos' },
    why: {
      en: 'only when you choose contacts inside a feature that needs them',
      pt: 'somente quando você escolhe contatos em um recurso que precisa deles',
    },
  },
  calendar: {
    name: { en: 'Calendar', pt: 'Agenda' },
    why: {
      en: 'to read or add the calendar events you choose',
      pt: 'para ler ou adicionar os eventos de agenda que você escolher',
    },
  },
  accessibility: {
    name: { en: 'Accessibility service', pt: 'Serviço de acessibilidade' },
    why: {
      en: 'to perform the taps, swipes and automations you configure; the app does not collect or transmit what is on your screen',
      pt: 'para executar os toques, gestos e automações que você configurar; o app não coleta nem transmite o conteúdo da sua tela',
    },
  },
  overlay: {
    name: { en: 'Display over other apps', pt: 'Sobrepor a outros apps' },
    why: {
      en: 'to show the app controls on top of other apps while a feature is running',
      pt: 'para mostrar os controles do app sobre outros apps enquanto um recurso está em execução',
    },
  },
  storage: {
    name: { en: 'Files and storage', pt: 'Arquivos e armazenamento' },
    why: {
      en: 'to import or export the files you choose',
      pt: 'para importar ou exportar os arquivos que você escolher',
    },
  },
};

/** Sign-in providers accepted in `legal.account.providers`. */
export const SIGN_IN_PROVIDERS = {
  email: { en: 'email and password', pt: 'e-mail e senha' },
  google: { en: 'Google', pt: 'Google' },
  apple: { en: 'Apple', pt: 'Apple' },
  facebook: { en: 'Facebook', pt: 'Facebook' },
};
