import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/lib/money';
import { dayKey, formatDayHeader, formatShortDate, formatTime } from '@/lib/time';
import type { WalletEntry } from '@/types';
import { EntryAmount } from './entry-amount';
import { EntryTitle } from './entry-title';
import { ENTRY_VIEW } from './entry-view';

type Day = { key: string; header: string; entries: WalletEntry[] };

/** A lista já vem do mais recente ao mais antigo; só agrupa os vizinhos do mesmo dia. */
function groupByDay(entries: WalletEntry[]): Day[] {
  const days: Day[] = [];
  for (const entry of entries) {
    const key = dayKey(entry.createdAt);
    const last = days[days.length - 1];
    if (last?.key === key) last.entries.push(entry);
    else days.push({ key, header: formatDayHeader(entry.createdAt), entries: [entry] });
  }
  return days;
}

const DAY_HEADER = 'bg-muted px-4 py-2 text-[11.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase';

/** Tabela no desktop e lista de cartões no celular, com os mesmos movimentos e agrupados por dia. */
export function EntriesList({ entries }: { entries: WalletEntry[] }) {
  const days = groupByDay(entries);
  return (
    <>
      <div className="hidden overflow-hidden rounded-[10px] border bg-card md:block">
        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Data</TableHead>
              <TableHead>Movimento</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Saldo total</TableHead>
              <TableHead className="text-right">Disponível</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => (
              <Fragment key={day.key}>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className={DAY_HEADER}>
                    {day.header}
                  </TableCell>
                </TableRow>
                {day.entries.map((entry) => {
                  const view = ENTRY_VIEW[entry.type];
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-[12.5px] tabular-nums">{formatShortDate(entry.createdAt)}</TableCell>
                      <TableCell className="max-w-90 whitespace-normal">
                        <div className="grid justify-items-start gap-0.5">
                          <Badge variant={view.variant}>{view.label}</Badge>
                          <EntryTitle entry={entry} />
                          <span className="text-xs text-muted-foreground">{view.note}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <EntryAmount entry={entry} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-[13px] tabular-nums">{formatMoney(entry.balance)}</TableCell>
                      <TableCell className="text-right font-mono text-[13px] font-bold tabular-nums">{formatMoney(entry.available)}</TableCell>
                    </TableRow>
                  );
                })}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="overflow-hidden rounded-[10px] border bg-card md:hidden">
        {days.map((day) => (
          <section key={day.key} aria-label={day.header}>
            <h3 className={DAY_HEADER}>{day.header}</h3>
            <ul className="divide-y">
              {day.entries.map((entry) => {
                const view = ENTRY_VIEW[entry.type];
                return (
                  <li key={entry.id} className="grid gap-1 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid min-w-0 justify-items-start gap-0.5">
                        <Badge variant={view.variant}>{view.label}</Badge>
                        <EntryTitle entry={entry} />
                      </div>
                      <EntryAmount entry={entry} />
                    </div>
                    <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {formatTime(entry.createdAt)} · {view.note}
                      </span>
                      <span>
                        Disponível <b className="font-mono font-semibold text-foreground tabular-nums">{formatMoney(entry.available, { short: true })}</b>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
