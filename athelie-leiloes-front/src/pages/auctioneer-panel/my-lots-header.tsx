import { TableHead, TableHeader, TableRow } from '@/components/ui/table';

export function MyLotsHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Lote</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Quando</TableHead>
        <TableHead className="text-right">Lances</TableHead>
        <TableHead className="text-right">Valor</TableHead>
        <TableHead>
          <span className="sr-only">Ações</span>
        </TableHead>
      </TableRow>
    </TableHeader>
  );
}
