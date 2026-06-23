export const GA_MEASUREMENT_ID = "G-717BB12JJ8";
export const GA_CONSENT_DEFAULT = {
  analytics_storage: "granted",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

const GOOGLE_TAG_SCRIPT_ID = "google-tag-manager-gtag";
const ANALYTICS_HOSTS = new Set(["pixelplease.tools", "www.pixelplease.tools"]);

type GtagArguments = [command: string, ...args: unknown[]];

declare global {
  interface Window {
    dataLayer?: GtagArguments[];
    gtag?: (...args: GtagArguments) => void;
  }
}

export function shouldEnableAnalytics(hostname: string): boolean {
  return ANALYTICS_HOSTS.has(hostname.trim().toLowerCase());
}

export function getGoogleTagScriptSrc(measurementId = GA_MEASUREMENT_ID): string {
  return `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
}

export function initializeAnalytics(): void {
  if (!shouldEnableAnalytics(window.location.hostname)) {
    return;
  }

  window.dataLayer ??= [];

  if (!window.gtag) {
    window.gtag = (...args: GtagArguments) => {
      window.dataLayer?.push(args);
    };
  }

  const hasConsentDefault = window.dataLayer.some(
    (entry) => entry[0] === "consent" && entry[1] === "default",
  );

  if (!hasConsentDefault) {
    window.gtag("consent", "default", GA_CONSENT_DEFAULT);
  }

  if (!document.getElementById(GOOGLE_TAG_SCRIPT_ID)) {
    const script = document.createElement("script");
    script.id = GOOGLE_TAG_SCRIPT_ID;
    script.async = true;
    script.src = getGoogleTagScriptSrc();
    document.head.appendChild(script);
  }

  const isAlreadyConfigured = window.dataLayer.some(
    (entry) => entry[0] === "config" && entry[1] === GA_MEASUREMENT_ID,
  );

  if (isAlreadyConfigured) {
    return;
  }

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
}
