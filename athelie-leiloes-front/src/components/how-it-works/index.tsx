import { useEffect, useState } from 'react';
import { cn } from 'cn';
import { ShortHash } from '@/components/short-hash';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoneyInput, parseMoney } from '@/lib/money';
import { SAMPLE_AMOUNTS, getOriginalChain, linkHash } from './chain-demo';

const STEPS = [
  { title: 'Cada lance se encadeia', text: 'Ele guarda o hash do lance anterior, formando uma corrente.' },
  { title: 'O servidor assina', text: 'O hash é assinado com uma chave secreta que não fica no banco de dados.' },
  { title: 'A auditoria confere', text: 'Se algo for alterado, apagado ou inserido direto no banco, a assinatura deixa de bater.' },
];

type Check = { hash: string; ok: boolean; removed?: boolean };

/** Explicação em três passos e, recolhida, uma simulação: o visitante edita um valor e vê a corrente quebrar. */
export function HowItWorks() {
  const [open, setOpen] = useState(false);
  const [texts, setTexts] = useState(() => SAMPLE_AMOUNTS.map(formatMoneyInput));
  const [removed, setRemoved] = useState(() => SAMPLE_AMOUNTS.map(() => false));
  const [checks, setChecks] = useState<Check[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    getOriginalChain().then(async (chain) => {
      const result: Check[] = [];
      for (const [index, link] of chain.entries()) {
        if (removed[index]) {
          result.push({ hash: '', ok: false, removed: true });
          continue;
        }
        const hash = await linkHash(link.prev, index + 1, parseMoney(texts[index]) ?? 0);
        result.push({ hash, ok: hash === link.hash });
      }
      if (!cancelled) setChecks(result);
    });
    return () => {
      cancelled = true;
    };
  }, [open, texts, removed]);

  const brokenIndex = checks.findIndex((check) => !check.ok);
  const brokenAt = brokenIndex + 1;
  const altered = brokenIndex >= 0;
  const brokenRemoved = altered && checks[brokenIndex].removed;
  // Sem lance depois do removido, não há buraco no meio: o que não confere é o fim da corrente.
  const removedAtEnd = brokenRemoved && removed.slice(brokenIndex).every(Boolean);
  const present = removed.filter((gone) => !gone).length;

  let statusText = 'conferida';
  let message = 'Todos os elos conferem. Mude um valor ou remova uma linha para ver a diferença.';
  if (removedAtEnd) {
    statusText = 'adulterada, fim da corrente';
    message = 'O último lance foi removido, então o fim da corrente não confere com o registro do lote.';
  } else if (brokenRemoved) {
    statusText = `adulterada, elo #${brokenAt} removido`;
    message = `O lance #${brokenAt} foi removido e deixou um buraco: o lance seguinte aponta para um hash que não existe mais.`;
  } else if (altered) {
    statusText = `adulterada, elo #${brokenAt}`;
    message = `O lance #${brokenAt} foi alterado, então a assinatura dele deixou de conferir e a corrente quebra aqui.`;
  }

  function restore() {
    setTexts(SAMPLE_AMOUNTS.map(formatMoneyInput));
    setRemoved(SAMPLE_AMOUNTS.map(() => false));
  }

  return (
    <section className="grid gap-6">
      <h2 className="text-[17px] font-extrabold tracking-tight">Como a verificação funciona</h2>

      <ol className="grid gap-4 sm:grid-cols-3 sm:gap-6">
        {STEPS.map((step, index) => (
          <li key={step.title} className="grid content-start gap-1 text-sm">
            <span className="font-mono text-xs text-primary">{String(index + 1).padStart(2, '0')}</span>
            <b className="text-[15px]">{step.title}</b>
            <p className="text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="rounded-[10px] border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5.5 sm:py-4.5">
          <p className="max-w-[58ch] text-sm text-muted-foreground">
            <b className="font-semibold text-foreground">Quer ver a corrente quebrar?</b> Cada lance é assinado junto
            com o anterior, e qualquer mudança é detectada. Dá para testar aqui, sem mexer no lote real.
          </p>
          <Button type="button" variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? 'Fechar simulação' : 'Abrir simulação'}
          </Button>
        </div>

        {open && (
          <div className="grid gap-3.5 border-t border-dashed border-primary p-4 sm:px-5.5 sm:pt-4.5 sm:pb-5.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-primary px-2.5 py-0.5 text-[11px] font-extrabold tracking-widest text-primary">
                SIMULAÇÃO
              </span>
              <button
                type="button"
                onClick={restore}
                className="text-[13px] text-primary underline underline-offset-4"
              >
                restaurar valores
              </button>
            </div>
            <p className="max-w-[64ch] text-[13px] text-muted-foreground">
              <b className="font-semibold text-foreground">Teste à vontade:</b> edite um valor ou remova uma linha e
              veja o status virar &quot;adulterada&quot;. Nada aqui altera o lote real. O cálculo roda só no seu navegador, com SHA-256; o
              servidor usa HMAC com chave secreta.
            </p>

            <div aria-live="polite" className="grid gap-2">
              <div className="flex flex-wrap items-center gap-x-4.5 gap-y-1.5 border-y py-3 font-mono text-[13px]">
                <span className={cn('size-2.5 rounded-full', altered ? 'bg-destructive' : 'bg-win')} aria-hidden="true" />
                <b className={cn('font-medium', altered ? 'text-destructive' : 'text-win')}>
                  {statusText}
                </b>
                <span className="text-muted-foreground">
                  {present} {present === 1 ? 'elo' : 'elos'}
                </span>
                <span className="text-muted-foreground sm:ml-auto">simulação, não é o lote real</span>
              </div>
              <p className={cn('min-h-5 text-[13px]', altered ? 'text-destructive' : 'text-muted-foreground')}>
                {message}
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Valor (R$)</TableHead>
                  <TableHead className="hidden sm:table-cell">Hash recalculado</TableHead>
                  <TableHead>Confere</TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {texts.map((text, index) => {
                  const check = checks[index];
                  const gone = removed[index];
                  return (
                    <TableRow key={index} className={check && !check.ok ? 'bg-destructive-soft' : undefined}>
                      <TableCell className="font-mono">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          inputMode="decimal"
                          value={text}
                          disabled={gone}
                          aria-label={`Valor do lance ${index + 1} em reais`}
                          onChange={(event) => setTexts((prev) => prev.map((t, i) => (i === index ? event.target.value : t)))}
                          className={cn('h-8 w-28 font-mono', gone && 'line-through')}
                        />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {check && !check.removed && <ShortHash hash={check.hash} />}
                      </TableCell>
                      <TableCell className={cn('font-semibold', check?.ok ? 'text-win' : 'text-destructive')}>
                        {check && (check.removed ? 'Removido' : check.ok ? 'Sim' : 'Não')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemoved((prev) => prev.map((r, i) => (i === index ? !r : r)))}
                        >
                          {gone ? 'Desfazer' : 'Remover'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </section>
  );
}
