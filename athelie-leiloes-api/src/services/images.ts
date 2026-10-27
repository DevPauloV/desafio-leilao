import { ErrorCode } from '../constants.js';
import { AppError } from '../errors.js';
import { Image } from '../models/Image.js';

export async function getImage(id: string): Promise<{ data: Buffer; contentType: string }> {
  // Sem lean(): com lean o campo vem como Binary do driver, e não como Buffer.
  const image = await Image.findById(id);
  if (!image) throw new AppError(ErrorCode.NOT_FOUND);
  return { data: image.data, contentType: image.contentType };
}
