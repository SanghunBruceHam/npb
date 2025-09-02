'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Trophy, Calendar, Users } from 'lucide-react'

const navItems = [
  { href: '/', label: '대시보드', icon: Home },
  { href: '/standings', label: '순위표', icon: Trophy },
  { href: '/games', label: '경기 결과', icon: Calendar },
  { href: '/teams', label: '팀', icon: Users },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-npb-blue text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold">⚾</span>
            <span className="text-xl font-semibold">NPB Dashboard</span>
          </Link>
          
          <div className="flex space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-white/20'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <Icon size={20} />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}