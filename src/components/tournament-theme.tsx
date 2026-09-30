import type { ReactNode } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { featuredCrests, tournamentThemes } from "@/lib/theme";
import type { TournamentType } from "@/lib/tournament/types";
import { CrestBadge } from "./scene/crest";
import { HeroScene, PanelScene } from "./scene/hero-scene";

export function ThemeBackdrop() {
  return <div aria-hidden className="theme-backdrop" />;
}

function CrestRow({ type, t }: { type: TournamentType; t: Dictionary }) {
  return (
    <ul className="crest-row">
      {featuredCrests(type).map((crest) => (
        <li key={crest.name} className="crest-row__item">
          <CrestBadge crest={crest} uid={`row-${type}-${crest.initials}`} size={56} />
          <span className="crest-row__name">{t.tournaments.crestName(crest.name)}</span>
        </li>
      ))}
    </ul>
  );
}

export function TournamentHero({
  type,
  title,
  meta,
  back,
  actions,
  t,
}: {
  type: TournamentType;
  title: string;
  meta: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
  t: Dictionary;
}) {
  const theme = tournamentThemes[type];

  return (
    <section className="theme-fade grid gap-3">
      <div className="hero">
        <div className="hero__scene hero__scene--wide">
          <HeroScene type={type} variant="wide" label={t.tournaments.sceneLabels[type]} />
        </div>
        <div className="hero__scene hero__scene--narrow">
          <HeroScene type={type} variant="narrow" label={t.tournaments.sceneLabels[type]} />
        </div>

        <div className="hero__content">
          <div className="hero__bar">
            {back}
            {actions}
          </div>
          <div className="hero__headline">
            <h1 className="hero__title">{title}</h1>
            <p className="hero__meta">
              <span aria-hidden>{theme.emoji}</span> {meta}
            </p>
            <p className="hero__tagline">{t.tournaments.taglines[type]}</p>
          </div>
        </div>
      </div>

      <CrestRow type={type} t={t} />
    </section>
  );
}

export function ThemePanel({
  type,
  children,
}: {
  type: TournamentType;
  children: ReactNode;
}) {
  return (
    <section className="theme-fade panel">
      <div className="panel__scene">
        <PanelScene type={type} />
      </div>
      <div className="panel__content">{children}</div>
    </section>
  );
}
