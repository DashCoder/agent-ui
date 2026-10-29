import type { SavedReply } from '../api/types';
import { CloseIcon } from './Icons';

interface Props {
  items: SavedReply[];
  onRemove: (id: string) => void;
  onUse?: (text: string) => void;
}

export function SavedReplies({ items, onRemove, onUse }: Props) {
  if (!items.length) return null;
  return (
    <section className="saved" aria-label="Saved replies">
      <h2 className="saved__title">Saved replies</h2>
      <ul className="saved__list">
        {items.map((item) => (
          <li key={item.id} className="saved__item" data-testid="saved-item">
            <button type="button" className="saved__text" onClick={() => onUse?.(item.text)}
                    title="Copy to clipboard">
              {item.text.length > 140 ? `${item.text.slice(0, 140)}…` : item.text}
            </button>
            <button type="button" className="saved__remove" onClick={() => onRemove(item.id)}
                    aria-label="Remove saved reply">
              <CloseIcon width={11} height={11} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
