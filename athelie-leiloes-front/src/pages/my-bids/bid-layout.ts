/** A ficha escolhe o próprio layout pela largura que recebe (`@container`), não pela da tela. */
export const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,480px),1fr))] gap-4';
export const CARD_COLUMNS = 'grid grid-cols-[168px_minmax(0,1fr)] @max-[440px]:grid-cols-1';
