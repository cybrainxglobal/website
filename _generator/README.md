# Gerador de páginas dos apps — cybrainx.com

Cada app novo vira **um arquivo JSON** em `_apps/`. A partir dele o site ganha, sozinho:

| O que é gerado | Onde |
|---|---|
| Página do app (hero, recursos, planos, botão da Play Store, atalhos legais) | `/<slug>/` |
| Política de Privacidade (layout da do Inspire Me Now) | `/<slug>/privacy-policy.html` |
| Termos de Uso (mesmo layout) | `/<slug>/terms-of-use.html` |
| Card do app na home + contador de apps | `index.html` |
| App na lista do formulário de exclusão de dados (já pré-selecionado pelo link `?app=<slug>`) | `data-deletion-request.html` |

A página do app tem uma seção **“Privacy & legal”** com os atalhos para Política de Privacidade, Termos de Uso, Exclusão de dados e Suporte, e os mesmos links no rodapé. As páginas legais têm, no topo, atalhos entre si e de volta para o app.

## Configuração (uma vez só)

1. No GitHub: **Settings → Pages → Build and deployment → Source: “GitHub Actions”**.
   Confira se o domínio personalizado (`cybrainx.com`) continua preenchido nessa mesma tela.
   O site que está no ar continua no ar até a próxima publicação.
2. Suba para o repositório as pastas `_apps/` e `_generator/` e o arquivo `.github/workflows/site.yml`.
3. Pronto. A partir daí, todo commit na `main` roda o gerador e publica o site (aba **Actions**).
   No primeiro run ele já atualiza a home (contador de apps) e o formulário de exclusão (lista completa de apps).

> Por que trocar a fonte do Pages? Commits feitos pelo próprio Actions não disparam o build
> automático do Pages. Publicando pelo Actions, geração e publicação acontecem no mesmo passo.

## Adicionar um app novo

### Pelo navegador (sem instalar nada)

1. Abra `_apps/_TEMPLATE.json`, copie o conteúdo.
2. **Add file → Create new file**, nome `_apps/<slug>.json` (ex.: `_apps/orbit-mind.json`), cole e preencha.
3. (Opcional) Suba o ícone e as telas para a pasta `<slug>/` e cite-os em `"image"` e `"screenshots"`.
4. **Commit**. Em ~1 minuto a página está no ar em `cybrainx.com/<slug>/`.
   Se algo estiver errado no JSON, o workflow falha e a aba Actions mostra exatamente o campo.

### Pelo computador, lendo o próprio projeto do app

```bash
node _generator/generate.mjs from-app C:\DevApps\MeuApp          # cria _apps/meu-app.json
node _generator/generate.mjs                                       # gera as páginas
```

O `from-app` lê `app.json` e `package.json` do app e já preenche: nome, pacote da Play Store,
cores, ícone (copiado para `<slug>/icon.png`) e — o mais importante para a Play Store —
**os serviços e permissões que o app realmente usa** (AdMob, Firebase, Crashlytics,
RevenueCat, IA, notificações, alarmes exatos, microfone…). Você só escreve os textos.

### Outros comandos

```bash
node _generator/generate.mjs new <slug> "Nome do App" [--lang pt]   # manifesto em branco
node _generator/generate.mjs --check                                  # só valida e mostra o que mudaria
```

Precisa de Node 18 ou mais novo. Não há dependências para instalar.

## Campos do manifesto

| Campo | Obrigatório | Exemplo / observação |
|---|---|---|
| `name` | sim | `"Orbit Mind"` |
| `lang` | não | `"en"` (padrão) ou `"pt"` — idioma da página e dos textos legais |
| `headline` | sim | título grande da página |
| `tagline` | sim | 1 frase: vai no card da home e no Google |
| `description` | sim | 2–3 frases; linha em branco = novo parágrafo |
| `icon` | sim | classe do Font Awesome: `"fa-solid fa-diagram-project"` |
| `image` | não | arquivo em `<slug>/` usado no lugar do ícone (ex.: `"icon.png"`) |
| `colors` | sim | 1 ou 2 cores hex. Com 1 cor, a segunda é derivada |
| `tags` | não | `[{ "icon": "fa-solid fa-bolt", "label": "Productivity" }]` (as 2 primeiras vão no card) |
| `stores.googlePlay` | não | pacote Android (`com.cybrainx.app`). Vazio = botão “Coming soon” |
| `stores.appStore` | não | URL `https://apps.apple.com/...` |
| `features` | recomendado | `[{ "icon", "title", "text" }]` |
| `highlights` | não | pílulas curtas abaixo do botão |
| `plans` | não | `[{ "name", "price", "items": [], "highlight": true }]` |
| `screenshots` | não | arquivos em `<slug>/` |
| `privacyBlurb` | não | texto da seção de privacidade da página do app |
| `home.listed` / `home.order` | não | esconder da home / ordenar os cards gerados |

### Bloco `legal` (alimenta a Política e os Termos)

| Campo | Efeito |
|---|---|
| `services` | Lista de ids: `admob`, `firebase-analytics`, `crashlytics`, `firebase-auth`, `firestore`, `revenuecat`, `google-play`, `app-store`, `ai`, `cybrainx-kit`, `google-sign-in`, `apple-sign-in`, `facebook-login`. Cada um adiciona o serviço (com link da política dele) e liga as seções correspondentes: anúncios, compras/assinaturas, IA, feedback… |
| `ads.personalized` | `true` = anúncios personalizados com consentimento (UMP); `false` = só não personalizados |
| `permissions` | `notifications`, `exact-alarm`, `microphone`, `camera`, `photos`, `location`, `contacts`, `calendar`, `accessibility`, `overlay`, `storage` — ou `{ "name": "...", "why": "..." }` |
| `account.providers` | `["email", "google", "apple", "facebook"]` se o app tem login |
| `purpose` | “such as …” — para que o app usa os dados |
| `dataCards` | cartões extras em “Information We Collect”: `[{ "title", "text" }]` |
| `onDevice` / `cloud` | substitui o texto padrão sobre dados no aparelho / na nuvem |
| `scopeNote`, `aiNote` | aviso destacado no escopo / na seção de IA dos Termos |
| `extraPrivacy`, `extraTerms` | seções extras `[{ "title", "text" }]` |
| `minAge` | idade mínima (padrão 13) |
| `updated` | força a data “Last updated” (normalmente não use — veja abaixo) |

Serviço ou permissão nova? Cadastre uma vez em `_generator/catalog.mjs` e todos os apps podem usar.

## Como a data “Last updated” funciona

Cada página legal guarda uma impressão digital do próprio texto. Enquanto o texto não muda,
a data fica congelada; quando você muda algo que altera a política (um serviço, uma permissão,
um texto), a data passa automaticamente para o dia da geração. Assim a data sempre diz a verdade.

## Segurança: o que o gerador nunca faz

- **Não sobrescreve páginas feitas à mão.** Os 13 apps atuais estão em `_apps/` com `"mode": "manual"`
  só para entrar no formulário de exclusão e no contador. Se um app manual for trocado para
  gerado, o gerador recusa e avisa. Para migrar um app antigo: apague as 3 páginas dele e troque o `mode`.
- **Na home e no formulário de exclusão** só mexe entre os marcadores `APP-CARDS`, `APP-OPTIONS`
  e `APP-PRESELECT`, e no número do contador de apps. Cards feitos à mão continuam intactos.
- As pastas `_apps/` e `_generator/` não são publicadas no site.

## Avisos que o `--check` mostra

Além de erros no JSON, ele verifica links quebrados no site todo e aponta arquivos que merecem
atenção (ex.: `privacy.html` antigo publicado ao lado do `privacy-policy.html`, `test.txt` perdidos).
Avisos não bloqueiam a publicação; erros bloqueiam.

> Os textos legais são um modelo prático, não aconselhamento jurídico. Quando um app passar a
> fazer algo novo (login, localização, dados de saúde, anúncios personalizados…), revise a página gerada.
