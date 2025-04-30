module.exports = {
  content: [
    "./public/*.html",
    "./src/*.js"
  ],
  safelist: [
    // 渐变背景
    "bg-gradient-to-br",
    "from-green-900/40", "to-green-800/20", "border-green-700/30",
    "from-gray-800/40", "to-gray-700/20", "border-gray-700/30",
    "from-red-900/40", "to-red-800/20", "border-red-700/30",

    // 背景颜色
    "bg-green-500/20", "bg-green-400",
    "bg-gray-500/20", "bg-gray-400",
    "bg-red-500/20", "bg-red-400",
    "bg-blue-900/30", "bg-gray-800", "bg-gray-900", "bg-primary",
    "bg-yellow-900/30", "bg-yellow-50",
    "bg-purple-600", "bg-purple-500",
    "bg-[#FF3B30]", "bg-[#1C1C1E]", "bg-[#121212]", "bg-[#2C2C2E]",

    // 文本颜色
    "text-green-400", "text-gray-300", "text-red-400", "text-gray-400", "text-gray-500",
    "text-yellow-400", "text-yellow-500", "text-yellow-700",
    "text-purple-500", "text-blue-500",
    "text-primary", "text-white", "text-[#FF3B30]", "text-[#8E8E93]", "text-[#FACC15]", "text-[#10B981]", "text-[#3B82F6]",

    // 边框
    "border-t", "border-b", "border-r", "border-l",
    "border-gray-700", "border-gray-800",
    "border-[#2C2C2E]",

    // 圆角
    "rounded", "rounded-lg", "rounded-xl", "rounded-full", "rounded-button",

    // 阴影
    "shadow-lg",

    // 其他
    "active:bg-gray-800", "transition-colors", "duration-150", "duration-300"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#1E293B',
        danger: '#FF3B30'
      },
      borderRadius: {
        'none': '0px',
        'sm': '4px',
        DEFAULT: '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
        'full': '9999px',
        'button': '8px'
      }
    }
  },
  plugins: [],
}