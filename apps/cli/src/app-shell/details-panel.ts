import type { BrowseShellOption, ShellPanelLine } from "@/app-shell/types";

const POSTER_AVAILABLE = "Poster available for terminal image preview";
const POSTER_MISSING = "Poster unavailable from this provider";

export type BrowseDetailsPanel = {
  title: string;
  subtitle: string;
  lines: readonly ShellPanelLine[];
  imageUrl?: string;
};

export type BrowseCompanionBadge = {
  label: string;
  tone: "neutral" | "success" | "warning";
};

export type BrowseCompanionPanel = {
  title: string;
  badges: readonly BrowseCompanionBadge[];
  body: string;
  facts: readonly ShellPanelLine[];
  note: string;
};

export function buildBrowseDetailsPanel<T>(
  option: BrowseShellOption<T> | undefined,
): BrowseDetailsPanel {
  if (!option) {
    return {
      title: "Title overview",
      subtitle: "No selected title yet",
      lines: [
        {
          label: "Nothing selected",
          detail: "Search for a title, move through results, then press d to inspect it.",
          tone: "warning",
        },
      ],
    };
  }

  const title = option.previewTitle ?? option.label;
  const lines: ShellPanelLine[] = [
    {
      label: title,
      detail: option.previewBody || "No overview available yet.",
    },
    {
      label: "Poster preview",
      detail: option.previewImageUrl ? POSTER_AVAILABLE : POSTER_MISSING,
      tone: option.previewImageUrl ? "success" : "warning",
    },
  ];

  if (option.previewRating) {
    lines.push({
      label: "Rating",
      detail: option.previewRating,
      tone: "success",
    });
  } else {
    lines.push({
      label: "Rating",
      detail: "Rating unavailable from this provider response",
      tone: "neutral",
    });
  }

  if (option.previewMeta?.length) {
    lines.push({
      label: "Metadata",
      detail: option.previewMeta.join("  ·  "),
    });
  }

  for (const fact of option.previewFacts ?? []) {
    lines.push(fact);
  }

  lines.push({
    label: "Next step",
    detail: option.previewNote ?? "Press Enter to open this title.",
  });

  return {
    title: "Title overview",
    subtitle: title,
    lines,
    imageUrl: option.previewImageUrl,
  };
}

export function buildBrowseCompanionPanel<T>(
  option: BrowseShellOption<T> | undefined,
  {
    selectedDetail,
  }: {
    selectedDetail: string;
  },
): BrowseCompanionPanel {
  if (!option) {
    return {
      title: "No selection yet",
      badges: [],
      body: "Type a title and press Enter to search.",
      facts: [
        {
          label: "Next step",
          detail: "Search for a title, then move through results.",
          tone: "neutral",
        },
      ],
      note: selectedDetail,
    };
  }

  const badges: BrowseCompanionBadge[] = (option.previewMeta ?? []).slice(0, 3).map((meta) => ({
    label: meta,
    tone: "neutral",
  }));
  if (option.previewRating) {
    badges.push({
      label: option.previewRating,
      tone: "success",
    });
  }

  return {
    title: option.previewTitle ?? option.label,
    badges,
    body: option.previewBody || "No overview available yet.",
    facts: [
      {
        label: "Poster",
        detail: option.previewImageUrl ? POSTER_AVAILABLE : POSTER_MISSING,
        tone: option.previewImageUrl ? "success" : "warning",
      },
      {
        label: "Rating",
        detail: option.previewRating ?? "Unavailable from this provider response",
        tone: option.previewRating ? "success" : "neutral",
      },
      {
        label: "Provider data",
        detail:
          option.previewBody || option.previewFacts?.length || option.previewMeta?.length
            ? "Detail fields available"
            : "Only a title was returned",
        tone:
          option.previewBody || option.previewFacts?.length || option.previewMeta?.length
            ? "success"
            : "warning",
      },
      {
        label: "Next step",
        detail: option.previewNote ?? selectedDetail,
      },
    ],
    note: option.previewNote ?? selectedDetail,
  };
}
