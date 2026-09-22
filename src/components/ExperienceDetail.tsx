import type { Role } from '@/data/portfolio';

export default function ExperienceDetail({ role }: { role: Role }) {
  return (
    <>
      <p className="detail__lead">{role.title}</p>
      <p className="detail__meta detail__meta--under">
        {role.period} &middot; {role.location}
      </p>

      <div className="detail__section">
        <p className="detail__label">Responsibilities</p>
        <ul className="detail__points">
          {role.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    </>
  );
}
