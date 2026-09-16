import { Routes, Route } from 'react-router-dom';
import RequireAuth from '../components/RequireAuth.js';
import RequireRole from '../components/RequireRole.js';

import Home from '../pages/Home.js';
import Login from '../pages/Login.js';
import Register from '../pages/Register.js';
import Forbidden from '../pages/Forbidden.js';
import NotFound from '../pages/NotFound.js';
import OwnerHome from '../pages/OwnerHome.js';
import { SeekerHome } from '../pages/SeekerHome.js';
import { RoomDetails } from '../pages/RoomDetails.js';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/rooms/:id" element={<RoomDetails />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/403" element={<Forbidden />} />
      <Route path="*" element={<NotFound />} />

      {/* Owner Protected Routes */}
      <Route
        path="/owner"
        element={
          <RequireAuth>
            <RequireRole role="owner">
              <OwnerHome />
            </RequireRole>
          </RequireAuth>
        }
      />

      {/* Seeker Protected Routes */}
      <Route
        path="/seeker"
        element={
          <RequireAuth>
            <RequireRole role="seeker">
              <SeekerHome />
            </RequireRole>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
