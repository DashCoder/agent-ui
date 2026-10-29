import type { Role } from '../api/types';
import { SaveIcon } from './Icons';

interface Props {
  role: Role;
  text: string;
  pending?: boolean;
  saved?: boolean;
  onSave?: () => void;
}

/** Splits on blank lines into paragraphs; keeps single line breaks. */
function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p.split('\n').map((line, j) => (j ? [<br key={j} />, line] : line))}</p>
      ))}
    </>
  );
}

export function MessageBubble({ role, text, pending, saved, onSave }: Props) {
  return (
    <div className={`msg msg--${role}`} data-testid={`msg-${role}`}>
      <div className={`bubble ${pending ? 'bubble--pending' : ''}`}>
        <Paragraphs text={text} />
        {role === 'assistant' && onSave && !pending && (
          <button type="button" className={`bubble__save ${saved ? 'is-saved' : ''}`} onClick={onSave}
                  aria-label={saved ? 'Saved' : 'Save reply'} title={saved ? 'Saved' : 'Save reply'}>
            <SaveIcon width={15} height={15} />
          </button>
        )}
      </div>
    </div>
  );
}
