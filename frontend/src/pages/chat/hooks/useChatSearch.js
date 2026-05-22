import { useEffect, useMemo, useState } from 'react';

export default function useChatSearch(messages, messageSearch, activeForumId, messageRefs) {
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const normalizedMessageSearch = useMemo(
    () => messageSearch.trim().toLowerCase(),
    [messageSearch]
  );

  const searchMatches = useMemo(() => {
    if (!normalizedMessageSearch) return [];
    return messages.filter((msg) => (
      `${msg.content || ''} ${msg.file_name || ''}`
    ).toLowerCase().includes(normalizedMessageSearch));
  }, [messages, normalizedMessageSearch]);

  const activeSearchMatchId = searchMatches[searchMatchIndex]?.id;

  useEffect(() => {
    setSearchMatchIndex(0);
  }, [messageSearch, activeForumId]);

  useEffect(() => {
    if (!activeSearchMatchId) return;
    const node = messageRefs?.current?.[activeSearchMatchId];
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeSearchMatchId, messageRefs]);

  return {
    normalizedMessageSearch,
    searchMatches,
    searchMatchIndex,
    setSearchMatchIndex,
    activeSearchMatchId,
  };
}
