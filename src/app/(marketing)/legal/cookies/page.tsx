import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Term, type LegalSection } from "@/components/marketing/LegalPage";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "Ship with Snap sets three cookies, all of them needed to keep you signed in. Here is what each one does and how to control them in your browser.",
  alternates: { canonical: "/legal/cookies" },
};

const sections: LegalSection[] = [
  {
    id: "what",
    title: "What we set, and why it is short",
    body: (
      <>
        <p>
          We run no advertising and no third-party analytics that follow you around the web, so the list below is the whole list. Every cookie here is strictly necessary: remove them and you cannot stay signed in.
        </p>
      </>
    ),
  },
  {
    id: "list",
    title: "The cookies",
    body: (
      <>
        <Term term="Session cookie">
          Keeps you signed in between page loads. Set when you log in, cleared when you log out. Expires after 30 days of inactivity.
        </Term>
        <Term term="CSRF token">
          A short-lived value that proves a form submission came from our own pages and not from an attacker&apos;s. Expires with your session.
        </Term>
        <Term term="Preference cookie">
          Remembers small interface choices, such as the shipment filter you last used, so the app opens where you left it.
        </Term>
        <p>
          Public tracking pages set no cookies at all. A recipient following a tracking link is not tracked by us.
        </p>
      </>
    ),
  },
  {
    id: "control",
    title: "Controlling cookies",
    body: (
      <p>
        Every browser lets you view, block and delete cookies in its settings. Blocking ours will sign you out and prevent you from signing back in, because there is no way to keep you authenticated without a session cookie.
      </p>
    ),
  },
  {
    id: "more",
    title: "More on privacy",
    body: (
      <p>
        Cookies are a small part of the picture. Our <Link href="/legal/privacy">Privacy Policy</Link> covers what we collect, who receives it and how to get it deleted. Questions go to <a href={`mailto:${company.email.privacy}`}>{company.email.privacy}</a>.
      </p>
    ),
  },
];

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      summary="Three cookies, all of them necessary to keep you signed in. No advertising cookies, and none at all on public tracking pages."
      sections={sections}
    />
  );
}
