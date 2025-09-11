import { Link } from 'react-router-dom'
import { Github, Twitter, Linkedin, Mail } from 'lucide-react'
import { LightningLogo } from '@/components/ui/LightningLogo'

export function Footer() {
  const footerLinks = {
    Product: [
      { name: 'Features', href: '/features' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Changelog', href: '/changelog' },
    ],
    Company: [
      { name: 'About', href: '/about' },
      { name: 'Blog', href: '/blog' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' },
    ],
    Resources: [
      { name: 'Documentation', href: '/docs' },
      { name: 'API', href: '/api' },
      { name: 'Community', href: '/community' },
      { name: 'Support', href: '/support' },
    ],
    Legal: [
      { name: 'Privacy', href: '/privacy' },
      { name: 'Terms', href: '/terms' },
      { name: 'Security', href: '/security' },
      { name: 'Cookies', href: '/cookies' },
    ],
  }

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4 group">
              <LightningLogo size="md" variant="gradient" />
              <span className="font-bold text-xl bg-gradient-to-r from-pink-400 via-yellow-400 to-cyan-400 bg-clip-text text-transparent">
                Frizy AI
              </span>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              Turn any codebase into an AI-native workspace in minutes.
            </p>
            <div className="flex gap-3">
              <Link
                to="https://github.com/frizy"
                target="_blank"
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Github className="w-5 h-5" />
              </Link>
              <Link
                to="https://twitter.com/frizy"
                target="_blank"
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </Link>
              <Link
                to="https://linkedin.com/company/frizy"
                target="_blank"
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </Link>
              <Link
                to="mailto:hello@frizy.io"
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Mail className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-white mb-4">{category}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.href}
                      className="text-sm hover:text-white transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="py-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">
              © 2025 Frizy AI. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link to="/cookies" className="hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}