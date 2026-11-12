import type { Role } from '../api/types';
import { CloseIcon, SaveIcon } from './Icons';
import { RichText } from './RichText';

interface Props {
  role: Role;
  text: string;
  pending?: boolean;
  saved?: boolean;
  onSave?: () => void;
  /** Remove this message (a question also takes its answer with it). */
  onRemove?: () => void;
}

export function MessageBubble({ role, text, pending, saved, onSave, onRemove }: Props) {
  return (
    <div className={`msg msg--${role}`} data-testid={`msg-${role}`}>
      <div className={`bubble ${pending ? 'bubble--pending' : ''}`}>
        <RichText text={text} />
        {!pending && (onSave || onRemove) && (
          <span className="bubble__tools">
            {role === 'assistant' && onSave && (
              <button type="button" className={`bubble__tool bubble__save ${saved ? 'is-saved' : ''}`} onClick={onSave}
                      aria-label={saved ? 'Saved' : 'Save reply'} title={saved ? 'Saved' : 'Save reply'}>
                <SaveIcon width={15} height={15} />
              </button>
            )}
            {onRemove && (
              <button type="button" className="bubble__tool bubble__remove" onClick={onRemove}
                      aria-label={role === 'user' ? 'Remove this question and its answer' : 'Remove this answer'}
                      title={role === 'user' ? 'Remove this question and its answer' : 'Remove this answer'}>
                <CloseIcon width={14} height={14} />
              </button>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
