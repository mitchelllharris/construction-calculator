import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';
import { useAuth } from '../contexts/AuthContext';
import { MdPerson, MdBusiness, MdArrowDropDown, MdCheck, MdAdd, MdVisibility } from 'react-icons/md';

export default function ProfileSwitcher() {
  const { activeProfile, businesses, switchToUser, switchToBusiness, isUserProfile, isBusinessProfile } = useProfileSwitcher();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  if (!activeProfile || !user) {
    return null;
  }

  const handleSwitchToUser = () => {
    switchToUser();
    navigate(`/profile/${user.username}`);
    setShowDropdown(false);
  };

  const handleSwitchToBusiness = (business) => {
    switchToBusiness(business);
    const businessId = business.businessSlug || business._id;
    navigate(`/business/${businessId}`);
    setShowDropdown(false);
  };

  const getDisplayName = () => {
    if (isUserProfile) {
      return user.username || `${user.firstName} ${user.lastName}`;
    }
    return activeProfile.name;
  };

  const getAvatar = () => {
    if (isUserProfile) {
      return user.avatar;
    }
    return activeProfile.avatar;
  };

  const displayName = getDisplayName();
  const avatar = getAvatar();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        {avatar ? (
          <img
            src={avatar.startsWith('http') ? avatar : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${avatar}`}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
            {isUserProfile ? (
              <MdPerson size={18} />
            ) : (
              <MdBusiness size={18} />
            )}
          </div>
        )}
        <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
          {displayName}
        </span>
        <MdArrowDropDown 
          size={20} 
          className={`text-gray-500 transition-transform ${showDropdown ? 'transform rotate-180' : ''}`} 
        />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="py-2">
            {/* User Profile Option */}
            <button
              onClick={handleSwitchToUser}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                isUserProfile ? 'bg-blue-50' : ''
              }`}
            >
              <div className="shrink-0">
                {user.avatar ? (
                  <img
                    src={user.avatar.startsWith('http') ? user.avatar : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${user.avatar}`}
                    alt={user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    <MdPerson size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {user.username || `${user.firstName} ${user.lastName}`}
                </div>
                <div className="text-xs text-gray-500">Personal Account</div>
              </div>
              {isUserProfile && (
                <MdCheck className="text-blue-600 shrink-0" size={20} />
              )}
            </button>

            {/* Divider */}
            {businesses.length > 0 && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                  Businesses
                </div>
              </>
            )}

            {/* Business Options */}
            {businesses.map((business) => {
              const isActive = !isUserProfile && activeProfile.id === business._id;
              return (
                <button
                  key={business._id}
                  onClick={() => handleSwitchToBusiness(business)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors ${
                    isActive ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="shrink-0">
                    {business.avatar ? (
                      <img
                        src={business.avatar.startsWith('http') ? business.avatar : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}${business.avatar}`}
                        alt={business.businessName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                        <MdBusiness size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {business.businessName}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {business.trade || 'Business'}
                    </div>
                  </div>
                  {isActive && (
                    <MdCheck className="text-blue-600 shrink-0" size={20} />
                  )}
                </button>
              );
            })}

            {/* View Profile Link */}
            <div className="border-t border-gray-200 my-2"></div>
            <button
              onClick={() => {
                if (isUserProfile) {
                  navigate(`/profile/${user.username}`);
                } else if (isBusinessProfile) {
                  const business = businesses.find(b => b._id === activeProfile.id);
                  if (business) {
                    const businessId = business.businessSlug || business._id;
                    navigate(`/business/${businessId}`);
                  }
                }
                setShowDropdown(false);
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 text-gray-700 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <MdVisibility size={20} className="text-gray-600" />
              </div>
              <div className="font-medium">View Profile</div>
            </button>

            {/* Create Business Link - Only show for user profiles */}
            {isUserProfile && (
              <>
                <div className="border-t border-gray-200 my-2"></div>
                <button
                  onClick={() => {
                    navigate('/create-business');
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center gap-3 text-blue-600 transition-colors font-medium"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <MdAdd size={20} className="text-blue-600" />
                  </div>
                  <div className="font-medium">Create Business</div>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

