import mongoose, { Types, type PipelineStage } from 'mongoose';
import { env } from '../config/env.js';
import {
  ErrorCode,
  GENESIS_HASH,
  LOCALE,
  LOT_DETAIL_BIDS_LIMIT,
  LOT_PERIOD_MS,
  LOTS_PAGE_SIZE,
  LotState,
  LotStatus,
  Role,
  SocketEvent,
} from '../constants.js';
import { headSignature, pseudonym } from '../domain/audit-chain.js';
import { lotStatus, minimumNextBid } from '../domain/bid-rules.js';
import { AppError } from '../errors.js';
import type { AuthUser } from '../middlewares/auth.js';
import { Bid, toBidView, type BidView } from '../models/Bid.js';
import { Image } from '../models/Image.js';
import { Lot, type LotDoc } from '../models/Lot.js';
import { User } from '../models/User.js';
import { emitToLot, emitToUser, notifyAfterCommit } from '../realtime/socket.js';
import { SHOWCASE_ORDER, type CreateLotInput, type ListLotsQuery } from '../schemas/lots.js';
import * as met from './met.js';
import { getWallet } from './wallet.js';

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const UNUSABLE_ARTWORK = 'Obra não encontrada ou sem imagem de domínio público que possa ser copiada.';

export const imageUrl = (imageId: Types.ObjectId) => `/api/images/${imageId.toString()}`;

export function toLotSummary(lot: LotDoc, now: Date) {
  return {
    id: lot._id.toString(),
    title: lot.item.title,
    artist: lot.item.artist ?? null,
    date: lot.item.date ?? null,
    medium: lot.item.medium ?? null,
    imageUrl: imageUrl(lot.item.imageId),
    status: lotStatus(lot, now),
    startsAt: lot.startsAt,
    endsAt: lot.endsAt,
    startingBid: lot.startingBid,
    currentBid: lot.currentBid ?? null,
    bidCount: lot.bidCount,
    department: lot.item.department ?? null,
  };
}

type MyPosition = {
  pseudonym: string;
  isLeader: boolean;
  position: number | null;
  totalBidders: number;
  receiptCode?: string;
};

function publicResult(result: NonNullable<LotDoc['result']>) {
  return {
    sold: result.winnerId != null,
    winnerPseudonym: result.winnerPseudonym ?? null,
    amount: result.amount ?? null,
    settledAt: result.settledAt,
  };
}

function toLotDetail(lot: LotDoc, now: Date, bids: BidView[], me?: MyPosition) {
  return {
    ...toLotSummary(lot, now),
    item: {
      title: lot.item.title,
      artist: lot.item.artist ?? null,
      date: lot.item.date ?? null,
      medium: lot.item.medium ?? null,
      department: lot.item.department ?? null,
      metUrl: lot.item.metUrl ?? null,
      imageUrl: imageUrl(lot.item.imageId),
    },
    minIncrement: lot.minIncrement,
    minimumNextBid: minimumNextBid(lot),
    serverTime: now,
    bids,
    ...(me && { me }),
    ...(lot.result && { result: publicResult(lot.result) }),
  };
}

export type ArtworkCopy = Omit<met.Artwork, 'imageUrl'>;
type LotTerms = Pick<CreateLotInput, 'startingBid' | 'minIncrement' | 'startsAt' | 'endsAt'>;

/** Busca a obra no Met de novo: não confia nos dados vindos do navegador. */
export async function createLot(auctioneerId: string, input: CreateLotInput) {
  const unusable = () => new AppError(ErrorCode.VALIDATION_ERROR, { fields: { metObjectId: UNUSABLE_ARTWORK } });
  const artwork = await met.fetchObject(input.metObjectId);
  if (!artwork) throw unusable();
  const image = await met.downloadImage(artwork.imageUrl);
  if (!image) throw unusable();
  const lot = await saveLot(auctioneerId, artwork, image, input);
  return toLotDetail(lot, new Date(), []);
}

/** Numa transação: se o lote falhar, não sobra imagem órfã. */
export async function saveLot(auctioneerId: string, artwork: ArtworkCopy, image: met.DownloadedImage, terms: LotTerms) {
  const lotId = new Types.ObjectId();
  const lot = await mongoose.connection.transaction(async (session) => {
    const [savedImage] = await Image.create([image], { session });
    const [created] = await Lot.create(
      [
        {
          _id: lotId,
          auctioneerId,
          item: {
            metObjectId: artwork.metObjectId,
            title: artwork.title,
            artist: artwork.artist,
            date: artwork.date,
            medium: artwork.medium,
            department: artwork.department,
            metUrl: artwork.metUrl,
            imageId: savedImage!._id,
          },
          startingBid: terms.startingBid,
          minIncrement: terms.minIncrement,
          startsAt: terms.startsAt,
          endsAt: terms.endsAt,
          // Cabeça da cadeia vazia, já assinada: a auditoria verifica desde o lote sem lances.
          chainHead: { lastHash: GENESIS_HASH, signature: headSignature(env.AUDIT_SECRET, lotId.toString(), 0, GENESIS_HASH) },
        },
      ],
      { session },
    );
    return created!;
  });
  return lot.toObject();
}

/** O status é recalculado no banco para ordenar e paginar; espelha `lotStatus` (o teste confere). */
export async function listLots(query: ListLotsQuery) {
  const now = new Date();
  const search = query.q ? new RegExp(escapeRegex(query.q), 'i') : null;
  const window = query.period && LOT_PERIOD_MS[query.period];
  const price = { ...(query.minPrice !== undefined && { $gte: query.minPrice }), ...(query.maxPrice !== undefined && { $lte: query.maxPrice }) };
  // Contagens de departamento e artista são da aba inteira: os outros filtros não as mudam.
  const facet = (field: string): PipelineStage.FacetPipelineStage[] => [
    { $match: { [field]: { $type: 'string' } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ];
  const filtered: PipelineStage.FacetPipelineStage[] = [
    {
      $match: {
        ...(search && { $or: [{ 'item.title': search }, { 'item.artist': search }] }),
        ...(query.department && { 'item.department': query.department }),
        ...(query.artist && { 'item.artist': query.artist }),
        ...(Object.keys(price).length > 0 && { _price: price }),
        ...(window && {
          $and: [
            {
              $or: [
                { _status: LotStatus.LIVE, endsAt: { $lte: new Date(now.getTime() + window) } },
                { _status: LotStatus.SCHEDULED, startsAt: { $lte: new Date(now.getTime() + window) } },
                { _status: LotStatus.ENDED, endsAt: { $gte: new Date(now.getTime() - window) } },
              ],
            },
          ],
        }),
      },
    },
  ];
  const pipeline: PipelineStage[] = [
    { $match: { state: { $ne: LotState.CANCELLED } } },
    {
      $addFields: {
        _status: {
          $switch: {
            branches: [
              { case: { $ne: ['$state', LotState.ACTIVE] }, then: LotStatus.ENDED },
              { case: { $lt: [now, '$startsAt'] }, then: LotStatus.SCHEDULED },
              { case: { $lt: [now, '$endsAt'] }, then: LotStatus.LIVE },
            ],
            default: LotStatus.ENDED,
          },
        },
      },
    },
    ...(query.status ? [{ $match: { _status: query.status } }] : []),
    {
      $addFields: {
        _price: { $ifNull: ['$currentBid', '$startingBid'] },
        _rank: { $indexOfArray: [SHOWCASE_ORDER, '$_status'] },
        _sortKey: {
          $switch: {
            branches: [
              { case: { $eq: ['$_status', LotStatus.LIVE] }, then: { $toLong: '$endsAt' } },
              { case: { $eq: ['$_status', LotStatus.SCHEDULED] }, then: { $toLong: '$startsAt' } },
            ],
            default: { $multiply: [{ $toLong: '$endsAt' }, -1] },
          },
        },
      },
    },
    { $sort: { _rank: 1, _sortKey: 1, _id: 1 } },
    {
      $facet: {
        items: [...filtered, { $skip: (query.page - 1) * LOTS_PAGE_SIZE }, { $limit: LOTS_PAGE_SIZE }],
        total: [...filtered, { $count: 'count' }],
        departments: facet('item.department'),
        artists: facet('item.artist'),
      },
    },
  ];
  type FacetCount = { _id: string; count: number };
  const [result] = await Lot.aggregate<{
    items: LotDoc[];
    total: { count: number }[];
    departments: FacetCount[];
    artists: FacetCount[];
  }>(pipeline);
  const byName = (counts: FacetCount[] = []) =>
    counts.map(({ _id, count }) => ({ name: _id, count })).sort((a, b) => a.name.localeCompare(b.name, LOCALE));
  return {
    items: (result?.items ?? []).map((lot) => toLotSummary(lot, now)),
    page: query.page,
    total: result?.total[0]?.count ?? 0,
    serverTime: now,
    departments: byName(result?.departments),
    artists: byName(result?.artists),
  };
}

async function myPosition(lot: LotDoc, userId: string): Promise<MyPosition> {
  const ranking = await Bid.aggregate<{ _id: Types.ObjectId }>([
    { $match: { lotId: lot._id } },
    { $group: { _id: '$bidderId', highest: { $max: '$amount' } } },
    { $sort: { highest: -1 } },
  ]);
  const index = ranking.findIndex((entry) => entry._id.toString() === userId);
  const receiptCode = lot.result?.winnerId?.toString() === userId ? lot.result.receiptCode : null;
  return {
    pseudonym: pseudonym(env.AUDIT_SECRET, userId, lot._id.toString()),
    isLeader: lot.leaderId?.toString() === userId,
    position: index === -1 ? null : index + 1,
    totalBidders: ranking.length,
    ...(receiptCode && { receiptCode }),
  };
}

/** Cancelados também respondem: a sala mostra o aviso. */
export async function getLot(id: string, viewer?: AuthUser) {
  const lot = await Lot.findById(id).lean();
  if (!lot) throw new AppError(ErrorCode.NOT_FOUND);
  const bids = await Bid.find({ lotId: lot._id }).sort({ seq: -1 }).limit(LOT_DETAIL_BIDS_LIMIT).lean();
  const me = viewer?.role === Role.BIDDER ? await myPosition(lot, viewer.id) : undefined;
  return toLotDetail(lot, new Date(), bids.map(toBidView), me);
}

/** Lote de outro leiloeiro responde NOT_FOUND, sem revelar que existe. */
export async function cancelLot(auctioneerId: string, id: string) {
  const { response, refundedUserId } = await mongoose.connection.transaction(async (session) => {
    const lot = await Lot.findOne({ _id: id, auctioneerId }).session(session).lean();
    if (!lot) throw new AppError(ErrorCode.NOT_FOUND);
    const status = lotStatus(lot, new Date());
    if (status === LotStatus.CANCELLED) throw new AppError(ErrorCode.LOT_CANCELLED);
    if (status === LotStatus.ENDED) throw new AppError(ErrorCode.LOT_ENDED);

    // Um lance concorrente no mesmo lote gera conflito de escrita e a transação é refeita com o estado novo.
    await Lot.updateOne({ _id: lot._id }, { $set: { state: LotState.CANCELLED } }, { session });
    const refunded = lot.leaderId != null && lot.currentBid != null;
    if (refunded) {
      await User.updateOne({ _id: lot.leaderId }, { $inc: { 'wallet.committed': -lot.currentBid! } }, { session });
    }
    return {
      response: { id: lot._id.toString(), status: LotStatus.CANCELLED, refunded },
      refundedUserId: refunded ? lot.leaderId!.toString() : null,
    };
  });

  await notifyAfterCommit('cancelamento', async () => {
    emitToLot(response.id, SocketEvent.LOT_CANCELLED, { lotId: response.id });
    if (refundedUserId) emitToUser(refundedUserId, SocketEvent.WALLET_UPDATE, await getWallet(refundedUserId));
  });
  return response;
}

export async function listMyLots(auctioneerId: string) {
  const now = new Date();
  const lots = await Lot.find({ auctioneerId }).sort({ createdAt: -1 }).lean();
  const items = lots.map((lot) => ({
    ...toLotSummary(lot, now),
    result: lot.result ? { sold: lot.result.winnerId != null, amount: lot.result.amount ?? null } : null,
  }));
  const totalReceived = items.reduce((sum, item) => sum + (item.result?.sold ? (item.result.amount ?? 0) : 0), 0);
  return { items, totalReceived, serverTime: now };
}
