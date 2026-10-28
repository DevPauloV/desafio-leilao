import { useEffect, useRef, useState } from 'react';

/** Abaixo disso o loader nem aparece; depois de aparecer, fica o mínimo para não virar um flash. */
const LOADER_DELAY_MS = 200;
const LOADER_MIN_VISIBLE_MS = 400;
/** Tempo do fade de saída do splash; igual a `--animate-splash-out` do index.css. */
const LOADER_EXIT_MS = 300;

export function useLoaderVisible(active: boolean): boolean {
  const [visible, setVisible] = useState(false);
  const shownAt = useRef(0);

  useEffect(() => {
    if (active && !visible) {
      const timer = setTimeout(() => {
        shownAt.current = Date.now();
        setVisible(true);
      }, LOADER_DELAY_MS);
      return () => clearTimeout(timer);
    }
    if (!active && visible) {
      const remaining = LOADER_MIN_VISIBLE_MS - (Date.now() - shownAt.current);
      const timer = setTimeout(() => setVisible(false), Math.max(remaining, LOADER_EXIT_MS));
      return () => clearTimeout(timer);
    }
  }, [active, visible]);

  return visible;
}
