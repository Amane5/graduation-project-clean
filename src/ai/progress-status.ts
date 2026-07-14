export const progressStatus = {
  STARTING: 'progress_starting',
  PROCESSING: 'progress_processing',
  SAVING: 'progress_saving',
  UPLOADING: 'progress_uploading',
  WRITING_STORY: 'progress_writing_story',
  WRITING_SCENES: 'progress_writing_scenes',
  GENERATING_IMAGES: 'progress_generating_images',
  GENERATING_AUDIO: 'progress_generating_audio',
  STORY_COMPLETED: 'progress_story_completed',
  ANALYZING_DRAWING: 'progress_analyzing_drawing',
  PREPARING_QUESTIONS: 'progress_preparing_questions',
} as const;

export type ProgressStatusKey =
  (typeof progressStatus)[keyof typeof progressStatus];

export const notificationKeys = {
  AI_RESPONSE_READY_TITLE: 'notification_ai_response_ready_title',
  AI_RESPONSE_READY_BODY: 'notification_ai_response_ready_body',
} as const;

export type NotificationKey =
  (typeof notificationKeys)[keyof typeof notificationKeys];
