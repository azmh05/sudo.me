import { TasksManager } from "@/components/planner/TasksManager";
import { getTaskList } from "@/lib/planner";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  return <TasksManager tasks={await getTaskList()} />;
}
