import mongoose, { type HydratedDocument } from 'mongoose';
import { Narration, type NarrationDocument } from '../models/Narration.js';
import { Transcript } from '../models/Transcript.js';
import { Translation } from '../models/Translation.js';
import { narrationProvenance, translationProvenance } from './artifact-provenance.service.js';

type NarrationRecord = HydratedDocument<NarrationDocument>;

const isCurrent = async (narration: NarrationRecord): Promise<boolean> => {
  const translation = await Translation.findOne({
    _id: narration.translationId,
    projectId: narration.projectId,
    status: 'READY',
  });
  const transcript = translation
    ? await Transcript.findOne({ _id: translation.transcriptId, projectId: narration.projectId })
    : null;
  const upstream = translation ? translationProvenance(translation, transcript) : 'UNKNOWN';
  return narrationProvenance(narration, translation, upstream) === 'CURRENT';
};

export const findPublicNarration = async (
  projectId: string,
  narrationId: string,
): Promise<NarrationRecord | null> => {
  if (!mongoose.isValidObjectId(projectId) || !mongoose.isValidObjectId(narrationId)) return null;
  const narration = await Narration.findOne({
    _id: narrationId,
    projectId,
    status: 'READY',
    isApproved: true,
  });
  if (!narration || !(await isCurrent(narration))) return null;
  return narration;
};

export const listPublicNarrations = async (): Promise<NarrationRecord[]> => {
  const narrations = await Narration.find({ status: 'READY', isApproved: true }).sort({ createdAt: -1 });
  const translations = await Translation.find({
    _id: { $in: narrations.map((narration) => narration.translationId) },
    projectId: { $in: narrations.map((narration) => narration.projectId) },
    status: 'READY',
  });
  const transcripts = await Transcript.find({
    _id: { $in: translations.map((translation) => translation.transcriptId) },
    projectId: { $in: narrations.map((narration) => narration.projectId) },
  });
  const translationById = new Map(translations.map((translation) => [translation._id.toString(), translation]));
  const transcriptById = new Map(transcripts.map((transcript) => [transcript._id.toString(), transcript]));
  return narrations.filter((narration) => {
    const translation = translationById.get(narration.translationId.toString());
    if (!translation || translation.projectId.toString() !== narration.projectId.toString()) return false;
    const transcript = transcriptById.get(translation.transcriptId.toString());
    if (!transcript || transcript.projectId.toString() !== narration.projectId.toString()) return false;
    const upstream = translationProvenance(translation, transcript);
    return narrationProvenance(narration, translation, upstream) === 'CURRENT';
  });
};
