/**
 * @janus/tools — keyless, isomorphic toolbox helpers. Pure functions with no
 * network access; safe to run client-side (nothing is uploaded).
 */

export {
  toBase64,
  fromBase64,
  toHex,
  fromHex,
  urlEncode,
  urlDecode,
  defang,
  refang,
} from './encoding.js';
export { hash, hashAll, identifyHash, HASH_ALGORITHMS } from './hash.js';
export type { HashAlgorithm } from './hash.js';
export { decodeJwt } from './jwt.js';
export type { DecodedJwt } from './jwt.js';
export { parseCidr } from './cidr.js';
export type { CidrInfo } from './cidr.js';
export { extractIocs } from './ioc.js';
export type { Iocs } from './ioc.js';
export { buildDorks } from './dork.js';
export type { Dork } from './dork.js';
export { passwordStrength, generatePassword, generateToken, uuidv4 } from './secrets.js';
export type { PasswordStrength, PasswordOptions } from './secrets.js';
export { buildTyposquats } from './typosquat.js';
export { convertTime } from './time.js';
export type { TimeInfo } from './time.js';

export const TOOLS_PACKAGE = '@janus/tools';
