export interface OriginalPublication {
  ownerId: unknown; projectId: unknown; sourceMediaId: unknown; sourceFingerprint: string;
  languageCode: string; artifactStatus: string; publicationStatus: string;
  artifactPath?: string | null; artifactDigest?: string | null; mimeType?: string | null;
  fileSize?: number | null; duration?: number | null;
  rightsDeclaration: string; rightsReference: string; rightsDeclaredAt: Date;
  reviewedBy?: unknown; reviewedAt?: Date | null;
  authorizationMode?: string | null; publicationEnabled?: boolean;
}

export function originalIsPublic(item: OriginalPublication, current: { ownerId: unknown; mediaId: unknown; fingerprint: string } | null) {
  return Boolean(current && String(item.ownerId) === String(current.ownerId)
    && String(item.sourceMediaId) === String(current.mediaId) && item.sourceFingerprint === current.fingerprint
    && item.artifactStatus === 'READY' && item.publicationStatus === 'APPROVED'
    && item.authorizationMode === 'ADMIN_DIRECT' && item.publicationEnabled === true
    && item.reviewedBy && item.reviewedAt && Number.isFinite(item.reviewedAt.getTime())
    && item.artifactPath && /^[a-f0-9]{64}$/.test(item.artifactDigest ?? '')
    && item.mimeType === 'audio/mpeg' && (item.fileSize ?? 0) > 0 && (item.duration ?? 0) > 0);
}

export function reviewTransition(from: string, action: 'APPROVED' | 'REJECTED' | 'REVOKED') {
  return from === 'PENDING' && (action === 'APPROVED' || action === 'REJECTED')
    || from === 'APPROVED' && action === 'REVOKED';
}
