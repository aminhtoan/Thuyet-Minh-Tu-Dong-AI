import { trackedObject } from '../../maintenance/runtime.js';
import type { MediaProcessor } from './media-processor.interface.js';
import { FfmpegMediaProcessor } from './ffmpeg-media-processor.js';

let testProcessor: MediaProcessor | undefined;
export const getMediaProcessor = (): MediaProcessor => trackedObject(testProcessor ?? new FfmpegMediaProcessor(), 'activeOperations');
export const setMediaProcessorForTests = (processor?: MediaProcessor): void => { testProcessor = processor; };
