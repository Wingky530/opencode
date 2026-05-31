import { For, Show, createMemo, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { makeEventListener } from "@solid-primitives/event-listener"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { TooltipKeybind } from "@opencode-ai/ui/tooltip"
import { useCommand } from "@/context/command"
import { useLanguage } from "@/context/language"
import { useLayout } from "@/context/layout"
import { useBackgroundTask } from "@/context/background-task"
import { TaskRow } from "@/pages/session/task-row"
import { TaskOutput } from "@/pages/session/task-output"
import { createSizing } from "@/pages/session/helpers"

export function TaskTray() {
  const layout = useLayout()
  const task = useBackgroundTask()
  const language = useLanguage()
  const command = useCommand()
  const size = createSizing()

  const opened = createMemo(() => layout.backgroundTask.opened())
  const height = createMemo(() => layout.backgroundTask.height())
  const close = () => layout.backgroundTask.close()

  const [store, setStore] = createStore({
    view: typeof window === "undefined" ? 1000 : (window.visualViewport?.height ?? window.innerHeight),
  })

  const max = () => store.view * 0.6
  const pane = () => Math.min(height(), max())

  onMount(() => {
    if (typeof window === "undefined") return

    const sync = () => setStore("view", window.visualViewport?.height ?? window.innerHeight)
    const port = window.visualViewport

    sync()
    makeEventListener(window, "resize", sync)
    if (port) makeEventListener(port, "resize", sync)
  })

  let root: HTMLDivElement | undefined

  return (
    <div
      ref={root}
      id="task-tray"
      role="region"
      aria-label="Background Tasks"
      aria-hidden={!opened()}
      inert={!opened()}
      class="relative w-full shrink-0 overflow-hidden bg-background-stronger"
      classList={{
        "border-t border-border-weak-base": opened(),
        "transition-[height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[height] motion-reduce:transition-none":
          !size.active(),
      }}
      style={{ height: opened() ? `${pane()}px` : "0px" }}
    >
      <div
        class="absolute inset-x-0 top-0 flex flex-col"
        classList={{
          "pointer-events-none": !opened(),
        }}
        style={{ height: `${pane()}px` }}
      >
        <div class="hidden md:block" onPointerDown={() => size.start()}>
          <ResizeHandle
            direction="vertical"
            size={pane()}
            min={100}
            max={max()}
            collapseThreshold={50}
            onResize={(next) => {
              size.touch()
              layout.backgroundTask.resize(next)
            }}
            onCollapse={close}
          />
        </div>
        <div class="flex flex-col h-full">
          <div class="h-10 flex items-center gap-2 px-2 border-b border-border-weaker-base bg-background-stronger">
            <span class="text-14-medium text-text-strong px-1">
              {language.t("backgroundTask.title")}
            </span>
            <Show when={task.runningCount() > 0}>
              <span class="text-12-regular text-text-weak bg-surface-base px-1.5 py-0.5 rounded">
                {task.runningCount()} running
              </span>
            </Show>
            <div class="flex-1" />
            <button
              onClick={() => task.clearCompleted()}
              class="text-12-regular text-text-weak hover:text-text-base transition-colors px-2 py-1"
            >
              {language.t("backgroundTask.clearCompleted")}
            </button>
            <TooltipKeybind
              title={language.t("command.backgroundTask.toggle")}
              keybind={command.keybind("backgroundTask.toggle")}
            >
              <IconButton
                icon="close"
                variant="ghost"
                iconSize="small"
                onClick={close}
                aria-label={language.t("command.backgroundTask.toggle")}
              />
            </TooltipKeybind>
          </div>

          <div class="flex-1 min-h-0 flex flex-row overflow-hidden">
            <div class="w-64 shrink-0 overflow-y-auto border-r border-border-weaker-base">
              <Show
                when={task.tasks().length > 0}
                fallback={
                  <div class="flex items-center justify-center h-full text-14-regular text-text-weak">
                    {language.t("backgroundTask.noTasks")}
                  </div>
                }
              >
                <For each={task.tasks()}>
                  {(item) => (
                    <TaskRow
                      task={item}
                      selected={item.id === task.selectedTask()?.id}
                      onSelect={() => task.selectTask(item.id)}
                      onCancel={() => task.cancelTask(item.id)}
                    />
                  )}
                </For>
              </Show>
            </div>
            <div class="flex-1 min-w-0 overflow-hidden">
              <Show when={task.selectedTask()} keyed>
                {(selected) => (
                  <TaskOutput task={selected} />
                )}
              </Show>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
