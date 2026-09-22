import type { Project } from '@/data/portfolio';

/**
 * A link only renders when it is configured. `liveUrl: null` means no `Live` link
 * exists anywhere in the markup - setting the URL later is the only change needed.
 */
function links(project: Project) {
  const out: { label: string; href: string }[] = [];
  if (project.githubUrl) out.push({ label: 'GitHub', href: project.githubUrl });
  if (project.liveUrl) out.push({ label: 'Live', href: project.liveUrl });
  if (project.extraLink) out.push(project.extraLink);
  return out;
}

export default function ProjectDetail({ project }: { project: Project }) {
  const external = links(project);

  return (
    <>
      <p className="detail__meta">{project.subtitle}</p>

      <div className="detail__body">
        <p>{project.description}</p>
        {project.architecture && (
          <p className="detail__arch">{project.architecture}</p>
        )}
      </div>

      <div className="detail__section">
        <p className="detail__label">Selected work</p>
        <ul className="detail__points">
          {project.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      </div>

      <div className="detail__section">
        <p className="detail__label">Stack</p>
        <ul className="detail__stack">
          {project.technologies.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>

      {project.inProgress && <p className="detail__note">{project.inProgress}</p>}

      {external.length > 0 && (
        <div className="detail__links">
          {external.map(({ label, href }) => (
            <a
              key={label}
              className="detail__link"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
            >
              {label} <span aria-hidden="true">&#8599;</span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ))}
        </div>
      )}
    </>
  );
}
