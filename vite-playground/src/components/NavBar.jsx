import { Link, useNavigate } from 'react-router-dom';
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useProfileSwitcher } from '../contexts/ProfileSwitcherContext';
import { MdPerson, MdSettings, MdLogout, MdArrowDropDown, MdBusiness } from 'react-icons/md';
import ProfileSwitcher from './ProfileSwitcher';

export default function NavBar() {
    const { isAuthenticated, logout, user } = useAuth();
    const { isBusinessProfile } = useProfileSwitcher();
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

    const handleLogout = (e) => {
        e.preventDefault();
        logout();
        navigate('/login');
        setShowDropdown(false);
    };

    const handleProfileClick = () => {
        if (user?.username) {
            navigate(`/profile/${user.username}`);
        }
        setShowDropdown(false);
    };

    const handleSettingsClick = () => {
        navigate('/settings');
        setShowDropdown(false);
    };

    return (
        <nav className="navbar border-b border-gray-200 content-center flex gap-5 items-center justify-between px-8 py-4 shadow-xs/8">
            <Link className="content-start hover:opacity-60" to="/">Logo</Link>
            {!isAuthenticated && (  
                <div className="flex content-center gap-5">
                    <Link className='hover:opacity-60' to="/">Home</Link>
                    <Link className='hover:opacity-60' to="/pricing">Pricing</Link>
                    <Link className='hover:opacity-60' to="/about">About</Link>
                    <Link className='hover:opacity-60' to="/contact">Contact</Link>
                </div>
            )}
            {isAuthenticated && (
                <div className="flex content-center gap-5">
                    <Link className='hover:opacity-60' to="/dashboard">Dashboard</Link>
                    <Link className='hover:opacity-60' to="/find-people">Find People</Link>
                    <Link className='hover:opacity-60' to="/contacts">Contacts</Link>
                    <Link className='hover:opacity-60' to="/clients">Clients</Link>
                    {!isBusinessProfile && (
                        <Link className='hover:opacity-60 flex items-center gap-1' to="/create-business">
                            <MdBusiness size={18} />
                            Create Business
                        </Link>
                    )}
                    <Link className='hover:opacity-60' to="/settings">Settings</Link>
                </div>
            )}
            <div className="content-end flex gap-5 items-center">
                {!isAuthenticated && (
                    <>
                        <Link className='content-center cursor-pointer hover:opacity-60' to="/login">Log In</Link>
                        <Link className='bg-blue-500 cursor-pointer font-medium rounded-sm text-white px-4 py-2 hover:bg-blue-700' to="/register">Sign Up</Link>
                    </>
                )}
                {isAuthenticated && (
                    <>
                        <ProfileSwitcher />
                        {user && (
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 px-3 py-2 rounded hover:bg-gray-100 transition-colors"
                                >
                                    <MdSettings size={18} />
                                    <MdArrowDropDown size={20} className={showDropdown ? 'transform rotate-180' : ''} />
                                </button>
                                
                                {showDropdown && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                                        <div className="py-1">
                                            <button
                                                onClick={handleSettingsClick}
                                                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                            >
                                                <MdSettings size={18} />
                                                Settings
                                            </button>
                                            <div className="border-t border-gray-200 my-1"></div>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <MdLogout size={18} />
                                                Logout
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </nav>
    );
}
