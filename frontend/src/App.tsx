import { Routes, Route, Navigate } from "react-router-dom";
import { AgentList } from "./pages/AgentList";
import { AgentEditor } from "./pages/AgentEditor";
import { RunView } from "./pages/RunView";
import { SharedRun } from "./pages/SharedRun";
import { TemplateManage } from "./pages/TemplateManage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AgentList />} />
      <Route path="/templates" element={<TemplateManage />} />
      <Route path="/agents/new" element={<AgentEditor />} />
      <Route path="/agents/:agentId" element={<AgentEditor />} />
      <Route path="/runs/:runId" element={<RunView />} />
      <Route path="/r/:token" element={<SharedRun />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
