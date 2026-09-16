/**
 * Owner Dashboard page – Phase 14 polish
 */

import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider.js';
import { useOwnerRooms } from '../features/owner/hooks/useOwnerRooms.js';
import type { OwnerRoomQuery, Room } from '../features/owner/types.js';
import DashboardSummary from '../features/owner/components/DashboardSummary.js';
import OwnerRoomList from '../features/owner/components/OwnerRoomList.js';
import RoomFilters from '../features/owner/components/RoomFilters.js';
import RoomForm from '../features/owner/components/RoomForm.js';
import MembershipCertificateModal from '../features/owner/components/MembershipCertificateModal.js';
import Navbar from '../components/Navbar.js';
import Footer from '../components/Footer.js';

export default function OwnerHome() {
  const { user } = useAuth();

  const [queryParams, setQueryParams] = useState<OwnerRoomQuery>({
    page: 1,
    limit: 10,
  });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  
  const [showCertificate, setShowCertificate] = useState(false);

  const { data, isLoading, error } = useOwnerRooms(queryParams);

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRoom(null);
  };

  const handlePageChange = (newPage: number) => {
    setQueryParams((prev) => ({ ...prev, page: newPage }));
  };

  return (
    <div className="owner-dashboard">
      <Navbar />

      <main className="dashboard-main" id="main-content" tabIndex={-1}>
        {/* Welcome banner */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.15rem' }}>
              Welcome back, {user?.name} 👋
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Manage your room listings and track availability.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {user?.membershipDate && (
              <button
                className="btn btn-outline"
                onClick={() => setShowCertificate(true)}
                aria-label="View Membership Certificate"
              >
                📜 View Certificate
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => setIsFormOpen(true)}
              aria-label="Add new room listing"
            >
              + Add Room
            </button>
          </div>
        </div>

        {/* Stats */}
        <section className="dashboard-section" aria-label="Dashboard overview">
          <h2 className="sr-only">Dashboard Overview</h2>
          <DashboardSummary />
        </section>

        {/* Room list */}
        <section className="dashboard-section" aria-label="My room listings">
          <div className="section-header">
            <h2>My Rooms</h2>
          </div>

          <RoomFilters filters={queryParams} onFilterChange={setQueryParams} />

          <OwnerRoomList
            rooms={data?.rooms || []}
            isLoading={isLoading}
            error={error}
            onEdit={handleEdit}
            page={queryParams.page || 1}
            totalPages={data?.pagination?.pages || 1}
            onPageChange={handlePageChange}
          />
        </section>
      </main>

      <Footer />

      {isFormOpen && (
        <RoomForm room={editingRoom} onClose={handleCloseForm} />
      )}
      
      {showCertificate && (
        <MembershipCertificateModal
          onClose={() => setShowCertificate(false)}
        />
      )}
    </div>
  );
}
