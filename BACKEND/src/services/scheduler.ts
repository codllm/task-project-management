import TaskModel from "../model/task.model";
import ProjectModel from "../model/project.model";
import { createNotification } from "./notification.service";
import { emitToProject } from "./socket";
import { createActivityLog } from "./activity.service";

// Helper to calculate the next run date based on frequency
export const calculateNextRun = (frequency: string, fromDate: Date = new Date()): Date => {
  const next = new Date(fromDate);
  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      // Fallback in case of invalid or 'none' frequency
      next.setDate(next.getDate() + 1);
  }
  return next;
};

// Check and process recurring tasks
export const checkRecurringTasks = async () => {
  try {
    const now = new Date();
    // Find tasks that are recurring and past their nextRun date
    const overdueTasks = await TaskModel.find({
      "recurring.isRecurring": true,
      "recurring.nextRun": { $lte: now },
      isArchived: { $ne: true },
    });

    for (const task of overdueTasks) {
      try {
        const nextRun = task.recurring.nextRun || now;
        // Determine the next run date that is in the future
        let newNextRun = calculateNextRun(task.recurring.frequency, nextRun);
        while (newNextRun <= now) {
          newNextRun = calculateNextRun(task.recurring.frequency, newNextRun);
        }

        // Get current count of tasks in 'todo' status to assign new position
        const todoCount = await TaskModel.countDocuments({
          project: task.project,
          status: "todo",
        });

        // Clone the task:
        // Set status to todo, clear dependencies, reset subtask completion, and isRecurring: false on the clone
        const cloneData = {
          title: task.title,
          description: task.description,
          status: "todo",
          priority: task.priority,
          project: task.project,
          assignedTo: task.assignedTo,
          createdBy: task.createdBy,
          labels: task.labels,
          subtasks: task.subtasks.map((st) => ({
            title: st.title,
            completed: false,
          })),
          position: todoCount,
          recurring: {
            isRecurring: false,
            frequency: "none",
          },
        };

        const clonedTask = await TaskModel.create(cloneData as any);
        
        // Update the original task with the advanced nextRun
        task.recurring.nextRun = newNextRun;
        await task.save();

        // Populate and emit updates
        const populatedClonedTask = await TaskModel.findById(clonedTask._id)
          .populate("assignedTo", "username email")
          .populate("createdBy", "username email");

        if (populatedClonedTask) {
          emitToProject(task.project.toString(), "task:created", populatedClonedTask);
        }

        // Log activity for the creation of the cloned task
        const project = await ProjectModel.findById(task.project);
        if (project) {
          await createActivityLog({
            workspace: project.workspace.toString(),
            project: project._id.toString(),
            task: clonedTask._id.toString(),
            user: task.createdBy.toString(),
            action: "task_created",
            details: `automatically created recurring task instance "${clonedTask.title}"`,
          });
        }
      } catch (err) {
        console.error(`Error processing recurring task ${task._id}:`, err);
      }
    }
  } catch (error) {
    console.error("Error checking recurring tasks:", error);
  }
};

// Check for upcoming deadlines and send reminders
export const checkUpcomingReminders = async () => {
  try {
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setHours(tomorrow.getHours() + 24);

    // Find tasks due within the next 24 hours that haven't received a reminder
    const tasksDueSoon = await TaskModel.find({
      dueDate: { $gte: now, $lte: tomorrow },
      status: { $ne: "completed" },
      isArchived: { $ne: true },
      reminderSent: { $ne: true },
    }).populate("assignedTo", "username email");

    for (const task of tasksDueSoon) {
      try {
        if (task.assignedTo && task.assignedTo.length > 0) {
          for (const assignee of task.assignedTo) {
            await createNotification({
              recipient: assignee._id.toString(),
              sender: task.createdBy.toString(),
              type: "TASK_UPDATED",
              title: "Task Due Tomorrow",
              message: `The task "${task.title}" is due tomorrow!`,
              link: `/projects/${task.project}/tasks/${task._id}`,
            });
          }
        }
        
        // Mark reminder as sent
        task.reminderSent = true;
        await task.save();
      } catch (err) {
        console.error(`Error sending reminder for task ${task._id}:`, err);
      }
    }
  } catch (error) {
    console.error("Error checking upcoming reminders:", error);
  }
};

let intervalId: NodeJS.Timeout | null = null;

export const startScheduler = () => {
  if (intervalId) return;

  console.log("Starting background task scheduler...");
  
  // Run checks immediately on startup
  checkRecurringTasks();
  checkUpcomingReminders();

  // Run checks every 60 seconds
  intervalId = setInterval(async () => {
    await checkRecurringTasks();
    await checkUpcomingReminders();
  }, 60000);
};

export const stopScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("Stopped background task scheduler.");
  }
};
