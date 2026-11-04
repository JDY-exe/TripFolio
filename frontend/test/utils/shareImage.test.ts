import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  canShareImage,
  downloadImage,
  shareImage,
} from '../../src/utils/shareImage';

const file = new File(['jpeg'], 'trip-recap-2026-06-12-01.jpg', {
  type: 'image/jpeg',
});
afterEach(() => vi.unstubAllGlobals());

describe('one-image export', () => {
  it('only offers sharing for supported secure-context files', () => {
    vi.stubGlobal('window', { isSecureContext: true });
    const canShare = vi.fn(() => true);
    vi.stubGlobal('navigator', { canShare, share: vi.fn() });
    expect(canShareImage(file)).toBe(true);
    expect(canShare).toHaveBeenCalledWith({ files: [file] });
    vi.stubGlobal('window', { isSecureContext: false });
    expect(canShareImage(file)).toBe(false);
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('navigator', {});
    expect(canShareImage(file)).toBe(false);
  });
  it('handles feature detection exceptions and rejected share handoffs', async () => {
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('navigator', {
      canShare: () => {
        throw new Error('Unsupported');
      },
      share: vi.fn().mockRejectedValue(new Error('Denied')),
    });
    expect(canShareImage(file)).toBe(false);
    await expect(shareImage(file)).rejects.toThrow('Denied');
  });
  it('invokes native sharing immediately with the exact file and treats cancellation as normal', async () => {
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    vi.stubGlobal('navigator', { share });
    const pending = shareImage(file);
    expect(share).toHaveBeenCalledWith({ files: [file] });
    await expect(pending).resolves.toBeUndefined();
  });
  it('downloads the same file and delays URL revocation until it can be consumed', () => {
    const link = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    const revoke = vi.fn();
    const create = vi.fn(() => 'blob:download');
    const schedule = vi.fn();
    vi.stubGlobal('document', {
      createElement: () => link,
      body: { append: vi.fn() },
    });
    vi.stubGlobal('window', { setTimeout: schedule });
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    downloadImage(file);
    expect(create).toHaveBeenCalledWith(file);
    expect(link.download).toBe(file.name);
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled();
    schedule.mock.calls[0][0]();
    expect(revoke).toHaveBeenCalledWith('blob:download');
  });
});
