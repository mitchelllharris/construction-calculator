import React, { useState, useRef, useEffect } from 'react';
import { MdMoreVert, MdPersonRemove, MdBlock, MdPersonAdd, MdClose } from 'react-icons/md';

export default function ConnectionActionsMenu({
  connectionStatus,
  followStatus,
  isFollowing,
  connectionId,
  userId,
  onAction,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = async (action) => {
    setIsOpen(false);
    if (onAction) {
      await onAction(action, connectionId, userId);
    }
  };

  const isConnected = connectionStatus === 'accepted';
  const isBlocked = connectionStatus === 'blocked';
  const isFollowingUser = (followStatus === 'accepted') || (followStatus === undefined && isFollowing);
  const followRequestPending = followStatus === 'pending';

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        title="Connection options"
      >
        <MdMoreVert size={20} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            {/* Follow/Unfollow options (separate from connections) */}
            {!isBlocked && (
              <>
                {isFollowingUser ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction('unfollow');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <MdPersonRemove size={18} />
                    Unfollow
                  </button>
                ) : followRequestPending ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction('unfollow'); // Cancel follow request
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <MdPersonRemove size={18} />
                    Cancel Follow Request
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAction('follow');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                  >
                    <MdPersonAdd size={18} />
                    Follow
                  </button>
                )}
                {isConnected && (
                  <>
                    <div className="border-t border-gray-200 my-1"></div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Are you sure you want to remove this connection?')) {
                          handleAction('remove');
                        }
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <MdPersonRemove size={18} />
                      Remove Connection
                    </button>
                  </>
                )}
                <div className="border-t border-gray-200 my-1"></div>
              </>
            )}
            {!isBlocked ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const message = isConnected 
                    ? 'Are you sure you want to block this user? This will remove your connection and prevent them from contacting you.'
                    : 'Are you sure you want to block this user? This will prevent them from contacting you.';
                  if (window.confirm(message)) {
                    handleAction('block');
                  }
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <MdBlock size={18} />
                Block User
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('unblock');
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
              >
                <MdClose size={18} />
                Unblock User
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
