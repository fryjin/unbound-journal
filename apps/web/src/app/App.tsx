import { useTranslation } from 'react-i18next';
import { EditorShell } from '../editor/EditorShell';
import { supportedLocales, type SupportedLocale } from '../i18n/locales';

export function App() {
  const { i18n, t } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? 'en') as SupportedLocale;

  const changeLocale = async (nextLocale: SupportedLocale) => {
    await i18n.changeLanguage(nextLocale);
    window.localStorage.setItem('unbound-journal.locale', nextLocale);
    document.documentElement.lang = nextLocale;
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">P0.2</p>
          <h1>{t('app.title')}</h1>
        </div>
        <label className="locale-picker">
          <span className="sr-only">{t('app.language')}</span>
          <select
            value={locale}
            onChange={(event) => void changeLocale(event.target.value as SupportedLocale)}
          >
            {supportedLocales.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <EditorShell />
    </main>
  );
}
