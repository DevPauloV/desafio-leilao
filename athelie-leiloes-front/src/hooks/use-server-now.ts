import { useEffect, useState } from 'react';
import { SECOND_MS } from '@/lib/time';

export function useServerNow(offset: number): number {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), SECOND_MS);
    return () => clearInterval(timer);
  }, [offset]);
  return now;
}
