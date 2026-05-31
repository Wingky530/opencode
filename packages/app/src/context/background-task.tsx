import { createStore, produce } from "solid-js/store"
import { createSimpleContext } from "@opencode-ai/ui/context"
import { createMemo, createEffect, on } from "solid-js"
import { Identifier } from "@/utils/id"
import { useSDK } from "@/context/sdk"
import { usePrompt } from "@/context/prompt"
import { useLanguage } from "@/context/language"
import { createTaskManager } from "@/lib/task-manager"
import { createContextInjector } from "@/lib/context-injector"

export type TaskType = "shell" | "agent"
export type TaskStatus = "running" | "done" | "error" | "cancelled"

export type BackgroundTask = {
  id: string
  type: TaskType
  label: string
  status: TaskStatus
  outputBuffer: string[]
  summary: string
  startedAt: number
  completedAt?: number
}

const MAX_OUTPUT_LINES = 20

function createCircularBuffer(existing: string[], newLine: string, maxLines: number): string[] {
  const buffer = [...existing, newLine]
  if (buffer.length > maxLines) {
    return buffer.slice(buffer.length - maxLines)
  }
  return buffer
}

export const { use: useBackgroundTask, provider: BackgroundTaskProvider } = createSimpleContext({
  name: "BackgroundTask",
  gate: false,
  init: () => {
    const [store, setStore] = createStore<{
      tasks: BackgroundTask[]
      selectedTaskId: string | undefined
      focused: boolean
    }>({
      tasks: [],
      selectedTaskId: undefined,
      focused: false,
    })

    const injectedTaskIds = new Set<string>()

    const sdk = useSDK()
    const prompt = usePrompt()
    const language = useLanguage()

    const taskManager = createTaskManager({
      sdk,
      backgroundTask: {
        addTask: (input) => addTask(input),
        updateTask: (id, updates) => updateTask(id, updates),
        appendOutput: (id, line) => appendOutput(id, line),
        cancelTask: (id) => cancelTask(id),
      },
    })
    const contextInjector = createContextInjector({ prompt, language })

    const runningCount = createMemo(() => store.tasks.filter((t) => t.status === "running").length)
    const taskList = createMemo(() => store.tasks)
    const selectedTask = createMemo(() => store.tasks.find((t) => t.id === store.selectedTaskId))
    const isFocused = createMemo(() => store.focused)

    const addTask = (input: { type: TaskType; label: string; command?: string }) => {
      const task: BackgroundTask = {
        id: Identifier.ascending("task"),
        type: input.type,
        label: input.label,
        status: "running",
        outputBuffer: [],
        summary: "",
        startedAt: Date.now(),
      }

      setStore("tasks", (tasks) => [...tasks, task])
      return task.id
    }

    const updateTask = (id: string, updates: Partial<BackgroundTask>) => {
      const index = store.tasks.findIndex((t) => t.id === id)
      if (index === -1) return

      const currentTask = store.tasks[index]
      if (currentTask.status !== "running" && updates.status === "running") {
        console.warn(`Attempted to change task ${id} status from ${currentTask.status} to running.`)
        return
      }

      setStore("tasks", index, (task) => ({
        ...task,
        ...updates,
        ...(updates.status && updates.status !== "running" && !task.completedAt
          ? { completedAt: Date.now() }
          : {}),
      }))
    }

    const appendOutput = (id: string, line: string) => {
      const index = store.tasks.findIndex((t) => t.id === id)
      if (index === -1) return

      setStore("tasks", index, (task) => ({
        ...task,
        outputBuffer: createCircularBuffer(task.outputBuffer, line, MAX_OUTPUT_LINES),
      }))
    }

    const removeTask = (id: string) => {
      setStore(
        "tasks",
        produce((draft) => {
          const index = draft.findIndex((t) => t.id === id)
          if (index !== -1) {
            draft.splice(index, 1)
          }
        }),
      )

      if (store.selectedTaskId === id) {
        setStore("selectedTaskId", undefined)
      }
      injectedTaskIds.delete(id)
    }

    const cancelTask = (id: string) => {
      const task = store.tasks.find(t => t.id === id)
      if (task && task.status === "running") {
        taskManager.cancelTask(id)
      } else {
        updateTask(id, { status: "cancelled" })
      }
    }

    const selectTask = (id: string | undefined) => {
      setStore("selectedTaskId", id)
    }

    const setFocused = (focused: boolean) => {
      setStore("focused", focused)
    }

    const navigateTask = (direction: "up" | "down") => {
      const tasks = store.tasks
      if (tasks.length === 0) return

      const currentIndex = store.selectedTaskId ? tasks.findIndex((t) => t.id === store.selectedTaskId) : -1

      let nextIndex: number
      if (currentIndex === -1) {
        nextIndex = direction === "down" ? 0 : tasks.length - 1
      } else {
        nextIndex = direction === "down" ? currentIndex + 1 : currentIndex - 1
        if (nextIndex < 0) nextIndex = tasks.length - 1
        if (nextIndex >= tasks.length) nextIndex = 0
      }

      setStore("selectedTaskId", tasks[nextIndex]?.id)
    }

    const clearCompleted = () => {
      setStore(
        "tasks",
        produce((draft) => {
          const completedTasks = draft.filter((t) => t.status !== "running")
          for (const task of completedTasks) {
            const index = draft.findIndex((t) => t.id === task.id)
            if (index !== -1) {
              draft.splice(index, 1)
            }
          }
        }),
      )

      if (store.selectedTaskId && !store.tasks.find((t) => t.id === store.selectedTaskId)) {
        setStore("selectedTaskId", undefined)
      }
    }

    createEffect(
      on(taskList, (tasks) => {
        tasks.forEach(task => {
          if (task.status !== "running" && !injectedTaskIds.has(task.id)) {
            contextInjector.injectCompletedTask(task)
            injectedTaskIds.add(task.id)
          }
        })
      })
    )

    return {
      tasks: taskList,
      selectedTask,
      runningCount,
      isFocused,
      addTask: taskManager.spawnShellTask.bind(taskManager),
      spawnAgentTask: taskManager.spawnAgentTask.bind(taskManager),
      updateTask,
      appendOutput,
      removeTask,
      cancelTask,
      selectTask,
      setFocused,
      navigateTask,
      clearCompleted,
    }
  },
})