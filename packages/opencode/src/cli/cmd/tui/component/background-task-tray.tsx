import { For, Show } from "solid-js"
import { useTheme } from "../context/theme"
import { useTerminalDimensions } from "@opentui/solid"

export type BackgroundTask = {
  id: string
  label: string
  status: "running" | "success" | "error" | "canceled"
  output: string[]
  startedAt: number
}

export function BackgroundTaskTray(props: {
  open: boolean
  tasks: BackgroundTask[]
  selected: number
  onSelect: (index: number) => void
  onCancel: (id: string) => void
  onClose: () => void
}) {
  const { theme } = useTheme()
  const dimensions = useTerminalDimensions()

  const runningCount = () => props.tasks.filter((t) => t.status === "running").length
  const selectedTask = () => props.tasks[props.selected]

  return (
    <Show when={props.tasks.length > 0 || props.open}>
      <Show
        when={props.open}
        fallback={
          <box height={1} backgroundColor={theme.backgroundPanel} paddingLeft={2} paddingRight={2}>
            <text fg={theme.textMuted}>
              <text fg={theme.warning}>●</text> {String(runningCount())} running · <text fg={theme.textMuted}>Ctrl+Y</text>
            </text>
          </box>
        }
      >
        <box
          flexDirection="column"
          backgroundColor={theme.backgroundPanel}
          height={Math.max(5, Math.floor(dimensions().height * 0.3))}
          paddingTop={1}
          paddingBottom={1}
          gap={1}
        >
          <box flexShrink={0} paddingLeft={2} paddingRight={2}>
            <text fg={theme.text}>Tasks ({String(props.tasks.length)})</text>
            <text fg={theme.textMuted}> — Ctrl+Y to close</text>
          </box>
          <box flexDirection="row" flexGrow={1} minHeight={0}>
            <scrollbox
              width={30}
              paddingLeft={1}
              paddingRight={1}
              verticalScrollbarOptions={{
                trackOptions: {
                  backgroundColor: theme.background,
                  foregroundColor: theme.borderActive,
                },
              }}
            >
              <For each={props.tasks}>
                {(task, index) => {
                  const safeStatus = String(task.status)
                  const safeLabel = String(task.label)
                  const statusColor =
                    safeStatus === "running"
                      ? theme.warning
                      : safeStatus === "success"
                        ? theme.success
                        : safeStatus === "error"
                          ? theme.error
                          : theme.textMuted
                  const statusIcon =
                    safeStatus === "running" ? "●" : safeStatus === "success" ? "✓" : safeStatus === "error" ? "✗" : "○"
                  const isSelected = props.selected === index()
                  return (
                    <box
                      height={1}
                      backgroundColor={isSelected ? theme.backgroundElement : undefined}
                    >
                      <text fg={statusColor}>{statusIcon} {safeLabel}</text>
                      <Show when={isSelected && safeStatus === "running"}>
                        <text fg={theme.textMuted}> [X]</text>
                      </Show>
                    </box>
                  )
                }}
              </For>
              <Show when={props.tasks.length > 0}>
                <box height={1}>
                  <text fg={theme.textMuted}>Ctrl+Y close · ↑↓ select · Del cancel</text>
                </box>
              </Show>
            </scrollbox>
            <Show when={selectedTask()}>
              <scrollbox
                flexGrow={1}
                paddingLeft={2}
                paddingRight={1}
                verticalScrollbarOptions={{
                  trackOptions: {
                    backgroundColor: theme.background,
                    foregroundColor: theme.borderActive,
                  },
                }}
              >
                <text fg={theme.textMuted}>{String(selectedTask()!.output.join("\n") || "(no output)")}</text>
              </scrollbox>
            </Show>
          </box>
        </box>
      </Show>
    </Show>
  )
}
