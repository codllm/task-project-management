import userModel from "../model/user.model";
import projectModel from "../model/project.model";
import workspaceModel from "../model/workspace.model";
export const userSuggestion = async (query: string) => {
  try {
    const searchResult = await userModel.find({
      email: {
        $regex: query,
        $options: "i",
      },
    })
    .select("name email")
    .limit(15);

    return searchResult;

  } catch (error) {
    console.error(
      "Error searching for users:",
      error
    );
    throw new Error(
      "Failed to search for users"
    );

  }

};

export const projectSuggestion = async (query: string) => {
  try {
    const searchResult = await projectModel.find({
      name: {
        $regex: query,
        $options: "i",
      },
    })
    .select("name")
    .limit(10);

    return searchResult;

  } catch (error) {
    console.error(
      "Error searching for projects:",
      error
    );
    throw new Error(
      "Failed to search for projects"
    );

  }
}

export const workspaceSuggestion = async (query: string) => {
  try {
    const searchResult = await workspaceModel.find({
      name: {
        $regex: query,
        $options: "i",
      },
    })
    .select("name")
    .limit(10);

    return searchResult;

  } catch (error) {
    console.error(
      "Error searching for workspaces:",
      error
    );
    throw new Error(
      "Failed to search for workspaces"
    );

  }
}