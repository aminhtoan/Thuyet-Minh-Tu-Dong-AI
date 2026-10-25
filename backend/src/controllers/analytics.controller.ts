import type { RequestHandler } from 'express';
import { ListenEvent } from '../models/ListenEvent.js';
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
    narrationId: narrationId || null,
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
