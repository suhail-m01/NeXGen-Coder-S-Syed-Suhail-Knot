import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function LoadingButton({ loading, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { loading: boolean; children: ReactNode }) {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading && <LoaderCircle className="spin" size={17} />}
      {children}
    </button>
  );
}
