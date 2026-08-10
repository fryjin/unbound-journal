export const supportedLocales = [
  { code: 'en', label: 'English', tier: 1 },
  { code: 'ja-JP', label: '日本語', tier: 1 },
  { code: 'ko-KR', label: '한국어', tier: 1 },
  { code: 'zh-Hant', label: '繁體中文', tier: 2 },
] as const;

export type SupportedLocale = (typeof supportedLocales)[number]['code'];
