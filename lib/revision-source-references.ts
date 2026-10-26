export type RevisionSourceReference = {
  id?: string;
  source_item_id?: string;
};

export function publicRevisionSourceIds(sources: RevisionSourceReference[], coverageSourceItemIds: string[]) {
  const coveredItems = new Set(coverageSourceItemIds);
  const publicIds = sources.flatMap((source) => source.id
    && /^source-[1-9][0-9]*$/.test(source.id)
    && source.source_item_id
    && coveredItems.has(source.source_item_id)
    ? [source.id]
    : []);
  return [...new Set(publicIds)];
}
