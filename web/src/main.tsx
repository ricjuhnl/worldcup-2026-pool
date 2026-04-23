import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import { ProtectedRoute } from './components';
import { UserProvider, MatchProvider, ToastProvider } from './context';
import {
  About,
  EditProfile,
  Home,
  Leaderboard,
  Login,
  Rules,
  UserProfile,
} from './routes';

// Hide splash screen - exposed globally so components can call it
window.hideSplash = () => {
  const splash = document.getElementById('splash');
  if (splash) {
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 300);
  }
};

// Extend Window interface
declare global {
  interface Window {
    hideSplash: () => void;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <ToastProvider>
        <MatchProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/edit-profile"
                element={
                  <ProtectedRoute>
                    <EditProfile />
                  </ProtectedRoute>
                }
              />
              <Route path="/:userName" element={<UserProfile />} />
            </Routes>
          </BrowserRouter>
        </MatchProvider>
      </ToastProvider>
    </UserProvider>
  </StrictMode>
);
