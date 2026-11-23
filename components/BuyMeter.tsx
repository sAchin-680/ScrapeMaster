import { CalendarClock, CircleCheck, TrendingDown, TrendingUp } from 'lucide-react';
import DealBadge from '@/components/DealBadge';
import type { DealVerdict } from '@/lib/deal';
import type { Forecast } from '@/lib/forecast';
import { cn } from '@/lib/utils';

function OutlookIcon({ forecast }: { forecast: Forecast }) {
  const Icon =
    forecast.sale && !forecast.sale.live
      ? CalendarClock
      : forecast.advice === 'wait'
        ? TrendingDown
        : forecast.weeklyTrend !== undefined && forecast.weeklyTrend >= 0.02
          ? TrendingUp
          : CircleCheck;
  return <Icon className="size-4" aria-hidden />;
}

/** "Should you buy now?" gauge from the product's own price range, plus the outlook. */
export default function BuyMeter({
  verdict,
  forecast,
}: {
  verdict: DealVerdict;
  forecast?: Forecast | null;
}) {
  return (
    <section className="card p-5 sm:p-6" aria-labelledby="buy-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="buy-heading" className="font-semibold">
          Should you buy now?
        </h2>
        <DealBadge verdict={verdict} />
      </div>
      <p className="mt-1 text-sm text-muted">{verdict.reason}</p>

      {verdict.level !== 'new' && (
        <div className="mt-5">
          <div
            className="relative h-2 rounded-full bg-linear-to-r from-up/70 via-amber-400/70 to-down/80"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={verdict.score}
            aria-label="Deal score"
          >
            <span
              className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink shadow-sm"
              style={{ left: `${verdict.score}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>Highest price</span>
            <span>Lowest price</span>
          </div>
        </div>
      )}

      {forecast && (
        <div
          className={cn(
            'mt-5 flex gap-3 rounded-xl border p-4',
            forecast.advice === 'buy'
              ? 'border-down/25 bg-down/[0.06]'
              : 'border-accent/25 bg-accent/[0.06]',
          )}
        >
          <span
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-lg',
              forecast.advice === 'buy'
                ? 'bg-down/15 text-down'
                : 'bg-accent/15 text-accent',
            )}
          >
            <OutlookIcon forecast={forecast} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">Outlook</p>
            <p className="font-semibold">{forecast.headline}</p>
            <ul className="mt-1.5 flex flex-col gap-1 text-sm text-muted">
              {forecast.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
