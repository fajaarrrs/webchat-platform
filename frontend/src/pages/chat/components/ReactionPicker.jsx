import React from 'react';
import EmojiPicker from '../../../components/EmojiPicker';

export default function ReactionPicker({
  emojiPickerRef,
  openReactionPickerFor,
  reactionPickerPos,
  reactionPickerMainEmojis,
  reactionPickerShowExtended,
  setReactionPickerShowExtended,
  handleSelectPickerEmoji,
}) {
  if (!openReactionPickerFor || !reactionPickerPos) return null;

  return (
    <div ref={emojiPickerRef} style={{ position: 'fixed', left: reactionPickerPos.left, top: reactionPickerPos.top, zIndex: 1300 }}>
      <EmojiPicker
        mainEmojis={reactionPickerMainEmojis}
        showExtended={reactionPickerShowExtended}
        onToggleExtended={(v) => setReactionPickerShowExtended(!!v)}
        onSelect={(emoji) => handleSelectPickerEmoji(openReactionPickerFor, emoji)}
        width={reactionPickerPos.width}
        variant={openReactionPickerFor === 'input' ? 'panel' : 'compact'}
      />
    </div>
  );
}
