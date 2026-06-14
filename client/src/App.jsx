import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ProtectedRoute, PublicRoute } from './components/AuthGuard.jsx';
import Navbar from './components/Navbar.jsx';

// Pages imports
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import GroupDetail from './pages/GroupDetail.jsx';
import ImportCSV from './pages/ImportCSV.jsx';
import Profile from './pages/Profile.jsx';
import Home from './pages/Home.jsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-[#F2F2F2] text-gray-800">
          <Navbar />
          
          <main className="flex-grow">
            <Routes>
              {/* Public routes */}
              <Route 
                path="/login" 
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                } 
              />
              <Route 
                path="/register" 
                element={
                  <PublicRoute>
                    <Register />
                  </PublicRoute>
                } 
              />

              {/* Protected routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/groups/:id" 
                element={
                  <ProtectedRoute>
                    <GroupDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/import" 
                element={
                  <ProtectedRoute>
                    <ImportCSV />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />

              {/* Wildcard redirects */}
              <Route path="/" element={<Home />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
