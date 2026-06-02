import TaskModel from "../model/task.model";

export const createTaskService = async (
  data: any
) => {

  return await TaskModel.create(data);
};

export const getProjectTasksService = async (
  projectId: string
) => {

  return await TaskModel.find({
    project: projectId,
  })
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email");
};

export const getSingleTaskService = async (
  taskId: string
) => {

  return await TaskModel.findById(taskId)
    .populate("assignedTo", "name email")
    .populate("createdBy", "name email");
};

export const updateTaskService = async (
  taskId: string,
  data: any
) => {

  return await TaskModel.findByIdAndUpdate(
    taskId,
    data,
    { new: true }
  );
};

export const deleteTaskService = async (
  taskId: string
) => {

  return await TaskModel.findByIdAndDelete(taskId);
};