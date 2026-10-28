import { useState } from 'react';
import { ApiError, errorMessage } from '@/lib/api';

/** Estado de envio de formulário: `submitting` enquanto a ação roda; a mensagem e os erros por campo se ela falhar. */
export function useSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Partial<Record<string, string>>>({});

  /** Devolve se a ação deu certo. */
  async function submit(action: () => Promise<unknown>): Promise<boolean> {
    setSubmitting(true);
    setError(null);
    setFields({});
    try {
      await action();
      return true;
    } catch (err) {
      setError(errorMessage(err));
      if (err instanceof ApiError) setFields(err.fields);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { submitting, error, setError, fields, setFields, submit };
}
