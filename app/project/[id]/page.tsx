import { WorkspaceClient } from "@/components/workspace/workspace-client";

export default async function ProjectPage(props: PageProps<"/project/[id]">) {
  const { id } = await props.params;
  // 新建项目与刷新恢复均由客户端依据本地项目状态决定是否自动续跑。
  return <WorkspaceClient projectId={id} />;
}
