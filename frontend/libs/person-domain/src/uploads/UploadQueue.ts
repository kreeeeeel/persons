import type {
    UploadInput,
    UploadTask,
    UploadTransfer,
} from "@persons/person-domain/uploads/UploadQueue.types";

export const UPLOAD_COMPLETED_EVENT = "persons:upload-completed";

export class UploadQueue {
    private tasks: readonly UploadTask[] = [];
    private readonly inputs = new Map<string, UploadInput>();
    private readonly listeners = new Set<() => void>();
    private active?: { id: string; controller: AbortController };

    constructor(private readonly transfer: UploadTransfer) {}

    readonly snapshot = () => this.tasks;
    readonly subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    };

    enqueue(inputs: readonly UploadInput[]) {
        const added = inputs.map((input): UploadTask => {
            const id = crypto.randomUUID();
            this.inputs.set(id, input);
            return {
                id,
                personId: input.personId,
                filename: input.file.name,
                kind: input.kind,
                status: "QUEUED",
                progress: 0,
            };
        });
        this.tasks = [...this.tasks, ...added];
        this.emit();
        void this.next();
        return added.map(({ id }) => id);
    }

    cancel(id: string) {
        const task = this.tasks.find((item) => item.id === id);
        if (!task || ["DONE", "ERROR", "CANCELLED"].includes(task.status)) {
            this.dismiss(id);
            return;
        }
        this.inputs.delete(id);
        this.update(id, { status: "CANCELLED" });
        if (this.active?.id === id) {
            this.active.controller.abort();
        }
    }

    dismiss(id: string) {
        if (this.active?.id === id || this.inputs.has(id)) {
            return;
        }
        this.tasks = this.tasks.filter((task) => task.id !== id);
        this.emit();
    }

    private emit() {
        this.listeners.forEach((listener) => listener());
    }

    private update(id: string, patch: Partial<UploadTask>) {
        this.tasks = this.tasks.map((task) =>
            task.id === id ? { ...task, ...patch } : task,
        );
        this.emit();
    }

    private async next() {
        if (this.active) {
            return;
        }
        const task = this.tasks.find((item) => item.status === "QUEUED");
        const input = task && this.inputs.get(task.id);
        if (!task || !input) {
            return;
        }
        const controller = new AbortController();
        this.active = { id: task.id, controller };
        this.update(task.id, { status: "PREPARING" });
        try {
            const receipt = await this.transfer(
                input,
                controller.signal,
                (progress, status) => {
                    if (!controller.signal.aborted) {
                        this.update(task.id, { progress, status });
                    }
                },
            );
            if (!controller.signal.aborted) {
                this.update(task.id, {
                    status: "DONE",
                    progress: 100,
                    receipt,
                });
                if (typeof window !== "undefined") {
                    window.dispatchEvent(
                        new CustomEvent(UPLOAD_COMPLETED_EVENT, {
                            detail: { personId: task.personId, receipt },
                        }),
                    );
                }
            }
        } catch (error) {
            this.update(
                task.id,
                controller.signal.aborted
                    ? { status: "CANCELLED" }
                    : {
                          status: "ERROR",
                          error:
                              error instanceof Error
                                  ? error.message
                                  : "UNAVAILABLE",
                      },
            );
        } finally {
            this.inputs.delete(task.id);
            this.active = undefined;
            void this.next();
        }
    }
}
