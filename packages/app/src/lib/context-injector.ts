import type { BackgroundTask } from "@/context/background-task"
import type { usePrompt } from "@/context/prompt"
import type { useLanguage } from "@/context/language"

export type ContextInjectorOptions = {
  prompt: ReturnType<typeof usePrompt>
  language: ReturnType<typeof useLanguage>
}

export class ContextInjector {
  private prompt: ReturnType<typeof usePrompt>
  private language: ReturnType<typeof useLanguage>

  constructor(options: ContextInjectorOptions) {
    this.prompt = options.prompt
    this.language = options.language
  }

  injectCompletedTask(task: BackgroundTask): void {
    const duration = task.completedAt ? ((task.completedAt - task.startedAt) / 1000).toFixed(1) : "N/A"

    let outputLines = task.outputBuffer
    if (outputLines.length > 3) {
      outputLines = outputLines.slice(-3)
    }
    const lastOutput = outputLines.map(line => `  ${line}`).join("\n")

    const header = "--- Background Task Result ---"
    const body = [
      `Type: ${task.type}`,
      `Label: ${task.label}`,
      `Status: ${task.status} (${duration}s)`,
      task.summary ? `Summary: ${task.summary}` : "",
      lastOutput ? `\nLast output:\n${lastOutput}` : "",
    ]
      .filter(Boolean)
      .join("\n")

    const content = `\n\n${header}\n${body}\n`

    const current = this.prompt.current()
    this.prompt.set(
      [
        {
          type: "text",
          content,
          start: 0,
          end: content.length,
        },
        ...current,
      ],
      content.length,
    )
  }
}

export function createContextInjector(options: ContextInjectorOptions): ContextInjector {
  return new ContextInjector(options)
}
