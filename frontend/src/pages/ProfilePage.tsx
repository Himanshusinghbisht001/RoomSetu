import React from 'react';
import Navbar from '../components/Navbar.js';
import Footer from '../components/Footer.js';
import { ProfileSettings } from '../features/profile/components/ProfileSettings.js';
import { SecuritySettings } from '../features/profile/components/SecuritySettings.js';

export const ProfilePage: React.FC = () => {
  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="page-container" id="main-content" tabIndex={-1}>
        <div className="page-header" style={{ marginBottom: '2rem' }}>
          <h1>My Profile</h1>
          <p>Manage your account settings and security.</p>
        </div>

        <ProfileSettings />
        <SecuritySettings />
        
      </main>

      <Footer />
    </div>
  );
};
