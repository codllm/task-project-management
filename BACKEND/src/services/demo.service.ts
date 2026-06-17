import Workspace from "../model/workspace.model";
import Project from "../model/project.model";
import TaskModel from "../model/task.model";
import User from "../model/user.model";

export const seedDemoWorkspacesForUser = async (userId: string) => {
  try {
    // 1. Create or Find dummy users
    const dummyData = [
      { email: "jane.admin@sync-demo.com", first: "Jane", last: "Admin" },
      { email: "bob.member@sync-demo.com", first: "Bob", last: "Member" },
      { email: "charlie.member@sync-demo.com", first: "Charlie", last: "Member" },
    ];
    
    const dummyUsers = [];
    for (const d of dummyData) {
      let u = await User.findOne({ email: d.email });
      if (!u) {
        u = await User.create({
          username: { firstname: d.first, lastname: d.last },
          email: d.email,
          password: "demoPassword123!",
          gender: "other",
          usertype: "individual",
          phone: 1234567890,
        });
      }
      dummyUsers.push(u);
    }
    
    const [jane, bob, charlie] = dummyUsers;

    // 2. Create Workspace 1: "🚀 Apollo Space Project"
    const ws1 = await Workspace.create({
      name: "🚀 Apollo Space Project",
      description: "Launch management, payload tracking, and spacecraft engineering operations.",
      owner: userId,
      logoUrl: "https://res.cloudinary.com/dsxhyk1qu/image/upload/v1700000000/mock_logo.png",
      members: [
        { user: userId, role: "owner" },
        { user: jane._id, role: "admin" },
        { user: bob._id, role: "member" },
        { user: charlie._id, role: "viewer" },
      ],
    });

    // Create Project 1.1 inside Workspace 1: "🛰️ Satellite Hardware Design"
    const proj1 = await Project.create({
      name: "🛰️ Satellite Hardware Design",
      description: "Hardware prototyping, telemetry frequency tuning, and sensor calibration.",
      workspace: ws1._id,
      createdBy: userId,
      color: "#95E0F9",
      coverImageUrl: "https://res.cloudinary.com/dsxhyk1qu/image/upload/v1781708888164.png",
      members: [
        { user: userId, role: "admin" },
        { user: jane._id, role: "admin" },
        { user: bob._id, role: "member" },
      ],
      columns: [
        { id: "todo", label: "To Do", color: "#A8ACB9" },
        { id: "in-progress", label: "In Progress", color: "#EF9F27" },
        { id: "testing", label: "QA Testing", color: "#38BDF8" },
        { id: "completed", label: "Completed", color: "#5DCAA5" }
      ],
      customFields: [
        { name: "Story Points", type: "number", required: false }
      ]
    });

    // Create tasks for Project 1.1
    await TaskModel.create({
      title: "Draft launch trajectory specs",
      description: "Determine orbital injection points and booster separation velocities.",
      status: "completed",
      priority: "high",
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      startDate: new Date(),
      project: proj1._id,
      assignedTo: [userId],
      createdBy: userId,
      estimatedHours: 8,
      actualHours: 8,
      timeLogs: [
        { loggedBy: userId, hours: 8, description: "Calculated trajectory paths", date: new Date() }
      ],
      customFields: [
        { name: "Story Points", value: 5 }
      ]
    });

    await TaskModel.create({
      title: "Assemble payload sensor array",
      description: "Integrate infrared and thermal cameras onto core payload structure.",
      status: "testing",
      priority: "medium",
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      startDate: new Date(),
      project: proj1._id,
      assignedTo: [bob._id],
      createdBy: userId,
      estimatedHours: 12,
      actualHours: 10,
      timeLogs: [
        { loggedBy: bob._id, hours: 10, description: "Mounted arrays and tested connections", date: new Date() }
      ],
      customFields: [
        { name: "Story Points", value: 8 }
      ]
    });

    await TaskModel.create({
      title: "Calibrate telemetry frequencies",
      description: "Fine-tune radio telemetry transmitters to avoid signal interference.",
      status: "in-progress",
      priority: "high",
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      startDate: new Date(),
      project: proj1._id,
      assignedTo: [userId, jane._id],
      createdBy: userId,
      estimatedHours: 6,
      actualHours: 4,
      timeLogs: [
        { loggedBy: userId, hours: 4, description: "Initial spectrum analysis", date: new Date() }
      ],
      customFields: [
        { name: "Story Points", value: 3 }
      ]
    });

    await TaskModel.create({
      title: "Acquire secondary rocket boosters",
      description: "Finalize sourcing contract for solid rocket booster additions.",
      status: "todo",
      priority: "low",
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      startDate: new Date(),
      project: proj1._id,
      assignedTo: [],
      createdBy: userId,
      estimatedHours: 20,
      actualHours: 0,
      customFields: [
        { name: "Story Points", value: 13 }
      ]
    });

    // Create Project 1.2 inside Workspace 1: "📢 Campaign Marketing & PR"
    const proj2 = await Project.create({
      name: "📢 Campaign Marketing & PR",
      description: "Launch countdown campaign, press releases, and public relations.",
      workspace: ws1._id,
      createdBy: userId,
      color: "#FED7AA",
      coverImageUrl: "https://res.cloudinary.com/dsxhyk1qu/image/upload/v1781708897790.png",
      members: [
        { user: userId, role: "admin" },
        { user: jane._id, role: "member" },
      ],
      columns: [
        { id: "todo", label: "To Do", color: "#A8ACB9" },
        { id: "in-progress", label: "In Progress", color: "#EF9F27" },
        { id: "completed", label: "Completed", color: "#5DCAA5" }
      ],
    });

    await TaskModel.create({
      title: "Prepare press release document",
      description: "Write official press kit detailing apollo launch timelines.",
      status: "todo",
      priority: "medium",
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      project: proj2._id,
      assignedTo: [jane._id],
      createdBy: userId,
      estimatedHours: 4,
    });

    await TaskModel.create({
      title: "Launch countdown teaser video",
      description: "Edit countdown promo video clips for social channels.",
      status: "in-progress",
      priority: "high",
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      project: proj2._id,
      assignedTo: [userId],
      createdBy: userId,
      estimatedHours: 16,
      actualHours: 8,
    });

    // 3. Create Workspace 2: "💻 Acme Software Co."
    const ws2 = await Workspace.create({
      name: "💻 Acme Software Co.",
      description: "Engineering team sprints, product roadmaps, and bug backlogs.",
      owner: userId,
      logoUrl: "https://res.cloudinary.com/dsxhyk1qu/image/upload/v1700000000/mock_logo.png",
      members: [
        { user: userId, role: "owner" },
        { user: jane._id, role: "member" },
        { user: bob._id, role: "member" },
      ],
    });

    // Create Project 2.1 inside Workspace 2: "📱 Mobile App v2.0"
    const proj3 = await Project.create({
      name: "📱 Mobile App v2.0",
      description: "Building the next generation of SyncTask app with customizable board UI.",
      workspace: ws2._id,
      createdBy: userId,
      color: "#E8D4F5",
      coverImageUrl: "https://res.cloudinary.com/dsxhyk1qu/image/upload/v1781708907865.png",
      members: [
        { user: userId, role: "admin" },
        { user: jane._id, role: "member" },
        { user: bob._id, role: "member" },
      ],
      columns: [
        { id: "sprint-backlog", label: "Sprint Backlog", color: "#A8ACB9" },
        { id: "dev", label: "Development", color: "#EF9F27" },
        { id: "qa", label: "QA Testing", color: "#F472B6" },
        { id: "done", label: "Done", color: "#5DCAA5" }
      ],
      customFields: [
        { name: "Sprint", type: "number", required: false },
        { name: "Client Approved", type: "boolean", required: false }
      ]
    });

    await TaskModel.create({
      title: "Implement Cloudinary Avatar Uploads",
      description: "Integrate expo-image-picker and wire profile avatar PUT endpoint.",
      status: "done",
      priority: "high",
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      project: proj3._id,
      assignedTo: [userId],
      createdBy: userId,
      estimatedHours: 6,
      actualHours: 5,
      timeLogs: [
        { loggedBy: userId, hours: 5, description: "Implemented Cloudinary upload & widget", date: new Date() }
      ],
      customFields: [
        { name: "Sprint", value: 2 },
        { name: "Client Approved", value: true }
      ]
    });

    await TaskModel.create({
      title: "Custom Kanban Status Columns UI",
      description: "Support project-defined dynamic columns and custom statuses on the board view.",
      status: "dev",
      priority: "medium",
      dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      project: proj3._id,
      assignedTo: [userId],
      createdBy: userId,
      estimatedHours: 10,
      actualHours: 8,
      timeLogs: [
        { loggedBy: userId, hours: 8, description: "Wired dynamic columns loader & config modal", date: new Date() }
      ],
      customFields: [
        { name: "Sprint", value: 2 },
        { name: "Client Approved", value: false }
      ]
    });

    await TaskModel.create({
      title: "Offline Cache Sync Replay Support",
      description: "Integrate AsyncStorage action queue and sync replay hook when connection resumes.",
      status: "qa",
      priority: "high",
      dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      project: proj3._id,
      assignedTo: [bob._id],
      createdBy: userId,
      estimatedHours: 15,
      actualHours: 15,
      timeLogs: [
        { loggedBy: bob._id, hours: 15, description: "Wired offline queue manager", date: new Date() }
      ],
      customFields: [
        { name: "Sprint", value: 2 },
        { name: "Client Approved", value: true }
      ]
    });

    console.log(`Demo workspaces seeded successfully for user: ${userId}`);
  } catch (error) {
    console.error("Failed to seed demo workspaces:", error);
  }
};
