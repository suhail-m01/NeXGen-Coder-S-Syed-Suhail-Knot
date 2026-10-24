import { Link } from 'react-router-dom';

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link to="/" className={`brand ${inverse ? 'brand--inverse' : ''}`} aria-label="Knot home">
      <svg className="brand__mark" viewBox="0 0 40 40" role="img" aria-hidden="true">
        <path d="M12 9c-5 0-8 3-8 7s3 7 8 7c3 0 5-1 7-3l9-9c2-2 4-3 7-3 4 0 7 3 7 6s-3 6-7 6c-3 0-5-1-7-3L12 29" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="29" cy="29" r="6" fill="currentColor" />
      </svg>
      <span>knot</span>
    </Link>
  );
}
