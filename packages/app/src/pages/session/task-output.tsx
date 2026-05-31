import { For, createEffect, createSignal, on } from "solid-js"
import type { BackgroundTask } from "@/context/background-task"

type TaskOutputProps = {
  task: BackgroundTask
}

export function TaskOutput(props: TaskOutputProps) {
  let scrollRef: HTMLDivElement | undefined
  const [autoScroll, setAutoScroll] = createSignal(true)

  createEffect(
    on(
      () => props.task.outputBuffer.length,
      () => {
        if (autoScroll() && scrollRef) {
          queueMicrotask(() => {
            scrollRef!.scrollTop = scrollRef!.scrollHeight
          })
        }
      },
    ),
  )

  const handleScroll = () => {
    if (!scrollRef) return
    const el = scrollRef
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }

  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center gap-2 px-3 py-1.5 border-b border-border-weaker-base bg-background-surface">
        <span class="text-13-medium text-text-strong truncate">{props.task.label}</span>
        <span class="text-11-regular text-text-weak ml-auto">
          {props.task.status === "running" ? "Running..." : props.task.status}
        </span>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        class="flex-1 overflow-y-auto p-3 font-mono text-13-regular leading-relaxed whitespace-pre-wrap break-all"
      >
        <For each={props.task.outputBuffer}>
          {(line) => <div class="min-h-[1.4em]">{line}</div>}
        </For>
      </div>
    </div>
  )
}
