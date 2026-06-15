import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardPage } from '@/pages/DashboardPage';
import { RulesPage } from '@/pages/RulesPage';
import { TasksPage } from '@/pages/TasksPage';
import { ReviewPage } from '@/pages/ReviewPage';
import { ExportPage } from '@/pages/ExportPage';

export default function App() {
  return (
    <Router>
      <div className="flex h-screen bg-slate-100">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/rules" element={<RulesPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/review" element={<ReviewPage />} />
              <Route path="/export" element={<ExportPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}
