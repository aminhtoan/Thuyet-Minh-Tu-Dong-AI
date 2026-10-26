export function parseUserAgent(ua: string | null | undefined): {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  os: string;
  browser: string;
} {
  if (!ua) return { deviceType: 'unknown', os: 'Unknown', browser: 'Unknown' };

  let os = 'Unknown';
  if (/iPad|iPhone|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown';
  if (/Zalo/i.test(ua)) browser = 'Zalo In-App';
  else if (/FBAN|FBAV/i.test(ua)) browser = 'Facebook In-App';
  else if (/Instagram/i.test(ua)) browser = 'Instagram In-App';
  else if (/Edg/i.test(ua)) browser = 'Microsoft Edge';
  else if (/Chrome|CriOS/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) browser = 'Safari';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

  let deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) deviceType = 'tablet';
  else if (/mobile|iphone|ipod|android|blackberry|iemobile|opera mini/i.test(ua)) deviceType = 'mobile';

  return { deviceType, os, browser };
}
