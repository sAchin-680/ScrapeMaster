import { describe, expect, it } from 'vitest';
import { Notification, pushMessage } from '@/lib/notifications';
import { isAllowedPushEndpoint } from '@/lib/push/endpoint';

describe('isAllowedPushEndpoint', () => {
  it('accepts the browser push services', () => {
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc:123')).toBe(
      true,
    );
    expect(
      isAllowedPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/x'),
    ).toBe(true);
    expect(isAllowedPushEndpoint('https://web.push.apple.com/QGx')).toBe(true);
    expect(
      isAllowedPushEndpoint('https://wns2-par02p.notify.windows.com/w/?token=x'),
    ).toBe(true);
  });

  it('rejects anything the server should not call', () => {
    expect(isAllowedPushEndpoint('http://fcm.googleapis.com/fcm/send/x')).toBe(false);
    expect(isAllowedPushEndpoint('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(isAllowedPushEndpoint('https://localhost/x')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com.evil.example/x')).toBe(
      false,
    );
    expect(isAllowedPushEndpoint('https://evil.example/fcm.googleapis.com')).toBe(false);
    expect(isAllowedPushEndpoint('https://fcm.googleapis.com:8443/x')).toBe(false);
    expect(isAllowedPushEndpoint('https://user@fcm.googleapis.com/x')).toBe(false);
    expect(isAllowedPushEndpoint('not a url')).toBe(false);
  });
});

describe('pushMessage', () => {
  const product = {
    _id: 'a'.repeat(24),
    title: 'boAt Airdopes 141 Bluetooth TWS Earbuds',
    currentPrice: 1099,
    currency: '₹',
  };

  it('leads with what happened and the price', () => {
    expect(pushMessage(Notification.LOWEST_PRICE, product)).toMatchObject({
      title: 'Lowest price yet: ₹1,099',
      body: 'boAt Airdopes 141 Bluetooth TWS Earbuds',
      url: `/products/${'a'.repeat(24)}`,
    });
    expect(pushMessage(Notification.CHANGE_OF_STOCK, product).title).toBe(
      'Back in stock at ₹1,099',
    );
    expect(pushMessage(Notification.THRESHOLD_MET, product).title).toBe(
      '40%+ off now: ₹1,099',
    );
  });
});
