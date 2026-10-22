import { model, Schema } from 'mongoose';
import { PROVIDER_ERROR_STATUSES, PROVIDER_ERROR_REASONS, PROVIDER_ERROR_PARAMETERS } from '../services/translation/provider-failure.js';

// _id is the durable unique server-generated owner/project/target/source key.
// Never TTL/delete claims: expiration of a draft is not permission to bill again.
const schema = new Schema({
  _id: { type: String, required: true }, ownerId: { type: String, required: true }, projectId: { type: String, required: true },
  targetLanguage: { type: String, required: true }, sourceRevision: { type: String, required: true },
  binding: { type: String, required: true }, state: { type: String, enum: ['CLAIMED', 'DRAFT', 'UNCERTAIN', 'FAILED_PRE_DISPATCH', 'FAILED_RESPONSE'], required: true },
  executionVersion: Number,
  phase: { type: String, enum: ['PREPARING', 'METADATA_DISPATCHING', 'METADATA_RECEIVED', 'GENERATION_DISPATCHING', 'GENERATION_RECEIVED', 'SAVING'] },
  diagnosticCode: { type: String, maxlength: 80 }, failedAt: Date,
  providerHttpStatus: { type: Number, min: 400, max: 599 },
  providerDiagnostic: new Schema({
    status: { type: String, enum: PROVIDER_ERROR_STATUSES },
    reasons: { type: [{ type: String, enum: PROVIDER_ERROR_REASONS }], validate: (values: string[]) => values.length <= 4 },
    parameters: { type: [{ type: String, enum: PROVIDER_ERROR_PARAMETERS }], validate: (values: string[]) => values.length <= 8 },
  }, { _id: false }),
  quotaReserved: Boolean, quotaDay: String,
  draftJson: { type: String, maxlength: 131072 },
}, { timestamps: true, autoCreate: false, autoIndex: false });
export const TranslationAttempt = model('TranslationAttempt', schema);
