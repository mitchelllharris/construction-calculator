import React from 'react';

export default function AuthLayout({ children }) {
    return (
        <div className='flex w-screen h-screen'>
            {children}
            <div className='basis-5/8 bg-linear-45 from-cyan-500 to-blue-500 grow relative overflow-hidden'>
                <div className='absolute bg-blue-500 h-48 w-48 rounded-xl top-40 -left-10'></div>
            </div>
        </div>
    );
}