export type FeedbackType = 'Suggestion' | 'Website Experience' | 'Room Listing' | 'Bug / Error' | 'Feature Request' | 'Other';

export interface FeedbackPayload {
  name: string;
  email: string;
  type: FeedbackType;
  message: string;
}
