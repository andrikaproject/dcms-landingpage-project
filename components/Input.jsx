export const Input = ({ label, className = "", ...props }) => {
    return (
        <div className="flex flex-col gap-2 w-full">
            {label && (
                <label className="text-xs font-semibold text-gray-400 tracking-wider uppercase ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                {/* Glow effect on focus/hover (via group-focus-within or hover) */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-0 group-hover:opacity-30 group-focus-within:opacity-50 blur transition duration-500"></div>

                <input
                    className={`relative w-full bg-[#13141b] border border-gray-800 text-white text-sm placeholder-gray-500 rounded-xl px-4 py-3.5 focus:outline-none focus:border-transparent focus:ring-0 transition-all ${className}`}
                    {...props}
                />
            </div>
        </div>
    );
};