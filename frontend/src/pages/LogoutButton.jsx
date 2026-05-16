import React from 'react';
import { useNavigate } from 'react-router-dom';

const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // 1. Clear the authentication data
    localStorage.removeItem("token");
    localStorage.removeItem("username");

    // 2. Redirect to the signin page
    navigate("/signin");
  };

  return (
    <button 
      onClick={handleLogout}
      className="nav-item" // Reusing your nav-item style for consistency
      style={{
        marginTop: 'auto', // Pushes it to the bottom of the sidebar
        border: '1px solid #ef4444', // Red border for "danger" action
        color: '#ef4444',
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer'
      }}
    >
      <span style={{ marginRight: '10px' }}>🚪</span> Logout
    </button>
  );
};

export default LogoutButton;