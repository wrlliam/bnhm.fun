import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { notFound } from "next/navigation";
import { guideBySlug, GUIDES } from "@/lib/guides";
import { gameMetadata } from "@/lib/seo";
import { RANK_ORDER, RULES } from "@/lib/ring-of-fire";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/how-to-play/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return gameMetadata(slug, { path: `/how-to-play/${slug}`, prefix: "How to play" });
}

export default async function GuidePage({ params }: PageProps<"/how-to-play/[slug]">) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10 sm:pl-20">
      <SiteNav />
      <Link href="/how-to-play" className="text-xs text-faint hover:text-ink">
        ← All games
      </Link>
      <h1 className="font-hand text-6xl font-bold leading-none">{g.name}</h1>
      <p className="mt-2 text-lg">{g.tagline}</p>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div>
          <dt className="inline text-faint">Players </dt>
          <dd className="inline font-medium">{g.players}</dd>
        </div>
        <div>
          <dt className="inline text-faint">Time </dt>
          <dd className="inline font-medium">{g.time}</dd>
        </div>
        {g.drinking && <div className="text-faint">Drinking game · 18+ · water and forfeits always fine</div>}
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        {g.modes.map((m, i) => (
          <Link
            key={m.href}
            href={m.href}
            className={
              i === 0
                ? "rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper hover:bg-ink/90"
                : "rounded-md border-2 border-ink px-5 py-2 text-sm font-medium hover:bg-ink hover:text-paper"
            }
          >
            {m.label}
          </Link>
        ))}
      </div>

      <p className="mt-10 text-lg leading-relaxed">{g.overview}</p>

      {g.setup.length > 0 && (
        <Block title="Setup">
          <ol className="list-decimal space-y-2 pl-5">
            {g.setup.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Block>
      )}

      <Block title="How to play">
        <ol className="list-decimal space-y-2 pl-5">
          {g.howToPlay.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Block>

      {g.cardTable && (
        <Block title="What each card means">
          <div className="divide-y divide-ink/10 rounded-xl border border-ink/15 bg-surface">
            {RANK_ORDER.map((r) => {
              const rule = RULES[r];
              return (
                <div key={r} className="grid grid-cols-[3rem_1fr] gap-3 p-4">
                  <span className="font-mono text-2xl font-bold">{r}</span>
                  <div>
                    <p className="font-hand text-3xl font-bold leading-none">{rule.name}</p>
                    <p className="mt-1">{rule.text}</p>
                    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-faint">
                      {rule.how.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                    {rule.example && (
                      <p className="mt-1 text-sm text-faint">
                        <span className="font-medium text-ink">Example: </span>
                        {rule.example}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Block>
      )}

      {g.rules && (
        <Block title="Rules">
          <dl className="space-y-3">
            {g.rules.map((r) => (
              <div key={r.title}>
                <dt className="font-medium">{r.title}</dt>
                <dd className="text-faint">{r.text}</dd>
              </div>
            ))}
          </dl>
        </Block>
      )}

      {g.tips && (
        <Block title="Tips">
          <ul className="list-disc space-y-1 pl-5 text-faint">
            {g.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Block>
      )}
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 font-hand text-4xl font-bold">{title}</h2>
      {children}
    </section>
  );
}
