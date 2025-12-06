import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function NavBar() {
    const { isAuthenticated, logout, user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = (e) => {
        e.preventDefault();
        logout();
        navigate('/login');
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
                    <Link className='hover:opacity-60' to="/clients">Clients</Link>
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
                        {user && (
                            <span className='text-sm text-gray-600'>
                                {user.username}
                            </span>
                        )}
                        <button 
                            onClick={handleLogout} 
                            className="bg-blue-500 cursor-pointer font-medium rounded-sm text-white px-4 py-2 hover:bg-blue-700"
                        >
                            Logout
                        </button>
                    </>
                )}
            </div>
        </nav>
    );
}
