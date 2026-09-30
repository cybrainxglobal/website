// Wording of the generated Privacy Policy and Terms of Use.
//
// Structure and tone follow the Inspire Me Now pages (inspire-me-now/
// privacy-policy.html and terms-of-use.html), made generic: every section and
// sentence that only applies to some apps is switched on by the app manifest
// (services, permissions, account, purchases, ads, AI). Nothing here is legal
// advice; review the output when an app does something new.

import { PERMISSIONS, SERVICES, SIGN_IN_PROVIDERS } from './catalog.mjs';
import { esc, joinList, paragraphs } from './util.mjs';

/** Everything the legal texts need to know about one app, derived once. */
export function legalContext(app, site) {
  const legal = app.legal || {};
  const services = legal.services || [];
  const has = (id) => services.includes(id);
  const permissions = (legal.permissions || []).map((p) =>
    typeof p === 'string' ? { id: p, ...PERMISSIONS[p] } : { id: 'custom', name: p.name, why: p.why },
  );
  const platforms =
    legal.platforms ||
    [app.stores?.googlePlay ? 'android' : null, app.stores?.appStore ? 'ios' : null].filter(Boolean);
  const providers = legal.account?.providers || [];
  const purchases = legal.purchases ?? has('revenuecat');
  return {
    app,
    site,
    lang: app.lang || 'en',
    has,
    services,
    permissions,
    platforms: platforms.length ? platforms : ['android'],
    providers,
    account: providers.length > 0,
    accountOptional: legal.account?.optional !== false,
    cloudSync: Boolean(legal.cloud) || has('firestore'),
    purchases,
    subscriptions: legal.subscriptions ?? purchases,
    ads: has('admob'),
    personalizedAds: legal.ads?.personalized === true,
    analytics: has('firebase-analytics'),
    crash: has('crashlytics'),
    ai: has('ai'),
    kit: has('cybrainx-kit'),
    notifications: permissions.some((p) => p.id === 'notifications' || p.id === 'exact-alarm'),
    userContent: legal.userContent !== false,
    minAge: legal.minAge ?? 13,
    links: {
      app: 'index.html',
      privacy: 'privacy-policy.html',
      terms: 'terms-of-use.html',
      deletion: `../data-deletion-request.html?app=${encodeURIComponent(app.slug)}`,
      home: '../index.html',
    },
  };
}

const tr = (lang) => (en, pt) => (lang === 'pt' ? pt : en);

const ul = (items) => `<ul>\n${items.filter(Boolean).map((i) => `  <li>${i}</li>`).join('\n')}\n</ul>`;
const p = (html) => `<p>${html}</p>`;
const note = (html) => `<div class="note">${html}</div>`;
const a = (href, text) => `<a href="${esc(href)}">${text}</a>`;
const ext = (href, text) => `<a href="${esc(href)}" target="_blank" rel="noopener">${text}</a>`;
const card = (title, html) => `<div class="card"><strong>${title}</strong>${html}</div>`;
const custom = (items = []) =>
  items.map((s) => ({ id: `x-${slugify(s.title)}`, title: s.title, html: paragraphs(s.text) }));

function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function platformText(ctx) {
  const t = tr(ctx.lang);
  const names = ctx.platforms.map((pl) => (pl === 'ios' ? 'iOS' : 'Android'));
  return joinList(names, t('and', 'e'));
}

function storeNames(ctx) {
  const t = tr(ctx.lang);
  const names = ctx.platforms.map((pl) => (pl === 'ios' ? 'Apple App Store' : 'Google Play'));
  return joinList(names, t('or', 'ou'));
}

function contactList(ctx) {
  const t = tr(ctx.lang);
  const { site, links, app } = ctx;
  return ul([
    `<strong>${t('Email', 'E-mail')}:</strong> ${a(`mailto:${site.email}`, esc(site.email))}`,
    `<strong>${t('Data deletion requests', 'Pedidos de exclusão de dados')}:</strong> ${a(links.deletion, t('data deletion request page', 'página de solicitação de exclusão de dados'))}`,
    `<strong>${t('App page', 'Página do app')}:</strong> ${a(links.app, `${esc(site.domain)}/${esc(app.slug)}/`)}`,
    `<strong>${t('Location', 'Localização')}:</strong> ${esc(site.location[ctx.lang])}`,
  ]);
}

function ownerParagraph(ctx) {
  const t = tr(ctx.lang);
  const { site, app } = ctx;
  if (!site.owner) return '';
  return p(
    t(
      `The <strong>${esc(site.domain)}</strong> domain used for ${esc(app.name)} belongs to <strong>${esc(site.owner)}</strong>.`,
      `O domínio <strong>${esc(site.domain)}</strong> usado pelo ${esc(app.name)} pertence a <strong>${esc(site.owner)}</strong>.`,
    ) +
      (site.ownerProfile
        ? ` ${t('Professional profile', 'Perfil profissional')}: ${ext(site.ownerProfile, esc(site.ownerProfile))}`
        : ''),
  );
}

// ─── Privacy Policy ─────────────────────────────────────────────────────────

export function privacyPolicy(ctx) {
  const t = tr(ctx.lang);
  const { app, site, links } = ctx;
  const name = esc(app.name);
  const legal = app.legal || {};
  const sections = [];

  // 1. Scope
  sections.push({
    id: 'scope',
    title: t('Scope', 'Escopo'),
    html: [
      p(
        t(
          `This Privacy Policy applies to the ${name} mobile app for ${platformText(ctx)}, including ${ctx.purchases ? 'free and premium features' : 'all of its features'}${ctx.account ? ', sign-in flows' : ''} and the related support pages hosted by ${esc(site.company)}. It covers information handled by ${esc(site.company)} and by the third-party service providers that help us operate the app.`,
          `Esta Política de Privacidade se aplica ao app ${name} para ${platformText(ctx)}, incluindo ${ctx.purchases ? 'os recursos gratuitos e premium' : 'todos os seus recursos'}${ctx.account ? ', os fluxos de login' : ''} e as páginas de suporte relacionadas hospedadas pela ${esc(site.company)}. Ela abrange as informações tratadas pela ${esc(site.company)} e pelos prestadores de serviço terceirizados que nos ajudam a operar o app.`,
        ),
      ),
      legal.scopeNote ? note(esc(legal.scopeNote)) : '',
    ].join('\n'),
  });

  // 2. Information we collect
  const cards = [];
  if (ctx.account) {
    const providers = joinList(
      ctx.providers.map((id) => SIGN_IN_PROVIDERS[id]?.[ctx.lang] || esc(id)),
      t('or', 'ou'),
    );
    cards.push(
      card(
        t('Account and sign-in data', 'Dados de conta e login'),
        t(
          `When you create an account or sign in, we may collect your email address, display name, user ID and the identifiers needed to complete sign-in through ${providers}.`,
          `Quando você cria uma conta ou faz login, podemos coletar seu e-mail, nome de exibição, ID de usuário e os identificadores necessários para concluir o login por ${providers}.`,
        ),
      ),
    );
  }
  for (const c of legal.dataCards || []) cards.push(card(esc(c.title), esc(c.text)));
  if (ctx.ai) {
    cards.push(
      card(
        t('Text you send to AI features', 'Texto enviado aos recursos de IA'),
        t(
          'When you use an AI feature, the text you type or dictate is sent through our server to an AI model provider to produce the result. We do not use it to identify you, build a profile or show ads. Please avoid including sensitive personal information.',
          'Quando você usa um recurso de IA, o texto que você digita ou dita é enviado pelo nosso servidor a um provedor de modelos de IA para gerar o resultado. Não o usamos para identificar você, criar perfis ou exibir anúncios. Evite incluir informações pessoais sensíveis.',
        ),
      ),
    );
  }
  if (ctx.kit) {
    cards.push(
      card(
        t('Feedback and support messages', 'Mensagens de feedback e suporte'),
        t(
          'If you choose to send feedback or contact support from the app, we receive your message, the email address you provide (optional) and technical details such as app version, operating system and device model.',
          'Se você decidir enviar feedback ou falar com o suporte pelo app, recebemos sua mensagem, o e-mail que você informar (opcional) e detalhes técnicos como versão do app, sistema operacional e modelo do aparelho.',
        ),
      ),
    );
  }
  if (ctx.purchases) {
    cards.push(
      card(
        t('Subscription and billing data', 'Dados de assinatura e cobrança'),
        t(
          `If you purchase premium access, we receive subscription status, entitlement status, product identifiers, store transaction status and app user identifiers through the app stores${ctx.has('revenuecat') ? ' and RevenueCat' : ''}. We do not receive your full credit card number.`,
          `Se você comprar o acesso premium, recebemos o status da assinatura, o status do direito de acesso, os identificadores de produto, o status da transação na loja e identificadores de usuário do app por meio das lojas de aplicativos${ctx.has('revenuecat') ? ' e da RevenueCat' : ''}. Não recebemos o número completo do seu cartão de crédito.`,
        ),
      ),
    );
  }
  if (ctx.ads) {
    cards.push(
      card(
        t('Advertising and device data', 'Dados de publicidade e do aparelho'),
        ctx.personalizedAds
          ? t(
              'In the free version, Google Mobile Ads and its partners may process device identifiers (such as the advertising ID), app and device information, approximate location derived from your IP address and ad interaction data. Where the law requires it, personalized ads are only shown after you consent.',
              'Na versão gratuita, o Google Mobile Ads e seus parceiros podem tratar identificadores do aparelho (como o ID de publicidade), informações do app e do aparelho, localização aproximada derivada do seu endereço IP e dados de interação com anúncios. Onde a lei exige, anúncios personalizados só são exibidos após o seu consentimento.',
            )
          : t(
              'If ads are enabled, Google Mobile Ads and its partners may process device identifiers, app and device information, approximate network information and ad performance data. The app requests non-personalized ads where supported, but ad providers may still process the technical data needed to serve and measure ads.',
              'Se os anúncios estiverem ativos, o Google Mobile Ads e seus parceiros podem tratar identificadores do aparelho, informações do app e do aparelho, informações aproximadas de rede e dados de desempenho dos anúncios. O app solicita anúncios não personalizados quando possível, mas os provedores ainda podem tratar os dados técnicos necessários para exibir e medir anúncios.',
            ),
      ),
    );
  }
  if (ctx.analytics || ctx.crash) {
    const tools = joinList(
      [ctx.analytics && 'Google Analytics for Firebase', ctx.crash && 'Firebase Crashlytics'].filter(Boolean),
      t('and', 'e'),
    );
    cards.push(
      card(
        t('Usage and diagnostics data', 'Dados de uso e diagnóstico'),
        t(
          `We use ${tools} to ${ctx.analytics ? 'understand how the app is used and to fix problems' : 'detect and fix crashes'}. This may include ${ctx.analytics ? 'app events, ' : ''}device model, operating system, app version${ctx.crash ? ', crash traces' : ''} and an app instance identifier. It does not include the content you create.`,
          `Usamos ${tools} para ${ctx.analytics ? 'entender como o app é usado e corrigir problemas' : 'detectar e corrigir falhas'}. Isso pode incluir ${ctx.analytics ? 'eventos do app, ' : ''}modelo do aparelho, sistema operacional, versão do app${ctx.crash ? ', rastros de falhas' : ''} e um identificador da instalação. Não inclui o conteúdo que você cria.`,
        ),
      ),
    );
  }
  cards.push(
    card(
      t('Local files and on-device storage', 'Arquivos locais e armazenamento no aparelho'),
      legal.onDevice
        ? esc(legal.onDevice)
        : t(
            `We store your settings${ctx.userContent ? ' and the content you create' : ''} on your device to support app functionality. This information stays on your device unless you choose to share or export it${ctx.cloudSync ? ', or sign in to sync it' : ''}.`,
            `Armazenamos suas configurações${ctx.userContent ? ' e o conteúdo que você cria' : ''} no seu aparelho para o funcionamento do app. Essas informações ficam no aparelho, a menos que você decida compartilhá-las ou exportá-las${ctx.cloudSync ? ', ou faça login para sincronizá-las' : ''}.`,
          ),
    ),
  );
  if (ctx.cloudSync && legal.cloud) cards.push(card(t('Cloud data', 'Dados na nuvem'), esc(legal.cloud)));

  const direct = [
    ctx.account && t('Email address, password or sign-in choice.', 'E-mail, senha ou forma de login escolhida.'),
    ctx.userContent && t('Content you create and save in the app.', 'Conteúdo que você cria e salva no app.'),
    ctx.ai && t('Text you submit to AI features.', 'Texto que você envia aos recursos de IA.'),
    t('Support requests and feedback you send us.', 'Pedidos de suporte e feedback que você nos envia.'),
  ];
  const auto = [
    t(
      `Technical app and device information needed to run the app${ctx.notifications ? ', deliver notifications' : ''}${ctx.purchases ? ', process subscriptions' : ''}${ctx.ads ? ' and show ads' : ''}.`,
      `Informações técnicas do app e do aparelho necessárias para executar o app${ctx.notifications ? ', entregar notificações' : ''}${ctx.purchases ? ', processar assinaturas' : ''}${ctx.ads ? ' e exibir anúncios' : ''}.`,
    ),
    (ctx.analytics || ctx.crash) &&
      t('Usage events and diagnostics, as described above.', 'Eventos de uso e diagnósticos, como descrito acima.'),
    ctx.purchases &&
      t(
        'Subscription state and entitlement information returned by the app stores.',
        'Status da assinatura e do direito de acesso retornados pelas lojas de aplicativos.',
      ),
  ];
  const third = [
    ctx.account &&
      ctx.providers.some((x) => x !== 'email') &&
      t(
        'Sign-in providers may share account identifiers, email address and basic profile information allowed by your provider settings.',
        'Provedores de login podem compartilhar identificadores de conta, e-mail e informações básicas de perfil permitidas pelas configurações do provedor.',
      ),
    ctx.purchases &&
      t(
        `${storeNames(ctx)}${ctx.has('revenuecat') ? ' and RevenueCat' : ''} may provide purchase and entitlement status.`,
        `${storeNames(ctx)}${ctx.has('revenuecat') ? ' e a RevenueCat' : ''} podem informar o status de compras e direitos de acesso.`,
      ),
    ctx.ads &&
      t(
        'Google Mobile Ads may provide ad response and ad measurement data.',
        'O Google Mobile Ads pode fornecer dados de resposta e de medição de anúncios.',
      ),
  ].filter(Boolean);

  sections.push({
    id: 'collect',
    title: t('Information We Collect', 'Informações que Coletamos'),
    html: [
      `<div class="grid">\n${cards.join('\n')}\n</div>`,
      `<h3>${t('Information you provide directly', 'Informações que você fornece diretamente')}</h3>`,
      ul(direct),
      `<h3>${t('Information collected automatically', 'Informações coletadas automaticamente')}</h3>`,
      ul(auto),
      third.length ? `<h3>${t('Information from third parties', 'Informações de terceiros')}</h3>\n${ul(third)}` : '',
    ].join('\n'),
  });

  // 3. How we use information
  sections.push({
    id: 'use',
    title: t('How We Use Information', 'Como Usamos as Informações'),
    html: ul([
      ctx.account && t('To create and secure your account and let you sign in.', 'Para criar e proteger sua conta e permitir o login.'),
      legal.purpose
        ? t(`To provide the app's features, such as ${esc(legal.purpose)}.`, `Para oferecer os recursos do app, como ${esc(legal.purpose)}.`)
        : t("To provide the app's features.", 'Para oferecer os recursos do app.'),
      ctx.userContent &&
        t(
          `To save your content and preferences${ctx.cloudSync ? ' across sessions and devices' : ''}.`,
          `Para salvar seu conteúdo e suas preferências${ctx.cloudSync ? ' entre sessões e aparelhos' : ''}.`,
        ),
      ctx.notifications &&
        t('To deliver the reminders and notifications you turn on.', 'Para entregar os lembretes e notificações que você ativar.'),
      ctx.ai && t('To generate the AI results you request.', 'Para gerar os resultados de IA que você solicitar.'),
      ctx.purchases &&
        t(
          'To provide premium subscriptions, restore purchases and manage billing status.',
          'Para oferecer assinaturas premium, restaurar compras e gerenciar o status de cobrança.',
        ),
      ctx.ads && t('To show ads in the free version of the app.', 'Para exibir anúncios na versão gratuita do app.'),
      (ctx.analytics || ctx.crash) &&
        (ctx.analytics
          ? t('To understand usage and fix bugs and crashes.', 'Para entender o uso e corrigir erros e falhas.')
          : t('To detect and fix crashes.', 'Para detectar e corrigir falhas.')),
      ctx.kit && t('To answer your feedback and support requests.', 'Para responder ao seu feedback e aos pedidos de suporte.'),
      t('To maintain, troubleshoot, secure and improve the app.', 'Para manter, diagnosticar, proteger e melhorar o app.'),
      t('To comply with legal obligations and respond to lawful requests.', 'Para cumprir obrigações legais e atender a solicitações legítimas.'),
    ]),
  });

  // 4. Sharing and service providers
  const providerItems = ctx.services.map((id) => {
    const s = SERVICES[id];
    return `<strong>${ext(s.url, esc(s.name))}</strong> — ${esc(s.purpose[ctx.lang])}.`;
  });
  sections.push({
    id: 'share',
    title: t('Sharing and Service Providers', 'Compartilhamento e Prestadores de Serviço'),
    html: [
      providerItems.length
        ? p(
            t(
              'We do not sell your personal information. We share information only with the service providers and platforms needed to run the app:',
              'Não vendemos suas informações pessoais. Compartilhamos informações apenas com os prestadores de serviço e plataformas necessários para operar o app:',
            ),
          ) + ul(providerItems)
        : p(
            t(
              'We do not sell your personal information, and the app does not send your information to third-party service providers.',
              'Não vendemos suas informações pessoais, e o app não envia suas informações a prestadores de serviço terceirizados.',
            ),
          ),
      p(
        t(
          'We may also disclose information if required by law, to protect users, to enforce our terms, or in connection with a business transfer such as a merger, acquisition or asset sale.',
          'Também podemos divulgar informações quando exigido por lei, para proteger usuários, para fazer cumprir nossos termos ou em uma transferência de negócio, como fusão, aquisição ou venda de ativos.',
        ),
      ),
    ].join('\n'),
  });

  // Device permissions (only when the app asks for any)
  if (ctx.permissions.length) {
    sections.push({
      id: 'permissions',
      title: t('Device Permissions', 'Permissões do Aparelho'),
      html: [
        p(t('The app may ask for the following permissions:', 'O app pode solicitar as seguintes permissões:')),
        ul(ctx.permissions.map((perm) => `<strong>${esc(perm.name[ctx.lang] ?? perm.name)}</strong> — ${esc(perm.why[ctx.lang] ?? perm.why)}.`)),
        p(
          t(
            'You can grant or revoke permissions at any time in your device settings. If you revoke one, only the feature that depends on it stops working.',
            'Você pode conceder ou revogar permissões a qualquer momento nas configurações do aparelho. Se revogar uma, apenas o recurso que depende dela deixa de funcionar.',
          ),
        ),
      ].join('\n'),
    });
  }

  // Ads and analytics
  if (ctx.ads || ctx.analytics || ctx.crash) {
    const parts = [];
    if (ctx.ads && ctx.personalizedAds) {
      parts.push(
        p(
          t(
            `The free version of ${name} displays ads served by Google AdMob. Where required by law (for example in the European Economic Area, the United Kingdom and Switzerland), we ask for your consent through Google's consent message before personalized ads are shown, and you can change your choice later from the app's privacy settings. You can also reset your advertising ID or opt out of ad personalization in your device settings.`,
            `A versão gratuita do ${name} exibe anúncios fornecidos pelo Google AdMob. Onde a lei exige (por exemplo, no Espaço Econômico Europeu, no Reino Unido e na Suíça), pedimos o seu consentimento pela mensagem de consentimento do Google antes de exibir anúncios personalizados, e você pode mudar sua escolha depois nas configurações de privacidade do app. Você também pode redefinir seu ID de publicidade ou desativar a personalização de anúncios nas configurações do aparelho.`,
          ),
        ),
      );
    } else if (ctx.ads) {
      parts.push(
        p(
          t(
            `${name} may display ads in some versions or subscription tiers. The app requests non-personalized ads where supported. Even so, advertising providers may still process device, identifier and ad response data to deliver ads, limit fraud and report ad performance.`,
            `O ${name} pode exibir anúncios em algumas versões ou planos. O app solicita anúncios não personalizados quando possível. Ainda assim, os provedores de publicidade podem tratar dados do aparelho, identificadores e respostas de anúncios para entregar anúncios, limitar fraudes e medir o desempenho.`,
          ),
        ),
      );
    }
    if (ctx.analytics || ctx.crash) {
      parts.push(
        p(
          t(
            `We use ${ctx.analytics ? 'analytics and crash reports to measure aggregate usage and diagnose problems' : 'crash reports to diagnose and fix problems'}. We do not use these tools to identify you personally or to read the content you create.`,
            `Usamos ${ctx.analytics ? 'análises e relatórios de falhas para medir o uso de forma agregada e diagnosticar problemas' : 'relatórios de falhas para diagnosticar e corrigir problemas'}. Não usamos essas ferramentas para identificar você pessoalmente nem para ler o conteúdo que você cria.`,
          ),
        ),
      );
    }
    parts.push(
      p(
        t(
          'If we later enable new advertising, tracking or analytics tools, we will update this Privacy Policy and any required in-app notices or store disclosures before shipping those changes.',
          'Se no futuro ativarmos novas ferramentas de publicidade, rastreamento ou análise, atualizaremos esta Política de Privacidade e os avisos no app ou nas lojas exigidos antes de lançar essas mudanças.',
        ),
      ),
    );
    const title = ctx.ads
      ? ctx.analytics || ctx.crash
        ? t('Ads and Analytics', 'Anúncios e Análises')
        : t('Ads', 'Anúncios')
      : t('Analytics and Crash Reports', 'Análises e Relatórios de Falhas');
    sections.push({ id: 'ads', title, html: parts.join('\n') });
  }

  // Retention and deletion
  sections.push({
    id: 'retain',
    title: t('Retention and Deletion', 'Retenção e Exclusão'),
    html: [
      p(
        t(
          'We keep personal information only for as long as it is reasonably needed to operate the app, provide its features, resolve disputes, enforce agreements and meet legal requirements.',
          'Mantemos informações pessoais apenas pelo tempo razoavelmente necessário para operar o app, oferecer seus recursos, resolver disputas, fazer cumprir acordos e atender a exigências legais.',
        ),
      ),
      ul([
        ctx.account &&
          t(
            'Account data and synced content are kept until you delete them or delete your account.',
            'Dados da conta e conteúdo sincronizado são mantidos até que você os exclua ou exclua sua conta.',
          ),
        t(
          'Information stored only on your device remains until you delete it, clear the app data or uninstall the app.',
          'Informações armazenadas apenas no aparelho permanecem até que você as exclua, limpe os dados do app ou desinstale o app.',
        ),
        ctx.ai &&
          t(
            'Text sent to AI features is processed to produce the response and is not stored on our server afterwards; the AI provider may keep it for a limited time under its own policy.',
            'O texto enviado aos recursos de IA é processado para gerar a resposta e não fica armazenado no nosso servidor depois disso; o provedor de IA pode mantê-lo por tempo limitado conforme a política dele.',
          ),
        t(
          'Feedback and support messages are kept only as long as needed to handle your request.',
          'Mensagens de feedback e suporte são mantidas apenas pelo tempo necessário para atender ao seu pedido.',
        ),
        (ctx.analytics || ctx.crash || ctx.ads) &&
          t(
            'Analytics, crash and advertising data are kept for the retention periods set by those service providers.',
            'Dados de análise, de falhas e de publicidade são mantidos pelos prazos de retenção definidos por esses prestadores.',
          ),
        t(
          'Backups, logs and fraud-prevention records may remain for a limited time where reasonably necessary.',
          'Backups, registros e dados de prevenção a fraudes podem permanecer por tempo limitado quando razoavelmente necessário.',
        ),
      ]),
      p(
        t(
          `To ask us to delete data we hold about you, use the ${a(links.deletion, 'data deletion request page')} or email ${a(`mailto:${site.email}`, esc(site.email))}.`,
          `Para pedir a exclusão de dados que mantemos sobre você, use a ${a(links.deletion, 'página de solicitação de exclusão de dados')} ou envie um e-mail para ${a(`mailto:${site.email}`, esc(site.email))}.`,
        ),
      ),
    ].join('\n'),
  });

  // Choices and rights
  sections.push({
    id: 'rights',
    title: t('Your Choices and Rights', 'Suas Escolhas e Direitos'),
    html: [
      ul([
        ctx.account &&
          ctx.accountOptional &&
          t('You can choose whether to create an account or continue without one.', 'Você pode escolher entre criar uma conta ou continuar sem ela.'),
        ctx.notifications &&
          t(
            'You can manage reminders inside the app and through your device notification settings.',
            'Você pode gerenciar os lembretes no app e nas configurações de notificação do aparelho.',
          ),
        ctx.permissions.length &&
          t('You can grant or revoke device permissions in your device settings.', 'Você pode conceder ou revogar permissões nas configurações do aparelho.'),
        ctx.ads &&
          ctx.personalizedAds &&
          t(
            "You can review or change your ad consent choice from the app's privacy settings.",
            'Você pode rever ou alterar sua escolha de consentimento de anúncios nas configurações de privacidade do app.',
          ),
        ctx.userContent &&
          t('You can edit or delete the content you created from within the app.', 'Você pode editar ou excluir no próprio app o conteúdo que criou.'),
        t(
          'You can request access to, correction, portability or deletion of your personal data, and withdraw consent, through the contact channels below.',
          'Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados pessoais, e revogar consentimentos, pelos canais de contato abaixo.',
        ),
        t(
          "Depending on where you live, you may have additional rights under laws such as Brazil's LGPD or the EU and UK GDPR, including the right to complain to your data protection authority.",
          'Dependendo de onde você mora, você pode ter direitos adicionais previstos em leis como a LGPD ou o GDPR da União Europeia e do Reino Unido, incluindo o direito de reclamar à autoridade de proteção de dados (no Brasil, a ANPD).',
        ),
      ]),
      note(
        t(
          `Can't access the app? You can still ask us to delete your data through the ${a(links.deletion, 'data deletion request page')} or by email at ${a(`mailto:${site.email}`, esc(site.email))}.`,
          `Não consegue acessar o app? Você ainda pode pedir a exclusão dos seus dados pela ${a(links.deletion, 'página de solicitação de exclusão de dados')} ou pelo e-mail ${a(`mailto:${site.email}`, esc(site.email))}.`,
        ),
      ),
    ].join('\n'),
  });

  sections.push(...custom(legal.extraPrivacy));

  sections.push({
    id: 'security',
    title: t('Security', 'Segurança'),
    html: p(
      t(
        `We use reasonable administrative, technical and organizational safeguards intended to protect information, including encrypted connections to our services${ctx.account ? ', account-based access controls' : ''} and the security features provided by our infrastructure partners. No system is perfectly secure, so we cannot guarantee absolute security.`,
        `Usamos medidas administrativas, técnicas e organizacionais razoáveis para proteger as informações, incluindo conexões criptografadas com nossos serviços${ctx.account ? ', controles de acesso por conta' : ''} e os recursos de segurança oferecidos pelos nossos parceiros de infraestrutura. Nenhum sistema é perfeitamente seguro, por isso não podemos garantir segurança absoluta.`,
      ),
    ),
  });

  sections.push({
    id: 'children',
    title: t('Children', 'Crianças'),
    html: p(
      t(
        `${name} is not directed to children under ${ctx.minAge}, or under the minimum digital age in the relevant jurisdiction, without parental or guardian involvement. If you believe a child has provided personal information in violation of applicable law, contact us so we can review and take appropriate action.`,
        `O ${name} não é direcionado a crianças menores de ${ctx.minAge} anos, ou abaixo da idade mínima digital da jurisdição aplicável, sem o envolvimento dos pais ou responsáveis. Se você acredita que uma criança forneceu informações pessoais em desacordo com a lei, entre em contato para que possamos analisar e tomar as medidas adequadas.`,
      ),
    ),
  });

  if (ctx.services.length) {
    sections.push({
      id: 'international',
      title: t('International Transfers', 'Transferências Internacionais'),
      html: p(
        t(
          'Our service providers may process or store information in countries other than the one where you live. By using the app, you understand that information may be transferred to and processed in these jurisdictions, subject to applicable safeguards and law.',
          'Nossos prestadores de serviço podem tratar ou armazenar informações em países diferentes daquele onde você mora. Ao usar o app, você entende que as informações podem ser transferidas e tratadas nessas jurisdições, com as salvaguardas previstas na lei aplicável.',
        ),
      ),
    });
  }

  sections.push({
    id: 'changes',
    title: t('Changes to This Policy', 'Alterações nesta Política'),
    html: p(
      t(
        'We may update this Privacy Policy from time to time to reflect product changes, legal requirements or operational updates. When we do, we will update the "Last updated" date above. If a change is material, we may also provide additional notice inside the app or through store listings where required.',
        'Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças no produto, exigências legais ou ajustes operacionais. Quando isso acontecer, atualizaremos a data de "Última atualização" acima. Se a mudança for relevante, também poderemos avisar no app ou nas páginas das lojas quando exigido.',
      ),
    ),
  });

  sections.push({
    id: 'contact',
    title: t('Contact', 'Contato'),
    html: [
      p(
        t(
          `${name} is operated by ${esc(site.company)}. If you have privacy questions, want to exercise your rights or need help with a deletion request, contact us:`,
          `O ${name} é operado pela ${esc(site.company)}. Se tiver dúvidas sobre privacidade, quiser exercer seus direitos ou precisar de ajuda com um pedido de exclusão, fale conosco:`,
        ),
      ),
      contactList(ctx),
      ownerParagraph(ctx),
    ].join('\n'),
  });

  return {
    pill: t('Privacy Policy', 'Política de Privacidade'),
    title: t('Privacy Policy', 'Política de Privacidade'),
    lede: t(
      `This Privacy Policy explains how ${name} collects, uses, stores and shares information when you use the ${name} mobile app for ${platformText(ctx)} and related support pages hosted by ${esc(site.company)}.`,
      `Esta Política de Privacidade explica como o ${name} coleta, usa, armazena e compartilha informações quando você usa o app ${name} para ${platformText(ctx)} e as páginas de suporte relacionadas hospedadas pela ${esc(site.company)}.`,
    ),
    sections: number(sections),
  };
}

// ─── Terms of Use ───────────────────────────────────────────────────────────

export function termsOfUse(ctx) {
  const t = tr(ctx.lang);
  const { app, site, links } = ctx;
  const name = esc(app.name);
  const legal = app.legal || {};
  const sections = [];

  sections.push({
    id: 'eligibility',
    title: t('Eligibility', 'Elegibilidade'),
    html: p(
      t(
        `You must be at least ${ctx.minAge} years old, or the minimum age required in your country, to use the app.`,
        `Você precisa ter pelo menos ${ctx.minAge} anos, ou a idade mínima exigida no seu país, para usar o app.`,
      ),
    ),
  });

  sections.push({
    id: 'license',
    title: t('License', 'Licença'),
    html: p(
      t(
        `You receive a limited, non-exclusive, non-transferable and revocable license to use the app for personal, non-commercial purposes. You may not copy, reverse engineer, resell or misuse the app${ctx.ai ? ', its AI features or its AI-generated content' : ''}.`,
        `Você recebe uma licença limitada, não exclusiva, intransferível e revogável para usar o app para fins pessoais e não comerciais. Você não pode copiar, fazer engenharia reversa, revender ou usar indevidamente o app${ctx.ai ? ', seus recursos de IA ou o conteúdo gerado por IA' : ''}.`,
      ),
    ),
  });

  if (ctx.userContent) {
    sections.push({
      id: 'content',
      title: t('Your Content', 'Seu Conteúdo'),
      html: p(
        t(
          `Content you create in the app remains yours, and you are responsible for it. ${ctx.cloudSync ? 'Keep your account credentials safe.' : 'Content stored only on your device can be lost if you uninstall the app, clear its data or change devices, so keep your own backups or exports.'}`,
          `O conteúdo que você cria no app continua sendo seu, e você é responsável por ele. ${ctx.cloudSync ? 'Mantenha suas credenciais de acesso em segurança.' : 'Conteúdo armazenado apenas no aparelho pode ser perdido se você desinstalar o app, limpar os dados ou trocar de aparelho, então mantenha seus próprios backups ou exportações.'}`,
        ),
      ),
    });
  }

  if (ctx.ai) {
    sections.push({
      id: 'ai',
      title: t('AI-Generated Content', 'Conteúdo Gerado por IA'),
      html: [
        p(
          t(
            'Some results in the app are generated by artificial intelligence. They may be inaccurate or incomplete and do not constitute professional medical, legal, financial, psychological or religious advice. Review them before relying on them and use them at your own discretion.',
            'Alguns resultados do app são gerados por inteligência artificial. Eles podem ser imprecisos ou incompletos e não constituem aconselhamento profissional médico, jurídico, financeiro, psicológico ou religioso. Revise-os antes de confiar neles e use-os a seu critério.',
          ),
        ),
        legal.aiNote ? note(esc(legal.aiNote)) : '',
      ].join('\n'),
    });
  }

  if (ctx.purchases) {
    sections.push({
      id: 'purchases',
      title: t('In-App Purchases & Subscriptions', 'Compras no App e Assinaturas'),
      html: [
        p(
          t(
            `Purchases are processed by ${storeNames(ctx)}.${ctx.subscriptions ? ' Subscriptions renew automatically unless cancelled at least 24 hours before the end of the current period. Free trials, where offered, convert to a paid subscription unless cancelled before the trial ends.' : ''} Refunds follow the app store's policy.`,
            `As compras são processadas por ${storeNames(ctx)}.${ctx.subscriptions ? ' As assinaturas são renovadas automaticamente, a menos que sejam canceladas pelo menos 24 horas antes do fim do período atual. Testes gratuitos, quando oferecidos, viram assinatura paga se não forem cancelados antes do fim do teste.' : ''} Reembolsos seguem a política da loja de aplicativos.`,
          ),
        ),
        ctx.subscriptions
          ? p(
              t(
                `You can manage or cancel a subscription at any time in your ${storeNames(ctx)} account settings. Uninstalling the app does not cancel it.`,
                `Você pode gerenciar ou cancelar a assinatura a qualquer momento nas configurações da sua conta ${storeNames(ctx)}. Desinstalar o app não cancela a assinatura.`,
              ),
            )
          : '',
      ].join('\n'),
    });
  }

  if (ctx.ads) {
    sections.push({
      id: 'ads',
      title: t('Advertising', 'Publicidade'),
      html: p(
        t(
          'The free version of the app displays ads provided by third parties. We are not responsible for the content of third-party ads or for the products and services they promote.',
          'A versão gratuita do app exibe anúncios fornecidos por terceiros. Não somos responsáveis pelo conteúdo desses anúncios nem pelos produtos e serviços anunciados.',
        ),
      ),
    });
  }

  if (ctx.notifications) {
    sections.push({
      id: 'notifications',
      title: t('Notifications', 'Notificações'),
      html: p(
        t(
          'The app may send the reminders and notifications you turn on. You can disable them at any time in the app or in your device settings.',
          'O app pode enviar os lembretes e notificações que você ativar. Você pode desativá-los a qualquer momento no app ou nas configurações do aparelho.',
        ),
      ),
    });
  }

  sections.push({
    id: 'ip',
    title: t('Intellectual Property', 'Propriedade Intelectual'),
    html: p(
      t(
        `The app, its design and the content we provide belong to ${esc(site.company)} or its licensors. Unauthorized distribution is prohibited.`,
        `O app, seu design e o conteúdo que fornecemos pertencem à ${esc(site.company)} ou aos seus licenciantes. A distribuição não autorizada é proibida.`,
      ),
    ),
  });

  if (ctx.services.length) {
    sections.push({
      id: 'third-party',
      title: t('Third-Party Services', 'Serviços de Terceiros'),
      html: p(
        t(
          `Some features rely on third-party services, which are governed by their own terms and policies. See the ${a(links.privacy, 'Privacy Policy')} for the list.`,
          `Alguns recursos dependem de serviços de terceiros, que seguem os próprios termos e políticas. Veja a lista na ${a(links.privacy, 'Política de Privacidade')}.`,
        ),
      ),
    });
  }

  sections.push({
    id: 'disclaimers',
    title: t('Disclaimers', 'Isenções'),
    html: p(
      t(
        `The app is provided "as is" and "as available".${ctx.ai ? ' AI content may be imperfect.' : ''} We are not responsible for decisions made based on app content.`,
        `O app é fornecido "no estado em que se encontra" e "conforme disponível".${ctx.ai ? ' O conteúdo de IA pode ser imperfeito.' : ''} Não somos responsáveis por decisões tomadas com base no conteúdo do app.`,
      ),
    ),
  });

  sections.push({
    id: 'liability',
    title: t('Limitation of Liability', 'Limitação de Responsabilidade'),
    html: p(
      t(
        `To the extent permitted by law, ${esc(site.company)} is not liable for indirect, incidental or consequential damages, or for loss of data, arising from your use of the app. Nothing in these Terms limits consumer rights that cannot be waived under the law that applies to you.`,
        `Na extensão permitida pela lei, a ${esc(site.company)} não se responsabiliza por danos indiretos, incidentais ou consequentes, nem por perda de dados, decorrentes do uso do app. Nada nestes Termos limita direitos do consumidor que não possam ser renunciados pela lei aplicável a você.`,
      ),
    ),
  });

  sections.push(...custom(legal.extraTerms));

  sections.push({
    id: 'law',
    title: t('Governing Law', 'Lei Aplicável'),
    html: p(
      t(
        `These Terms are governed by ${esc(site.governingLaw.en)}. Disputes are resolved in the courts of ${esc(site.courts.en)}, without prejudice to mandatory consumer protection rules of your country of residence.`,
        `Estes Termos são regidos pela ${esc(site.governingLaw.pt)}. As disputas serão resolvidas no foro de ${esc(site.courts.pt)}, sem prejuízo das normas obrigatórias de proteção ao consumidor do seu país de residência.`,
      ),
    ),
  });

  sections.push({
    id: 'changes',
    title: t('Changes', 'Alterações'),
    html: p(
      t(
        'We may update these Terms from time to time. When we do, we will update the "Last updated" date above. Continued use after an update means you accept the new Terms.',
        'Podemos atualizar estes Termos periodicamente. Quando isso acontecer, atualizaremos a data de "Última atualização" acima. Continuar usando o app após uma atualização significa que você aceita os novos Termos.',
      ),
    ),
  });

  sections.push({
    id: 'contact',
    title: t('Contact', 'Contato'),
    html: [
      p(t(`Questions about these Terms? Contact ${esc(site.company)}:`, `Dúvidas sobre estes Termos? Fale com a ${esc(site.company)}:`)),
      contactList(ctx),
      ownerParagraph(ctx),
    ].join('\n'),
  });

  return {
    pill: t('Terms of Use', 'Termos de Uso'),
    title: t('Terms of Use', 'Termos de Uso'),
    lede: t(
      `These Terms of Use govern your use of the ${name} app by ${esc(site.company)}. By downloading or using the app, you accept these Terms.`,
      `Estes Termos de Uso regem o uso do app ${name}, da ${esc(site.company)}. Ao baixar ou usar o app, você aceita estes Termos.`,
    ),
    sections: number(sections),
  };
}

function number(sections) {
  return sections.map((s, i) => ({ ...s, title: `${i + 1}. ${s.title}` }));
}
