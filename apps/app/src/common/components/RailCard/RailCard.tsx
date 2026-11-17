import type { ReactNode } from 'react';
import './RailCard.css';

/** One block in the wide-screen rail beside a tab page: a heading and what goes under it. */
export function RailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rail-card">
      <h2 className="rail-card__title">{title}</h2>
      {children}
    </section>
  );
}
