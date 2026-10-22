'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { InlineBrand } from '@/components/inline-brand';

const GTM_ID = 'GTM-KW2PQNF';
const CONSENT_KEY = 'wildnews_analytics_consent';
const SETTINGS_EVENT = 'wildnews:open-cookie-settings';
const CONSENT_EVENT = 'wildnews:analytics-consent-changed';

type ConsentChoice = 'granted' | 'denied';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

function loadGoogleTagManager() {
  if (document.querySelector(`script[data-wildnews-gtm="${GTM_ID}"]`)) return;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

  const script = document.createElement('script');
  script.async = true;
  script.dataset.wildnewsGtm = GTM_ID;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
  document.head.appendChild(script);
}

function clearGoogleAnalyticsCookies() {
  const analyticsCookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter((name) => name === '_gid' || name === '_gat' || name.startsWith('_ga'));

  for (const name of analyticsCookieNames) {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.wildteam.org.uk; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=news.wildteam.org.uk; SameSite=Lax`;
  }
}

function getConsentChoice(): ConsentChoice | null {
  const storedChoice = window.localStorage.getItem(CONSENT_KEY);
  return storedChoice === 'granted' || storedChoice === 'denied' ? storedChoice : null;
}

function subscribeToConsentChoice(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(CONSENT_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(CONSENT_EVENT, onStoreChange);
  };
}

export function AnalyticsConsent() {
  const pathname = usePathname();
  const choice = useSyncExternalStore(subscribeToConsentChoice, getConsentChoice, () => undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!pathname.startsWith('/admin') && choice === 'granted' && window.location.hostname === 'news.wildteam.org.uk') {
      loadGoogleTagManager();
    }
  }, [choice, pathname]);

  useEffect(() => {
    const openSettings = () => setSettingsOpen(true);
    window.addEventListener(SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(SETTINGS_EVENT, openSettings);
  }, []);

  function saveChoice(nextChoice: ConsentChoice) {
    const previouslyGranted = choice === 'granted';
    window.localStorage.setItem(CONSENT_KEY, nextChoice);
    window.dispatchEvent(new Event(CONSENT_EVENT));
    setSettingsOpen(false);

    if (nextChoice === 'granted' && window.location.hostname === 'news.wildteam.org.uk') {
      loadGoogleTagManager();
    }

    if (nextChoice === 'denied') {
      clearGoogleAnalyticsCookies();
      if (previouslyGranted) window.location.reload();
    }
  }

  if (pathname.startsWith('/admin') || choice === undefined || (choice !== null && !settingsOpen)) return null;

  return <section className="analytics-consent" aria-label="Analytics cookie settings">
    <button
      type="button"
      className="analytics-consent-close"
      aria-label="Close cookie settings and continue without analytics"
      onClick={() => saveChoice('denied')}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>
    <div className="analytics-consent-copy">
      <p className="eyebrow">Your privacy</p>
      <h2>Help us improve <InlineBrand text="WILDNEWS" /></h2>
      <p>We use Google Analytics to understand how people use WildNews. Analytics stays off unless you accept it. <a href="https://training.wildteam.org.uk/cookies" target="_blank" rel="noopener noreferrer">Read our cookie policy</a>.</p>
    </div>
    <div className="analytics-consent-actions">
      <button type="button" className="analytics-consent-secondary" onClick={() => saveChoice('denied')}>No thanks</button>
      <button type="button" className="analytics-consent-primary" onClick={() => saveChoice('granted')}>Accept analytics</button>
    </div>
  </section>;
}

export function CookieSettingsButton() {
  return <button
    type="button"
    className="wildteam-footer-cookie-button"
    onClick={() => window.dispatchEvent(new Event(SETTINGS_EVENT))}
  >Cookie settings</button>;
}
