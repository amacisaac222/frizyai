import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Menu, X, Github, ArrowRight, User, LogOut } from 'lucide-react'
import { Button } from '@/components/ui'
import { LightningLogo } from '@/components/ui/LightningLogo'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()

  // Navigation items based on authentication status
  const navigation = user ? [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
  ] : [
    { name: 'Features', href: '/features' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
  ]

  const handleSignOut = async () => {
    await signOut()
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: -5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <LightningLogo size="md" />
            </motion.div>
            <span className="font-bold text-xl bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 bg-clip-text text-transparent group-hover:from-cyan-500 group-hover:via-pink-500 group-hover:to-yellow-500 transition-all duration-500">
              Frizy
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500'
                    : 'text-gray-700 hover:text-pink-500'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="https://github.com/frizy" target="_blank">
              <Button variant="ghost" size="sm">
                <Github className="w-4 h-4" />
              </Button>
            </Link>
            
            {user ? (
              // Authenticated user actions
              <>
                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4" />
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </>
            ) : (
              // Guest user actions
              <>
                <Link to="/auth/login">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth/signup">
                  <Button size="sm" className="gap-1 bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 hover:from-cyan-500 hover:via-pink-500 hover:to-yellow-500 text-white border-0 animate-retro-gradient bg-300">
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden py-4 border-t border-gray-200"
          >
            <div className="flex flex-col gap-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                    isActive(item.href)
                      ? 'bg-gradient-to-r from-pink-50 to-cyan-50 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-cyan-500'
                      : 'text-gray-700 hover:bg-gradient-to-r hover:from-pink-50 hover:to-yellow-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="flex flex-col gap-2 px-3 pt-4 border-t border-gray-200">
                {user ? (
                  // Authenticated mobile menu
                  <>
                    <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full gap-1">
                        <User className="w-4 h-4" />
                        Profile
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full gap-1"
                      onClick={() => {
                        setIsMobileMenuOpen(false)
                        handleSignOut()
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  // Guest mobile menu
                  <>
                    <Link to="/auth/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="outline" size="sm" className="w-full">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth/signup" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button size="sm" className="w-full gap-1 bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 hover:from-cyan-500 hover:via-pink-500 hover:to-yellow-500 text-white border-0 animate-retro-gradient bg-300">
                        Get Started
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </nav>
    </header>
  )
}