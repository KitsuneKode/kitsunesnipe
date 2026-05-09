import { getShellViewportPolicy } from "@/app-shell/layout-policy";
import { mountRootContent } from "@/app-shell/root-content-state";
import { ResizeBlocker, ShellFooter } from "@/app-shell/shell-primitives";
import { truncateLine } from "@/app-shell/shell-text";
import { palette } from "@/app-shell/shell-theme";
import type { Container } from "@/container";
import type { DownloadJobRecord } from "@kunai/storage";
import { Box, Text, useInput, useStdout } from "ink";
import React, { useEffect, useState } from "react";

function DownloadManagerShell({
  container,
  onClose,
}: {
  container: Container;
  onClose: () => void;
}) {
  const { stdout } = useStdout();
  const [activeJobs, setActiveJobs] = useState<readonly DownloadJobRecord[]>([]);
  const [queuedJobs, setQueuedJobs] = useState<readonly DownloadJobRecord[]>([]);
  const [failedJobs, setFailedJobs] = useState<readonly DownloadJobRecord[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const update = () => {
      setActiveJobs(container.downloadService.listActive(50).filter((j) => j.status === "running"));
      setQueuedJobs(container.downloadService.listActive(50).filter((j) => j.status === "queued"));
      setFailedJobs(container.downloadService.listFailed(10));
    };
    update();
    const interval = setInterval(update, 750);
    return () => clearInterval(interval);
  }, [container]);

  const allJobs = [...activeJobs, ...queuedJobs, ...failedJobs];

  useEffect(() => {
    if (selectedIndex >= allJobs.length) {
      setSelectedIndex(Math.max(0, allJobs.length - 1));
    }
  }, [allJobs.length, selectedIndex]);

  useInput((input, key) => {
    if ((input === "c" && key.ctrl) || input === "\x03") {
      process.exit(0);
    }
    if (key.escape) {
      onClose();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((current) => (current - 1 + allJobs.length) % allJobs.length);
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((current) => (current + 1) % allJobs.length);
      return;
    }
    if (input === "x" || key.delete) {
      const job = allJobs[selectedIndex];
      if (!job) return;
      if (job.status === "running") {
        void container.downloadService.abort(job.id);
        return;
      }
      void container.downloadService.deleteJob(job.id, {
        deleteArtifact: job.status === "failed",
      });
      return;
    }
    if (input === "r") {
      const job = allJobs[selectedIndex];
      if (job && (job.status === "failed" || job.status === "aborted")) {
        container.downloadService.retry(job.id);
        void container.downloadService.processQueue();
      }
      return;
    }
  });

  const viewport = getShellViewportPolicy("picker", stdout?.columns ?? 80, stdout?.rows ?? 24);
  const { tooSmall, minColumns, minRows } = viewport;
  const shellWidth = stdout?.columns ?? 80;

  if (tooSmall) {
    return <ResizeBlocker minColumns={minColumns} minRows={minRows} />;
  }

  const renderJob = (job: DownloadJobRecord, index: number) => {
    const isSelected = index === selectedIndex;
    const progressStr =
      job.status === "running" && typeof job.progressPercent === "number"
        ? `[${"#".repeat(Math.floor(job.progressPercent / 10)).padEnd(10, "-")}] ${job.progressPercent}%`
        : job.status === "queued"
          ? "[Queued]"
          : "[—]";
    const nameStr = `${job.titleName}${job.episode ? ` S${String(job.season ?? 1).padStart(2, "0")}E${String(job.episode).padStart(2, "0")}` : ""}`;
    const statusColor =
      job.status === "running"
        ? palette.green
        : job.status === "failed"
          ? palette.red
          : job.status === "aborted"
            ? palette.muted
            : palette.amber;

    return (
      <Box key={job.id} flexDirection="row">
        <Text color={isSelected ? palette.cyan : palette.gray}>{isSelected ? "❯ " : "  "}</Text>
        <Box width={shellWidth > 80 ? 40 : 25}>
          <Text color={isSelected ? "white" : undefined} bold={isSelected}>
            {truncateLine(nameStr, shellWidth > 80 ? 38 : 23)}
          </Text>
        </Box>
        <Box width={20}>
          <Text color={statusColor}>{progressStr}</Text>
        </Box>
        <Box flexGrow={1}>
          <Text color={palette.muted}>
            {job.status === "failed" ? truncateLine(job.errorMessage ?? "Failed", 30) : job.status}
          </Text>
        </Box>
      </Box>
    );
  };
  return (
    <Box flexDirection="column" paddingX={1} flexGrow={1}>
      <Box flexDirection="column" flexGrow={1}>
        <Box marginBottom={1}>
          <Text bold color={palette.cyan}>
            Download Manager
          </Text>
        </Box>

        {allJobs.length === 0 ? (
          <Box paddingY={2}>
            <Text color={palette.muted}>No active or recent downloads.</Text>
          </Box>
        ) : (
          <Box flexDirection="column">
            {activeJobs.length > 0 && (
              <Box flexDirection="column" marginBottom={1}>
                <Text color={palette.gray} underline>
                  ACTIVE DOWNLOADS
                </Text>
                {activeJobs.map((j, i) => renderJob(j, i))}
              </Box>
            )}

            {queuedJobs.length > 0 && (
              <Box flexDirection="column" marginBottom={1}>
                <Text color={palette.gray} underline>
                  QUEUED
                </Text>
                {queuedJobs.map((j, i) => renderJob(j, activeJobs.length + i))}
              </Box>
            )}

            {failedJobs.length > 0 && (
              <Box flexDirection="column" marginBottom={1}>
                <Text color={palette.gray} underline>
                  FAILED
                </Text>
                {failedJobs.map((j, i) => renderJob(j, activeJobs.length + queuedJobs.length + i))}
              </Box>
            )}
          </Box>
        )}
      </Box>

      <ShellFooter
        taskLabel="Live queue · failed retries"
        actions={[
          { key: "x", label: "cancel / remove", action: "quit" },
          { key: "r", label: "retry failed", action: "search" },
          { key: "esc", label: "back", action: "quit" },
        ]}
        mode="minimal"
      />
    </Box>
  );
}

export function openDownloadManagerShell(container: Container): Promise<void> {
  return new Promise((resolve) => {
    const session = mountRootContent<{ type: "closed" }>({
      kind: "picker",
      renderContent: (finish) => (
        <DownloadManagerShell container={container} onClose={() => finish({ type: "closed" })} />
      ),
      fallbackValue: { type: "closed" },
    });

    session.result.then(() => resolve());
  });
}
