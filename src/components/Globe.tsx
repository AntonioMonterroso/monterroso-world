// Mundito: meridianos que giran + una órbita pequeña. Es el sello de Monterroso World.
export default function Globe({ size = 28 }: { size?: number }) {
  return (
    <svg className="globe" viewBox="0 0 32 32" width={size} height={size} aria-hidden fill="none" stroke="var(--brass)" strokeWidth="1.4" strokeLinecap="round">
      <circle cx="16" cy="16" r="10" />
      <ellipse className="mer" cx="16" cy="16" rx="10" ry="10" />
      <ellipse className="mer" cx="16" cy="16" rx="10" ry="10" />
      <ellipse className="mer" cx="16" cy="16" rx="10" ry="10" />
      <path d="M6.4 12.5h19.2M6.4 19.5h19.2" />
      <g className="orbit">
        <circle cx="16" cy="2.6" r="1.7" fill="var(--sky)" stroke="none" />
      </g>
    </svg>
  )
}
