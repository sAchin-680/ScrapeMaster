import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import { REPO_URL } from '@/components/nav-links';
import { siteConfig } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="23 November 2026">
      <section>
        <h2>Summary</h2>
        <p>
          {siteConfig.name} does not have user accounts. We only store what is needed to
          track prices and send the alerts you ask for. We do not sell or share personal
          data for advertising.
        </p>
      </section>
      <section>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Email address</strong>, only when you ask for price alerts on a
            product. It is used solely to send those alerts.
          </li>
          <li>
            <strong>Product links</strong> you track, and public product information read
            from those pages (title, price, image link, rating).
          </li>
          <li>
            <strong>Device notification subscriptions</strong>, only when you choose
            Notify me on a product. Your browser gives us an address at its push service
            and encryption keys, which we store with the products you follow so we can
            send those alerts. It contains no name or email.
          </li>
          <li>
            <strong>A preferences cookie</strong> storing your chosen country and
            currency, and a <strong>watchlist cookie</strong> listing the products you
            save. The watchlist stays in your browser; we read it only to show you that
            page. Your browser also stores small local settings, such as a dismissed
            announcement and which products you get notifications for. No tracking or
            advertising cookies are used.
          </li>
          <li>
            <strong>Standard server logs</strong> (such as IP address and request time)
            kept by our hosting provider for security and reliability.
          </li>
        </ul>
      </section>
      <section>
        <h2>Service providers</h2>
        <p>
          We rely on a database host, an email delivery provider and a web hosting
          provider to run the service. Your browser also loads store logos from
          Google&apos;s favicon service and product images directly from the retailer.
          Daily exchange rates are fetched from a public rates API without any personal
          data. Device notifications are delivered by your browser&apos;s own push service
          (Google, Mozilla, Apple or Microsoft, depending on the browser), which receives
          only the encrypted alert.
        </p>
      </section>
      <section>
        <h2>Retention and your choices</h2>
        <ul>
          <li>
            Every alert email has an unsubscribe link that removes your address from that
            product immediately.
          </li>
          <li>
            Device notifications can be turned off on the product page, which removes that
            product from your subscription. Your subscription is deleted when you follow
            no products, or when your browser&apos;s push service reports it is no longer
            valid, for example after you block notifications.
          </li>
          <li>
            Clearing your browser&apos;s cookies removes your watchlist and preferences.
          </li>
          <li>
            To have all of your data deleted, contact us and we will remove it within 30
            days.
          </li>
          <li>Emails are removed when the product they track is deleted.</li>
        </ul>
      </section>
      <section>
        <h2>Contact</h2>
        <p>
          Questions or deletion requests: <a href={`${REPO_URL}/issues`}>open an issue</a>{' '}
          on the project repository.
        </p>
      </section>
    </LegalPage>
  );
}
