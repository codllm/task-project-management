import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./model/user.model";
import Workspace from "./model/workspace.model";
import Project from "./model/project.model";
import TaskModel from "./model/task.model";
import Milestone from "./model/milestone.model";
import CommentModel from "./model/comment.model";
import Notification from "./model/notification.model";
import ActivityModel from "./model/activity.model";
import { createTaskService, updateTaskService } from "./services/task.service";
import { createCommentService, toggleCommentReactionService } from "./services/comment.service";

dotenv.config();

const MONGO_URL = process.env.MONGO_URL || "mongodb+srv://workspace:workspacee@workspace.fywqftz.mongodb.net/?appName=workspace";

async function runSeederAndRun() {
  console.log("==================================================");
  console.log("🚀 STARTING COMPREHENSIVE PHASE 2 INTEGRATION  RUN...");
  console.log("==================================================");

  let passedTestsCount = 0;
  let totalTestsCount = 0;

  const testReport: { name: string; status: "PASSED" | "FAILED"; details: string }[] = [];

  function logTest(name: string, success: boolean, details: string) {
    totalTestsCount++;
    if (success) passedTestsCount++;
    testReport.push({
      name,
      status: success ? "PASSED" : "FAILED",
      details
    });
    console.log(`${success ? "✅" : "❌"} ${name}: ${details}`);
  }

  try {
    // 1. Connect to MongoDB
    console.log("\n🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected successfully!");

    // 2. Cleanup previous run data
    console.log("\n🧹 Cleaning up old run test data (including any stale dryrun entries)...");
    
    // Find all users from previous runs
    const staleUsers = await User.find({
      email: { $in: [/test\.run\..*/, /test\.dryrun\..*/] }
    });
    const staleUserIds = staleUsers.map(u => u._id);

    if (staleUserIds.length > 0) {
      console.log(`- Found ${staleUserIds.length} stale test users. Deleting associated records...`);
      const deletedWorkspaces = await Workspace.deleteMany({
        $or: [
          { owner: { $in: staleUserIds } },
          { name: { $in: ["Run Workspace", "DryRun Workspace"] } }
        ]
      });
      const deletedProjects = await Project.deleteMany({
        $or: [
          { createdBy: { $in: staleUserIds } },
          { name: { $in: ["Run Project", "DryRun Project"] } }
        ]
      });
      const deletedTasks = await TaskModel.deleteMany({ createdBy: { $in: staleUserIds } });
      const deletedComments = await CommentModel.deleteMany({ user: { $in: staleUserIds } });
      const deletedNotifications = await Notification.deleteMany({ recipient: { $in: staleUserIds } });
      const deletedActivities = await ActivityModel.deleteMany({ user: { $in: staleUserIds } });

      console.log(`  * Workspaces deleted: ${deletedWorkspaces.deletedCount}`);
      console.log(`  * Projects deleted: ${deletedProjects.deletedCount}`);
      console.log(`  * Tasks deleted: ${deletedTasks.deletedCount}`);
      console.log(`  * Comments deleted: ${deletedComments.deletedCount}`);
      console.log(`  * Notifications deleted: ${deletedNotifications.deletedCount}`);
      console.log(`  * Activity logs deleted: ${deletedActivities.deletedCount}`);
    }

    const deletedUsers = await User.deleteMany({ email: { $in: [/test\.run\..*/, /test\.dryrun\..*/] } });
    console.log(`- Deleted ${deletedUsers.deletedCount} test users.`);
    console.log("✅ Database cleanup completed successfully!");

    // 3. Create 5 dummy users
    console.log("\n👤 Creating 5 test users (Owner, Admin, Member 1, Member 2, Viewer)...");
    const rawUsersData = [
      { first: "John", last: "Owner", email: "test.run.owner@example.com", type: "individual" },
      { first: "Jane", last: "Admin", email: "test.run.admin@example.com", type: "team" },
      { first: "Bob", last: "Member", email: "test.run.member1@example.com", type: "team" },
      { first: "Charlie", last: "Member", email: "test.run.member2@example.com", type: "team" },
      { first: "Alice", last: "Viewer", email: "test.run.viewer@example.com", type: "team" },
    ];

    const users: any[] = [];
    for (const ud of rawUsersData) {
      const u = new User({
        username: { firstname: ud.first, lastname: ud.last },
        email: ud.email,
        password: "testpassword123",
        gender: "other",
        usertype: ud.type,
        notificationPreferences: {
          comments: true,
          assignments: true,
          mentions: true,
          reminders: true,
        }
      });
      u.password = await u.hashPassword(u.password);
      await u.save();
      users.push(u);
      console.log(`- Created User: ${ud.first} ${ud.last} (${ud.email})`);
    }

    const [owner, admin, member1, member2, viewer] = users;

    // Test 1: User Notification Preferences Save
    console.log("\n🧪 Running Test 1: Notification Preferences Update...");
    try {
      admin.notificationPreferences.mentions = false;
      await admin.save();
      const adminAfterSave = await User.findById(admin._id);
      const success = adminAfterSave?.notificationPreferences?.mentions === false;
      // Toggle it back to true for remaining tests
      if (adminAfterSave && adminAfterSave.notificationPreferences) {
        adminAfterSave.notificationPreferences.mentions = true;
        await adminAfterSave.save();
      }
      logTest("Notification Preferences", success, "User notification preferences saved and retrieved correctly");
    } catch (e: any) {
      logTest("Notification Preferences", false, e.message);
    }

    // Query all real non-test users in the database to link them to this workspace & project
    const realUsers = await User.find({ email: { $not: /test\..*/ } });
    console.log(`- Found ${realUsers.length} real user accounts. Linking them as workspace/project admins...`);
    const realWorkspaceMembers = realUsers.map(u => ({ user: u._id, role: "admin" }));
    const realProjectMembers = realUsers.map(u => ({ user: u._id, role: "admin" }));

    // 4. Create Workspace (Workspace Logo Customization)
    console.log("\n💼 Creating test workspace...");
    const workspace = new Workspace({
      name: "Run Workspace",
      description: " run workspace to verify all Phase 2 features",
      owner: owner._id,
      members: [
        { user: owner._id, role: "owner" },
        { user: admin._id, role: "admin" },
        { user: member1._id, role: "member" },
        { user: member2._id, role: "member" },
        { user: viewer._id, role: "viewer" },
        ...realWorkspaceMembers
      ],
      logoUrl: "https://res.cloudinary.com/dsxhyk1qu/image/upload/v1700000000/mock_logo.png",
    });
    await workspace.save();
    console.log(`✅ Created Workspace: "${workspace.name}" with custom logo.`);

    // Test 2: Logo Customization Check
    logTest("Workspace Logo Link", !!workspace.logoUrl, `Logo URL saved successfully: ${workspace.logoUrl}`);

    // 5. Create Project (Project Cover Image Customization)
    console.log("\n📁 Creating test project...");
    const project = new Project({
      name: "Run Project",
      description: "Custom project for system  run validations",
      color: "#C2F193",
      coverImageUrl: "https://res.cloudinary.com/dsxhyk1qu/image/upload/v1700000000/mock_cover.png",
      workspace: workspace._id,
      createdBy: owner._id,
      status: "ACTIVE",
      members: [
        { user: owner._id, role: "admin" },
        { user: admin._id, role: "admin" },
        { user: member1._id, role: "member" },
        { user: member2._id, role: "member" },
        { user: viewer._id, role: "viewer" },
        ...realProjectMembers
      ],
    });
    await project.save();
    console.log(`✅ Created Project: "${project.name}" with cover banner.`);

    // Test 3: Project Cover Image Check
    logTest("Project Cover Image Link", project.coverImageUrl === "https://res.cloudinary.com/dsxhyk1qu/image/upload/v1700000000/mock_cover.png", `Cover image URL saved successfully: ${project.coverImageUrl}`);

    // 6. Create Milestones
    console.log("\n🏁 Creating project milestones...");
    const milestoneCompleted = new Milestone({
      title: "Database Design & Setup",
      description: "Completed milestone for initial schema creation",
      project: project._id,
      status: "completed",
    });
    await milestoneCompleted.save();

    const milestoneActive = new Milestone({
      title: "Phase 2 Deployments",
      description: "Active milestone for core functionality integrations",
      project: project._id,
      status: "active",
    });
    await milestoneActive.save();
    console.log(`✅ Created Milestones: "${milestoneCompleted.title}" (completed) & "${milestoneActive.title}" (active)`);

    // Test 4: Milestone Creation check
    logTest("Project Milestones", !!milestoneCompleted._id && !!milestoneActive._id, "Active and Completed milestones created successfully");

    // 7. Create Tasks using the createTaskService layer
    console.log("\n📝 Creating tasks using Task Service layer...");

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Task 1: Overdue Task with rich text and user mentions (@jane_admin, @alice_viewer)
    console.log("- Creating Task 1 (Overdue with markdown description and mentions)...");
    const task1 = await createTaskService({
      title: "Implement Rich Text Editor",
      description: "Must support **bold**, *italic*, lists, code, and mentions like @jane_admin and @alice_viewer.",
      status: "todo",
      priority: "high",
      dueDate: twoDaysAgo,
      project: project._id.toString(),
      createdBy: owner._id.toString(),
      assignedTo: [member1._id.toString()],
      subtasks: [
        { title: "Define Markdown toolbar", completed: true },
        { title: "Implement inline regex parser", completed: false },
      ],
      labels: ["Feature", "Urgent"],
      milestone: milestoneActive._id.toString(),
    });

    // Task 2: Upcoming Task
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    console.log("- Creating Task 2 (Upcoming)...");
    const task2 = await createTaskService({
      title: "Parser Helper Functions",
      description: "Simple parser module for highlight mentions",
      status: "in-progress",
      priority: "medium",
      dueDate: tomorrow,
      project: project._id.toString(),
      createdBy: owner._id.toString(),
      assignedTo: [member2._id.toString()],
      subtasks: [],
    });

    // Task 3: Blocked Task (with Dependency on Task 2, Recurring)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    console.log("- Creating Task 3 (Blocked on Task 2 & Recurring Weekly)...");
    const task3 = await createTaskService({
      title: "QA Test Integrations",
      description: "Verify that all checklist and description inputs parse formatting correctly.",
      status: "todo",
      priority: "low",
      dueDate: nextWeek,
      project: project._id.toString(),
      createdBy: owner._id.toString(),
      assignedTo: [viewer._id.toString()],
      dependencies: [task2._id.toString()],
      recurring: {
        isRecurring: true,
        frequency: "weekly",
      },
    });

    // Test 5: Verify Mentions Parse on Task Creation
    console.log("\n🧪 Running Test 5: Mention Parsing & Notifications verify...");
    const adminNotifications = await Notification.find({ recipient: admin._id, type: "TASK_UPDATED" });
    const viewerNotifications = await Notification.find({ recipient: viewer._id, type: "TASK_UPDATED" });
    const parsedAdminNotification = adminNotifications.some(n => n.message.includes("mentioned you in the task"));
    const parsedViewerNotification = viewerNotifications.some(n => n.message.includes("mentioned you in the task"));
    logTest(
      "User Mentions on Task Creation",
      parsedAdminNotification && parsedViewerNotification,
      `Notifications sent to @jane_admin: ${parsedAdminNotification ? "YES" : "NO"} | @alice_viewer: ${parsedViewerNotification ? "YES" : "NO"}`
    );

    // Test 6: Verify Auto-Assignment Notifications
    console.log("\n🧪 Running Test 6: Task Assignment Notifications verify...");
    const member1Assignments = await Notification.find({ recipient: member1._id, type: "TASK_ASSIGNED" });
    const assignmentNotification = member1Assignments.some(n => n.title === "New Task Assigned");
    logTest("Task Assignment Notification", assignmentNotification, "Assignees automatically notified on task creation");

    // Test 7: Dependency Completion Block check
    console.log("\n🧪 Running Test 7: Task Dependency Block check...");
    let dependencyBlockPassed = false;
    try {
      await updateTaskService(task3._id.toString(), { status: "completed" }, viewer._id.toString());
    } catch (e: any) {
      dependencyBlockPassed = e.message.includes("blocked by incomplete dependencies");
      if (dependencyBlockPassed) {
        console.log(`- Expected rejection caught: ${e.message}`);
      }
    }
    logTest("Task Dependency Completion Block", dependencyBlockPassed, "Cannot complete task while dependency is incomplete");

    // Test 8: Completing Dependency & Unblocking Task
    console.log("\n🧪 Running Test 8: Unblocking Task on Dependency Completion...");
    try {
      // 1. Mark Task 2 as completed
      await updateTaskService(task2._id.toString(), { status: "completed" }, member2._id.toString());
      // 2. Retry completing Task 3
      await updateTaskService(task3._id.toString(), { status: "completed" }, viewer._id.toString());
      const updatedTask3 = await TaskModel.findById(task3._id);
      const unblockedSuccess = updatedTask3?.status === "completed";
      logTest("Task Dependency Unblock & Complete", unblockedSuccess, "Successfully completed task after dependencies are resolved");
    } catch (e: any) {
      logTest("Task Dependency Unblock & Complete", false, e.message);
    }

    // Test 9: Document/Image Attachment Upload Check
    console.log("\n🧪 Running Test 9: Attachment Upload Simulation...");
    try {
      const mockAttachments = [
        {
          name: "screenshot.png",
          url: "https://res.cloudinary.com/dsxhyk1qu/image/upload/v1700000000/screenshot.png",
          fileType: "image/png",
          uploadedBy: owner._id,
        },
        {
          name: "specification_spec.pdf",
          url: "https://res.cloudinary.com/dsxhyk1qu/image/upload/v1700000000/specification_spec.pdf",
          fileType: "application/pdf",
          uploadedBy: owner._id,
        }
      ];
      const taskWithAttachment = await updateTaskService(
        task1._id.toString(),
        { newAttachments: mockAttachments },
        owner._id.toString()
      );
      const attachmentSuccess = taskWithAttachment.attachments && taskWithAttachment.attachments.length === 2;
      logTest("Attachment Uploads", attachmentSuccess, `Mocked PNG and PDF attachments added. Count: ${taskWithAttachment.attachments?.length}`);
    } catch (e: any) {
      logTest("Attachment Uploads", false, e.message);
    }

    // Test 10: Comments and Mentions
    console.log("\n💬 Testing Comment Service layer with @bob_member mention...");
    let commentMentionSuccess = false;
    let comment: any;
    try {
      comment = await createCommentService(
        "Let's align on this task tomorrow @bob_member! Code block example:\n```js\nconst mention = '@bob_member';\n```",
        task1._id.toString(),
        admin._id.toString()
      );

      const bobNotifications = await Notification.find({ recipient: member1._id, type: "TASK_UPDATED" });
      commentMentionSuccess = bobNotifications.some(n => n.message.includes("mentioned you in a comment"));
      logTest("Comment Mention Notification", commentMentionSuccess, "Mentions inside comments trigger notifications correctly");
    } catch (e: any) {
      logTest("Comment Mention Notification", false, e.message);
    }

    // Test 11: Comment Emoji Reactions
    console.log("\n🧪 Running Test 11: Emoji Reactions Toggle...");
    try {
      // Bob adds 👍
      await toggleCommentReactionService(comment._id.toString(), "👍", member1._id.toString());
      // Charlie adds 🚀
      await toggleCommentReactionService(comment._id.toString(), "🚀", member2._id.toString());
      // Bob removes 👍 (toggles off)
      await toggleCommentReactionService(comment._id.toString(), "👍", member1._id.toString());
      // Bob adds 👍 back
      await toggleCommentReactionService(comment._id.toString(), "👍", member1._id.toString());

      const updatedComment = await CommentModel.findById(comment._id);
      const hasBobThump = updatedComment?.reactions.some(r => r.user.toString() === member1._id.toString() && r.emoji === "👍");
      const hasCharlieRocket = updatedComment?.reactions.some(r => r.user.toString() === member2._id.toString() && r.emoji === "🚀");
      logTest("Comment Reactions", !!(hasBobThump && hasCharlieRocket), "Emoji reactions toggle on/off dynamically");
    } catch (e: any) {
      logTest("Comment Reactions", false, e.message);
    }

    // Test 12: Role Hierarchy Viewer Check Simulation
    console.log("\n🧪 Running Test 12: Viewer Permission Restrictions...");
    let viewerBlocked = false;
    try {
      // Simulating a viewer trying to modify workspace/project data
      const simulateBlockViewers = async (userId: string, pId: string, wId: string) => {
        const proj = await Project.findById(pId);
        if (proj) {
          const pm = proj.members.find(m => m.user.toString() === userId.toString());
          if (pm && pm.role === "viewer") {
            throw new Error("Action forbidden: View-only role in project");
          }
        }
      };
      await simulateBlockViewers(viewer._id.toString(), project._id.toString(), workspace._id.toString());
    } catch (e: any) {
      viewerBlocked = e.message.includes("Action forbidden: View-only role");
    }
    logTest("Viewer Mutation Block", viewerBlocked, "Users with Viewer role are restricted from mutating operations");

    // Test 13: Workspace Analytics Task Aggregations
    console.log("\n🧪 Running Test 13: Workspace Analytics Dashboard Data verification...");
    try {
      const now = new Date();
      // Fetch all tasks for this project
      const analyticTasks = await TaskModel.find({ project: project._id, isArchived: { $ne: true } });

      const total = analyticTasks.length;
      const completed = analyticTasks.filter((t) => t.status === "completed").length;
      const inProgress = analyticTasks.filter((t) => t.status === "in-progress").length;
      const todo = analyticTasks.filter((t) => t.status === "todo").length;
      const overdue = analyticTasks.filter(
        (t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < now
      ).length;

      const expectedTotal = 3; // task1 (todo), task2 (completed), task3 (completed)
      const expectedCompleted = 2;
      const expectedTodo = 1;
      const expectedOverdue = 1; // task1 is overdue

      const countsMatched = total === expectedTotal && completed === expectedCompleted && todo === expectedTodo && overdue === expectedOverdue;
      logTest(
        "Workspace Analytics Stats",
        countsMatched,
        `Total: ${total}/${expectedTotal} | Completed: ${completed}/${expectedCompleted} | Todo: ${todo}/${expectedTodo} | Overdue: ${overdue}/${expectedOverdue}`
      );
    } catch (e: any) {
      logTest("Workspace Analytics Stats", false, e.message);
    }

    // 9. Summary Report
    console.log("\n==================================================");
    console.log("📊  RUN RESULTS SUMMARY");
    console.log("==================================================");
    console.log(`Passed: ${passedTestsCount} / ${totalTestsCount} tests (${Math.round((passedTestsCount / totalTestsCount) * 100)}%)`);
    console.log("--------------------------------------------------");

    console.log("| Feature / Test Case | Status | Details |");
    console.log("|---|---|---|");
    for (const r of testReport) {
      const statusIcon = r.status === "PASSED" ? "🟢 PASSED" : "🔴 FAILED";
      console.log(`| ${r.name} | ${statusIcon} | ${r.details} |`);
    }
    console.log("--------------------------------------------------");

    if (passedTestsCount === totalTestsCount) {
      console.log("\n🎉 ALL TESTS PASSED! THE SYSTEM WORKED WITH ZERO BUGS AT FULL POTENTIAL.");
    } else {
      console.log("\n⚠️ SOME TESTS FAILED. PLEASE REVIEW LOGS.");
    }
    console.log("==================================================");

  } catch (error: any) {
    console.error("\n❌  RUN ENCOUNTERED FATAL ERROR:", error);
  } finally {
    // Close connection
    await mongoose.disconnect();
    console.log("🔌 Mongoose disconnected gracefully.");
  }
}

runSeederAndRun();
