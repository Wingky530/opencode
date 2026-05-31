import { Show, createMemo } from "solid-js"
import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { useLanguage } from "@/context/language"
import type { BackgroundTask } from "@/context/background-task"

type TaskRowProps = {
  task: BackgroundTask
  selected: boolean
  onSelect: () => void
  onCancel: () => void
}

export function TaskRow(props: TaskRowProps) {
  const language = useLanguage()

  const statusIcon = createMemo(() => {
    switch (props.task.status) {
      case "running":
        return "status-active" as const
      case "done":
        return "circle-check" as const
      case "error":
        return "warning" as const
      case "cancelled":
        return "circle-ban-sign" as const
    }
  })

  const duration = createMemo(() => {
    const start = props.task.startedAt
    const end = props.task.completedAt ?? Date.now()
    const ms = end - start
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.round((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  })

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={props.onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          props.onSelect()
        }
      }}
      class="flex items-center gap-2 px-3 py-2 cursor-pointer border-b border-border-weaker-base last:border-b-0"
      classList={{
        "bg-surface-base": props.selected,
        "hover:bg-surface-base/50": !props.selected,
      }}
    >
      <Icon name={statusIcon()} class="size-4 shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="text-13-regular text-text-strong truncate">{props.task.label}</div>
        <div class="text-11-regular text-text-weak">{duration()}</div>
      </div>
      <Show when={props.task.status === "running"}>
        <IconButton
          icon="close-small"
          variant="ghost"
          iconSize="small"
          onClick={(e) => {
            e.stopPropagation()
            props.onCancel()
          }}
          aria-label={language.t("common.cancel")}
        />
      </Show>
    </div>
  )
}
