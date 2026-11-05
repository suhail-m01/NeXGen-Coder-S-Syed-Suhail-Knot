export function HackathonSkeleton({ count = 6 }: { count?: number }) {
  return <div className="hackathon-grid" role="status" aria-label="Loading hackathons" aria-busy="true">{Array.from({ length: count }, (_, index) => <div className="hackathon-skeleton" key={index}><span /><div><i /><i /><i /><i /></div></div>)}</div>;
}
