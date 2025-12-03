import { GroupCategory, IGroup } from '../group/group.interface';

/**
 * @fileoverview Type definitions for the broadcast module
 * @module broadcast.type
 */

/**
 * Type defining the supported media types for broadcast messages
 * @type TMediaType
 * @description Defines all available media types that can be used in broadcasts
 */
export type TMediaType =
  | 'text'
  | 'photo'
  | 'video'
  | 'audio'
  | 'document'
  | 'animation'
  | 'voice'
  | 'location'
  | 'contact'
  | 'sticker';

/**
 * Interface representing a post message
 * @interface IPostMessage
 * @description Defines the structure of a message to be broadcast,
 * including text, media, and URL buttons
 */
export interface IPostMessage {
  /** Message text content */
  text: string | null;
  /** Whether the message should be pinned */
  isPinned: boolean;
  /** Array of URL buttons to be attached to the message */
  urlButtons: { text: string; url: string }[];
  /** URL of the media to be attached */
  mediaUrl: string | null;
  /** Type of media to be attached */
  mediaType?: TMediaType;
  /** ID of the message in Telegram */
  messageId?: number;
}

/**
 * Interface representing a broadcast session
 * @interface IBroadcastSession
 * @description Defines the structure of a broadcast session,
 * including current step, selected action, and message data
 */
export interface IBroadcastSession {
  /** Current step in the broadcast process */
  step: 'awaiting_message' | 'creating_post' | 'idle' | 'selecting_category';
  /** Currently selected action */
  selectedAction?: string;
  /** Array of messages in the broadcast */
  messages: IPostMessage[];
  /** Current action being performed */
  currentAction?: 'attach_media' | 'add_url_buttons';
  /** Index of the current message being edited */
  currentMessageIndex?: number;
  /** Selected groups for broadcasting */
  selectedGroups?: IGroup[];
  /** Selected category for broadcasting */
  selectedCategory?: GroupCategory;
}

/**
 * Interface representing a broadcast entry in the database
 * @interface IBroadcast
 * @description Defines the structure of a broadcast record in the database
 */
export interface IBroadcast {
  /** Unique identifier of the broadcast */
  id?: string;
  /** Type of message being broadcast */
  message_type: TMediaType;
  /** Text content of the message */
  message_text?: string | null;
  /** JSON data for buttons attached to the message */
  button_detail?: string | undefined;
  /** JSON data for any attachments */
  attachment_detail?: Record<string, any>;
  /** ID of the user who sent the broadcast */
  sender_id: string;
}

/**
 * Interface for broadcast message detail records
 * @interface IBroadcastMessageDetail
 * @description Represents a single broadcast message sent to a specific group
 */
export interface IBroadcastMessageDetail {
  /** Unique identifier for the broadcast message detail */
  id: string;
  /** Reference to the parent broadcast record */
  broadcast_id: string;
  /** Telegram message ID of the sent message */
  message_id?: string;
  /** Reference to the target group's ID */
  group_id: string;
  /** Whether the message has been sent */
  is_sent: boolean;
  /** Timestamp when the message was sent */
  sent_at?: Date;
}
