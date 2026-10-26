import type { RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ListenEvent } from '../models/ListenEvent.js';
import { VisitQR } from '../models/VisitQR.js';
import { parseUserAgent } from '../utils/user-agent.js';
import { getListenBreakdown } from '../services/analytics.service.js';
import { successResponse } from '../utils/api-response.js';

export const trackListen: RequestHandler = async (request, response) => {
  const { platform, projectId, narrationId, languageCode } = request.body as {
    platform: 'web' | 'mobile';
    projectId?: string;
    narrationId?: string;
    languageCode?: string;
  };

  const userAgent = typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'].slice(0, 255) : null;
  const ipAddress = typeof request.ip === 'string' ? request.ip : null;
  const userId = request.user?.id ?? null;

  const event = await ListenEvent.create({
    platform,
    projectId: projectId || null,
    narrationId: narrationId && mongoose.isValidObjectId(narrationId) ? narrationId : null,
    userId: userId || null,
    languageCode: languageCode || null,
    userAgent,
    ipAddress,
  });

  response.status(201).json(
    successResponse({
      tracked: true,
      platform: event.platform,
      eventId: event._id.toString(),
    }),
  );
};

export const getListenStats: RequestHandler = async (_request, response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [total, web, mobile, todayCount, breakdown] = await Promise.all([
    ListenEvent.countDocuments(),
    ListenEvent.countDocuments({ platform: 'web' }),
    ListenEvent.countDocuments({ platform: 'mobile' }),
    ListenEvent.countDocuments({ createdAt: { $gte: today } }),
    getListenBreakdown(),
  ]);

  response.json(
    successResponse({
      total,
      web,
      mobile,
      today: todayCount,
      topLanguages: breakdown.topLanguages,
      topAudios: breakdown.topAudios,
    }),
  );
};

export const trackVisitQR: RequestHandler = async (request, response) => {
  const { source, targetPath, location } = (request.body ?? {}) as {
    source?: string;
    targetPath?: string;
    location?: string;
  };

  const rawUserAgent = typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null;
  const userAgent = rawUserAgent ? rawUserAgent.slice(0, 255) : null;
  const forwarded = request.headers['x-forwarded-for'];
  const ipAddress = (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : request.ip) ?? null;
  const parsed = parseUserAgent(rawUserAgent);

  const visit = await VisitQR.create({
    source: (source || 'qr_footer').trim(),
    ipAddress,
    userAgent,
    deviceType: parsed.deviceType,
    os: parsed.os,
    browser: parsed.browser,
    targetPath: targetPath || '/',
    location: location || null,
  });

  response.status(201).json(
    successResponse({
      recorded: true,
      visitId: visit._id.toString(),
    }),
  );
};

export const redirectVisitQR: RequestHandler = async (request, response) => {
  const source = typeof request.query.source === 'string' ? request.query.source : 'qr_scan';
  const target = typeof request.query.target === 'string' ? request.query.target : '/';
  const location = typeof request.query.location === 'string' ? request.query.location : undefined;

  const rawUserAgent = typeof request.headers['user-agent'] === 'string' ? request.headers['user-agent'] : null;
  const userAgent = rawUserAgent ? rawUserAgent.slice(0, 255) : null;
  const forwarded = request.headers['x-forwarded-for'];
  const ipAddress = (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : request.ip) ?? null;
  const parsed = parseUserAgent(rawUserAgent);

  await VisitQR.create({
    source: source.trim(),
    ipAddress,
    userAgent,
    deviceType: parsed.deviceType,
    os: parsed.os,
    browser: parsed.browser,
    targetPath: target,
    location: location || null,
  }).catch(() => {});

  let redirectUrl: string;
  if (target.startsWith('http://') || target.startsWith('https://')) {
    redirectUrl = target;
  } else {
    const mobileBase = process.env.MOBILE_URL || 'https://sempiternal-maddison-reservedly.ngrok-free.dev';
    redirectUrl = `${mobileBase.replace(/\/+$/, '')}${target.startsWith('/') ? target : `/${target}`}`;
  }
  response.redirect(302, redirectUrl);
};

