import type { useSDK } from "@/context/sdk"

export type TaskType = "shell" | "agent"

export type TaskStatus = "running" | "done" | "error" | "cancelled"

export type BackgroundTaskActions = {
  addTask: (input: { type: TaskType; label: string; command?: string }) => string
  updateTask: (id: string, updates: { status?: TaskStatus; summary?: string }) => void
  appendOutput: (id: string, line: string) => void
  cancelTask: (id: string) => void
}

export type TaskManagerOptions = {
  sdk: ReturnType<typeof useSDK>
  backgroundTask: BackgroundTaskActions
}

export type SpawnTaskOptions = {
  command: string
  label?: string
  cwd?: string
  env?: Record<string, string>
}

export class TaskManager {
  private sdk: ReturnType<typeof useSDK>
  private backgroundTask: BackgroundTaskActions
  private abortControllers: Map<string, AbortController>

  constructor(options: TaskManagerOptions) {
    this.sdk = options.sdk
    this.backgroundTask = options.backgroundTask
    this.abortControllers = new Map()
  }

  async spawnShellTask(options: SpawnTaskOptions): Promise<string> {
    const label = options.label || options.command
    const taskId = this.backgroundTask.addTask({
      type: "shell",
      label,
    })

    const abortController = new AbortController()
    this.abortControllers.set(taskId, abortController)

    this.executeShellCommand(taskId, options, abortController.signal).catch((error) => {
      console.error(`Task ${taskId} failed:`, error)
    })

    return taskId
  }

  private async executeShellCommand(
    taskId: string,
    options: SpawnTaskOptions,
    signal: AbortSignal,
  ): Promise<void> {
    const startTime = Date.now()

    try {
      const result = await this.sdk.client.bash.run({
        command: options.command,
        ...(options.cwd ? { cwd: options.cwd } : {}),
        ...(options.env ? { env: options.env } : {}),
      })

      if (signal.aborted) {
        this.backgroundTask.updateTask(taskId, {
          status: "cancelled",
          summary: "Cancelled by user",
        })
        return
      }

      const output = result.data?.output || ""
      const exitCode = result.data?.exitCode ?? 0
      const duration = ((Date.now() - startTime) / 1000).toFixed(1)

      const lines = output.split("\n").filter((line) => line.trim())
      for (const line of lines) {
        this.backgroundTask.appendOutput(taskId, line)
      }

      if (exitCode === 0) {
        this.backgroundTask.updateTask(taskId, {
          status: "done",
          summary: `exit ${exitCode} (${duration}s)`,
        })
      } else {
        this.backgroundTask.updateTask(taskId, {
          status: "error",
          summary: `exit ${exitCode} (${duration}s)`,
        })
      }
    } catch (error) {
      if (signal.aborted) {
        this.backgroundTask.updateTask(taskId, {
          status: "cancelled",
          summary: "Cancelled by user",
        })
        return
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      const errorMessage = error instanceof Error ? error.message : String(error)

      this.backgroundTask.appendOutput(taskId, `Error: ${errorMessage}`)
      this.backgroundTask.updateTask(taskId, {
        status: "error",
        summary: `Failed: ${errorMessage} (${duration}s)`,
      })
    } finally {
      this.abortControllers.delete(taskId)
    }
  }

  cancelTask(taskId: string): void {
    const controller = this.abortControllers.get(taskId)
    if (controller) {
      controller.abort()
      this.abortControllers.delete(taskId)
    }
    this.backgroundTask.cancelTask(taskId)
  }

  async spawnAgentTask(options: { label: string; agentName: string }): Promise<string> {
    const taskId = this.backgroundTask.addTask({
      type: "agent",
      label: options.label,
    })

    this.backgroundTask.appendOutput(taskId, `Starting agent: ${options.agentName}`)
    this.backgroundTask.appendOutput(taskId, "Agent tasks are not yet implemented")

    this.backgroundTask.updateTask(taskId, {
      status: "done",
      summary: "Agent task placeholder",
    })

    return taskId
  }
}

export function createTaskManager(options: TaskManagerOptions): TaskManager {
  return new TaskManager(options)
}
