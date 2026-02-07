import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
    return (
        <footer
            className="w-full border-t border-[#333] pt-16 pb-8"
            style={{ background: 'linear-gradient(180deg, #23252A 0%, #111315 100%)' }}
        >
            <div className="max-w-[1600px] mx-auto px-6 md:px-10">
                {/* Top Section: Logo and Description */}
                <div className="flex flex-col gap-6 mb-12">
                    <div className="flex items-center gap-3">
                        <Image
                            src="/images/logo-dcms.svg"
                            alt="DCMS Logo"
                            width={32}
                            height={32}
                            className="object-contain"
                        />
                        <span className="text-2xl font-bold text-white tracking-tight" style={{ fontFamily: 'Nebulica, serif' }}>
                            DCMS
                        </span>
                    </div>

                    <div className="max-w-xl">
                        <p className="text-gray-400 text-lg leading-relaxed" style={{ fontFamily: 'Chakra Petch, serif' }}>
                            Tempat para trader yang sadar risiko, ego dan realita market.<br />
                            Fokus pada proses, disiplin, dan bertahan lama
                        </p>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-white/10 mb-8" />

                {/* Bottom Section: Copyright and Socials */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-gray-500 text-sm">
                        Copyright 2026© DCMS - Diskusi Crypto Micin Saham, All Rights Reserved.
                    </div>

                    {/* Social Media Icons */}
                    <div className="flex items-center gap-5">
                        <Link href="https://www.tiktok.com/@dcmsgroup" className="text-gray-400 hover:text-white transition-colors">
                            <Image
                                src="/images/tiktok.svg"
                                alt="DCMS Logo"
                                width={32}
                                height={32}
                                className="object-contain"
                            />
                        </Link>
                        <Link href="https://www.threads.com/@dcmsgroup" className="text-gray-400 hover:text-white transition-colors">
                            <Image
                                src="/images/threads.svg"
                                alt="DCMS Logo"
                                width={32}
                                height={32}
                                className="object-contain"
                            />
                        </Link>
                        <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                            <Image
                                src="/images/discord.svg"
                                alt="DCMS Logo"
                                width={32}
                                height={32}
                                className="object-contain"
                            />
                        </Link>
                        <Link href="https://www.instagram.com/dcmsgroup" className="text-gray-400 hover:text-white transition-colors">
                            <Image
                                src="/images/instagram.svg"
                                alt="DCMS Logo"
                                width={32}
                                height={32}
                                className="object-contain"
                            />
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
