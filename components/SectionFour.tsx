import React from 'react';

export function SectionFour() {
    return (
        <section className="w-full max-w-[1600px] mx-auto py-12 pb-0">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-12 gap-6">
                {/* Left Side - Logo & Label */}
                <div className="flex items-center gap-4 flex-shrink-0 justify-start">
                    {/* Logo Icon */}

                    <img
                        src="/images/logo-dcms.svg"
                        alt="Logo DCMS"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                    />

                    {/* Label */}
                    <span
                        className="text-sm md:text-base font-bold text-white uppercase tracking-wider whitespace-nowrap"
                        style={{ fontFamily: 'Nebulica, serif' }}
                    >
                        GALERI FLEXING KAMI
                    </span>
                </div>

                {/* Center - Main Title */}
                <div className="md:flex-grow text-left md:text-center w-full md:w-auto">
                    <h2
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-white"
                        style={{ fontFamily: 'Nebulica, serif' }}
                    >
                        Dari Member Untuk Member
                    </h2>
                </div>

                {/* Right Side - Description */}
                <div className="w-full md:max-w-xs md:flex-shrink-0">
                    <p className="text-gray-400 text-xs md:text-sm leading-relaxed text-left">
                        Semua Galeri PnL ini di dapatkan dari member yang mau berusaha sendiri dan menerapkan hasil ilmu yang di dapat dari group DCMS
                    </p>
                </div>
            </div>

            {/* Gallery Grid - Placeholder untuk nanti diedit */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Placeholder Card 1 */}
                <div
                    className="rounded-3xl p-6 flex flex-col justify-center items-center min-h-[300px] group hover:scale-[1.02] transition-transform duration-300"
                    style={{
                        background: 'linear-gradient(103deg, rgba(54, 54, 54, 0.00) -10.05%, rgba(54, 54, 54, 0.36) 111.52%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(54, 54, 54, 0.43)'
                    }}
                >
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Gallery Item 1</p>
                        <p className="text-gray-600 text-xs mt-2">Akan diedit nanti</p>
                    </div>
                </div>

                {/* Placeholder Card 2 */}
                <div
                    className="rounded-3xl p-6 flex flex-col justify-center items-center min-h-[300px] group hover:scale-[1.02] transition-transform duration-300"
                    style={{
                        background: 'linear-gradient(103deg, rgba(54, 54, 54, 0.00) -10.05%, rgba(54, 54, 54, 0.36) 111.52%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(54, 54, 54, 0.43)'
                    }}
                >
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Gallery Item 2</p>
                        <p className="text-gray-600 text-xs mt-2">Akan diedit nanti</p>
                    </div>
                </div>

                {/* Placeholder Card 3 */}
                <div
                    className="rounded-3xl p-6 flex flex-col justify-center items-center min-h-[300px] group hover:scale-[1.02] transition-transform duration-300"
                    style={{
                        background: 'linear-gradient(103deg, rgba(54, 54, 54, 0.00) -10.05%, rgba(54, 54, 54, 0.36) 111.52%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(54, 54, 54, 0.43)'
                    }}
                >
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Gallery Item 3</p>
                        <p className="text-gray-600 text-xs mt-2">Akan diedit nanti</p>
                    </div>
                </div>

                {/* Placeholder Card 4 */}
                <div
                    className="rounded-3xl p-6 flex flex-col justify-center items-center min-h-[300px] group hover:scale-[1.02] transition-transform duration-300"
                    style={{
                        background: 'linear-gradient(103deg, rgba(54, 54, 54, 0.00) -10.05%, rgba(54, 54, 54, 0.36) 111.52%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(54, 54, 54, 0.43)'
                    }}
                >
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Gallery Item 4</p>
                        <p className="text-gray-600 text-xs mt-2">Akan diedit nanti</p>
                    </div>
                </div>

                {/* Placeholder Card 5 */}
                <div
                    className="rounded-3xl p-6 flex flex-col justify-center items-center min-h-[300px] group hover:scale-[1.02] transition-transform duration-300"
                    style={{
                        background: 'linear-gradient(103deg, rgba(54, 54, 54, 0.00) -10.05%, rgba(54, 54, 54, 0.36) 111.52%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(54, 54, 54, 0.43)'
                    }}
                >
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Gallery Item 5</p>
                        <p className="text-gray-600 text-xs mt-2">Akan diedit nanti</p>
                    </div>
                </div>

                {/* Placeholder Card 6 */}
                <div
                    className="rounded-3xl p-6 flex flex-col justify-center items-center min-h-[300px] group hover:scale-[1.02] transition-transform duration-300"
                    style={{
                        background: 'linear-gradient(103deg, rgba(54, 54, 54, 0.00) -10.05%, rgba(54, 54, 54, 0.36) 111.52%)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(54, 54, 54, 0.43)'
                    }}
                >
                    <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <p className="text-gray-500 text-sm">Gallery Item 6</p>
                        <p className="text-gray-600 text-xs mt-2">Akan diedit nanti</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
