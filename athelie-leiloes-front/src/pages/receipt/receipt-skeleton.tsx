import { Bone } from '@/components/skeleton';
import { eyebrow } from './eyebrow';

const RECEIPT_FIELDS = [
  { label: 'Vencedor', bone: 'w-28' },
  { label: 'Encerrado em', bone: 'w-52' },
  { label: 'Código', bone: 'w-32' },
  { label: 'Hash final', bone: 'w-11/12' },
];

/** Mesmo cartão do comprovante, com os rótulos fixos e blocos no lugar dos dados. */
export function ReceiptSkeleton() {
  return (
    <div role="status" aria-label="Carregando o comprovante" className="pt-7">
      <div className="grid max-w-230 items-start gap-6 rounded-[10px] border bg-card p-4 sm:p-5.5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)] md:gap-9 md:p-8">
        <Bone className="aspect-4/5 rounded-[10px] bg-wall" />
        <div className="grid min-w-0 gap-5.5">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-3">
            <span className={`${eyebrow} text-primary`}>Comprovante de arremate</span>
            <Bone className="h-3 w-28" />
          </div>
          <div className="grid gap-px">
            <div className="flex h-5 items-center">
              <Bone className="h-3.5 w-40" />
            </div>
            <div className="flex h-9.5 items-center">
              <Bone className="h-7 w-3/4 rounded-md" />
            </div>
            <div className="flex h-5 items-center">
              <Bone className="h-3 w-56" />
            </div>
          </div>
          <div>
            <div className={`${eyebrow} text-muted-foreground`}>Arrematado por</div>
            <div className="flex h-11.5 items-center">
              <Bone className="h-10 w-56 rounded-md" />
            </div>
          </div>
          <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] items-center gap-x-5 gap-y-2.5 text-sm">
            {RECEIPT_FIELDS.map((field) => (
              <div key={field.label} className="contents">
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="m-0 flex h-5 items-center">
                  <Bone className={`h-3 ${field.bone}`} />
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-2.5">
            <Bone className="h-9 w-52 rounded-lg" />
            <Bone className="h-9 w-44 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
