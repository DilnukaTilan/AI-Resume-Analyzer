import type { User } from "@supabase/supabase-js";
import { useState } from "react";
import { Link } from "react-router";

type NavbarProps = {
  user: User;
  onSignOut: () => void;
};

const getDisplayName = (user: User) =>
  user.user_metadata?.full_name ||
  user.user_metadata?.name ||
  user.email ||
  "Signed in";

const getInitial = (user: User) => getDisplayName(user).charAt(0).toUpperCase();

const Navbar = ({ user, onSignOut }: NavbarProps) => {
  const avatarUrl = user.user_metadata?.avatar_url;
  const displayName = getDisplayName(user);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleSignOut = () => {
    setIsProfileMenuOpen(false);
    onSignOut();
  };

  return (
    <div className="nav-shell">
      <nav className="navbar">
        <Link to="/" className="navbar-brand">
          <p className="text-2xl font-bold text-gradient">RESUMIND</p>
        </Link>
        <div className="nav-actions">
          <Link to="/upload" className="primary-button w-fit">
            Upload Resume
          </Link>
        </div>
      </nav>
      <div
        className="profile-menu-wrap"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsProfileMenuOpen(false);
          }
        }}
      >
        <button
          type="button"
          className="profile-icon"
          aria-haspopup="menu"
          aria-expanded={isProfileMenuOpen}
          aria-label={`Open account menu for ${displayName}`}
          title={displayName}
          onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
        >
          <span className="profile-icon-inner">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="profile-avatar" />
            ) : (
              <span className="profile-avatar profile-initial">
                {getInitial(user)}
              </span>
            )}
          </span>
        </button>
        {isProfileMenuOpen && (
          <div className="profile-menu" role="menu">
            <p className="profile-menu-name text-center">{displayName}</p>
            <button
              type="button"
              className="sign-out-button profile-sign-out"
              role="menuitem"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Navbar;
