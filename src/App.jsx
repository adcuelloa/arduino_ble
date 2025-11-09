import { BrowserRouter, Route, Routes, Navigate } from 'react-router';
import ControlPage from './pages/ControlPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ControlPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
