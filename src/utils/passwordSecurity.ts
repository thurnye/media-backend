import crypto from 'crypto';
import https from 'https';
import { COMMON_PASSWORDS } from './commonPasswords';
import { AppError } from '../errors/AppError';

const MIN_PASSWORD_LENGTH = Number(process.env.MIN_PASSWORD_LENGTH ?? 10);
const PWNED_TIMEOUT_MS = Number(process.env.PWNED_TIMEOUT_MS ?? 5000);
const ENFORCE_PWNED_CHECK = process.env.ENFORCE_PWNED_CHECK !== 'false';

const SIMPLE_SEQUENCES = [
  '0123456789',
  '123456789',
  'abcdef',
  'qwerty',
  'asdfgh',
  'zxcvbn',
];

const hasSimpleSequence = (password: string): boolean => {
  const normalized = password.toLowerCase();
  return SIMPLE_SEQUENCES.some((sequence) => normalized.includes(sequence));
};

const isLikelyWeakPattern = (password: string): boolean => {
  if (/(.)\1{3,}/.test(password)) return true;
  if (/^(?:[0-9]{6,}|[a-z]{6,})$/i.test(password)) return true;
  return hasSimpleSequence(password);
};

async function checkPwnedPassword(password: string): Promise<boolean> {
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);

  const endpoint = `https://api.pwnedpasswords.com/range/${prefix}`;

  const body = await new Promise<string>((resolve, reject) => {
    const request = https.get(
      endpoint,
      {
        headers: {
          'Add-Padding': 'true',
          'User-Agent': 'postflow-security-check/1.0',
        },
      },
      (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HIBP API returned status ${response.statusCode}`));
          return;
        }
        let payload = '';
        response.on('data', (chunk: Buffer) => {
          payload += chunk.toString('utf8');
        });
        response.on('end', () => resolve(payload));
      },
    );

    request.setTimeout(PWNED_TIMEOUT_MS, () => {
      request.destroy(new Error('HIBP API request timeout'));
    });

    request.on('error', reject);
  });

  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .some((line) => {
      const [candidateSuffix] = line.split(':');
      return candidateSuffix?.toUpperCase() === suffix;
    });
}

export async function assertPasswordIsStrong(password: string): Promise<void> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError(
      'VALIDATION_ERROR',
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    );
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new AppError('VALIDATION_ERROR', 'Password is too common. Choose a stronger password.');
  }

  if (isLikelyWeakPattern(password)) {
    throw new AppError('VALIDATION_ERROR', 'Password pattern is too predictable.');
  }

  try {
    const isPwned = await checkPwnedPassword(password);
    if (isPwned) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Password was found in known breaches. Choose a different password.',
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (ENFORCE_PWNED_CHECK) {
      throw new AppError(
        'VALIDATION_ERROR',
        'Password safety check is temporarily unavailable. Please try again.',
      );
    }
  }
}
