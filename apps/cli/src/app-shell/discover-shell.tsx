import { truncateLabel } from "@/design";
import type { SearchResult } from "@/domain/types";
import type { RecommendationSection } from "@/services/recommendations/RecommendationService";
import { Box, Text, useInput } from "ink";
import React, { useState } from "react";

import { ResizeBlocker } from "./shell-primitives";
import { palette } from "./shell-theme";
import { useViewportPolicy } from "./use-viewport-policy";

export type DiscoverShellResult = { type: "open"; result: SearchResult } | { type: "back" };

function DiscoverSectionView({
  section,
  isFocused,
  focusedIndex,
}: {
  section: RecommendationSection;
  isFocused: boolean;
  focusedIndex: number;
}) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text color={palette.amber} bold>
        {section.label}
      </Text>
      <Text color={palette.dim}>{"─".repeat(40)}</Text>
      {section.items.length === 0 ? (
        <Text color={palette.dim}> No results</Text>
      ) : (
        section.items.map((item, idx) => {
          const isActive = isFocused && idx === focusedIndex;
          const rating =
            item.rating !== null && item.rating !== undefined ? `★ ${item.rating.toFixed(1)}` : "";
          return (
            <Box key={item.id}>
              <Text
                backgroundColor={isActive ? palette.surfaceActive : undefined}
                color={isActive ? palette.text : palette.muted}
              >
                {`  ${isActive ? "▶" : " "} ${truncateLabel(item.title, 28).padEnd(28)} ${rating.padEnd(7)} ${item.year}`}
              </Text>
            </Box>
          );
        })
      )}
    </Box>
  );
}

export function DiscoverShell({
  sections,
  onResult,
}: {
  sections: RecommendationSection[];
  onResult: (result: DiscoverShellResult) => void;
}) {
  const [sectionIdx, setSectionIdx] = useState(0);
  const [itemIdx, setItemIdx] = useState(0);
  const viewport = useViewportPolicy("browse");
  const sepWidth = Math.max(24, (viewport.minColumns ?? 80) - 4);

  const currentSection = sections[sectionIdx];
  const currentItems = currentSection?.items ?? [];

  useInput((_input, key) => {
    if (key.escape) {
      onResult({ type: "back" });
      return;
    }
    if (key.upArrow) {
      if (itemIdx > 0) setItemIdx((i) => i - 1);
      else if (sectionIdx > 0) {
        const prevSection = sections[sectionIdx - 1];
        setSectionIdx((s) => s - 1);
        setItemIdx((prevSection?.items.length ?? 1) - 1);
      }
      return;
    }
    if (key.downArrow) {
      if (itemIdx < currentItems.length - 1) setItemIdx((i) => i + 1);
      else if (sectionIdx < sections.length - 1) {
        setSectionIdx((s) => s + 1);
        setItemIdx(0);
      }
      return;
    }
    if (key.tab) {
      if (sectionIdx < sections.length - 1) {
        setSectionIdx((s) => s + 1);
        setItemIdx(0);
      }
      return;
    }
    if (key.return) {
      const item = currentSection?.items[itemIdx];
      if (item) onResult({ type: "open", result: item });
      return;
    }
  });

  if (viewport.tooSmall) {
    return <ResizeBlocker minColumns={viewport.minColumns} minRows={viewport.minRows} />;
  }

  return (
    <Box flexDirection="column" flexGrow={1} justifyContent="space-between" paddingX={1}>
      <Box flexDirection="column" flexGrow={1}>
        <Box justifyContent="space-between">
          <Text bold color={palette.amber}>
            ⬡ Discover
          </Text>
        </Box>
        <Text color={palette.dim}>{"─".repeat(sepWidth)}</Text>
        <Box marginTop={1} flexDirection="column" flexGrow={1}>
          {sections.length === 0 ? (
            <Text color={palette.dim}> Loading recommendations…</Text>
          ) : (
            sections.map((section, idx) => (
              <DiscoverSectionView
                key={section.reason + String(idx)}
                section={section}
                isFocused={idx === sectionIdx}
                focusedIndex={itemIdx}
              />
            ))
          )}
        </Box>
      </Box>
      <Box flexDirection="column">
        <Text color={palette.dim}>{"─".repeat(sepWidth)}</Text>
        <Text>
          <Text color={palette.amber}>↵</Text>
          <Text color={palette.muted}> open </Text>
          <Text color={palette.amber}>tab</Text>
          <Text color={palette.muted}> next section </Text>
          <Text color={palette.amber}>esc</Text>
          <Text color={palette.muted}> back</Text>
        </Text>
      </Box>
    </Box>
  );
}
