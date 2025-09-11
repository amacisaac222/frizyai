import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Check, 
  X, 
  ArrowRight, 
  Sparkles, 
  Users, 
  Building2, 
  Crown,
  Target,
  Zap,
  Shield,
  GitBranch,
  MessageSquare,
  Bot,
  BarChart3,
  Plug,
  Lock,
  HelpCircle
} from 'lucide-react'
import { Button, Card, CardContent, CardHeader, Badge } from '@/components/ui'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { cn } from '@/utils'

interface PricingTier {
  id: string
  name: string
  description: string
  price: string
  billing: string
  icon: React.ComponentType<any>
  color: string
  features: { text: string; included: boolean }[]
  cta: string
  popular?: boolean
}

const pricingTiers: PricingTier[] = [
  {
    id: 'free',
    name: 'Free Forever',
    description: 'Perfect for side projects and learning',
    price: '$0',
    billing: 'No credit card required',
    icon: Sparkles,
    color: 'purple',
    cta: 'Start Building',
    features: [
      { text: '1 Project', included: true },
      { text: 'Unlimited Claude sessions', included: true },
      { text: 'Basic context persistence', included: true },
      { text: 'Community support', included: true },
      { text: 'Public projects only', included: true },
      { text: 'Team collaboration', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Priority support', included: false },
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For professional developers and small teams',
    price: '$19',
    billing: 'per month, billed annually',
    icon: Users,
    color: 'pink',
    cta: 'Start 14-day Trial',
    popular: true,
    features: [
      { text: 'Unlimited Projects', included: true },
      { text: 'Unlimited Claude sessions', included: true },
      { text: 'Advanced context persistence', included: true },
      { text: 'Priority support', included: true },
      { text: 'Private projects', included: true },
      { text: 'Team collaboration (up to 5)', included: true },
      { text: 'Basic analytics dashboard', included: true },
      { text: 'GitHub integration', included: true },
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For organizations that need scale and security',
    price: 'Custom',
    billing: 'Contact sales for pricing',
    icon: Building2,
    color: 'cyan',
    cta: 'Contact Sales',
    features: [
      { text: 'Unlimited everything', included: true },
      { text: 'Dedicated infrastructure', included: true },
      { text: 'Enterprise SSO', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Advanced security controls', included: true },
      { text: 'Unlimited team members', included: true },
      { text: 'Advanced analytics & reporting', included: true },
      { text: 'SLA & dedicated support', included: true },
    ]
  }
]

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual')

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-yellow-50/30 to-cyan-50">
      <Header />
      <div className="pt-16">
        {/* Header Section */}
        <section className="py-20 text-center">
          <div className="max-w-4xl mx-auto px-4 space-y-6">
            <Badge className="gap-1 bg-gradient-to-r from-pink-100 via-yellow-100 to-cyan-100 text-gray-800 border-pink-200">
              <Crown className="w-3 h-3" />
              Simple, Transparent Pricing
            </Badge>
            <h1 className="text-5xl font-bold">
              Choose your development pace
            </h1>
            <p className="text-xl text-muted-foreground">
              Start free and scale as you grow. No surprises, no lock-ins.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className={cn(
                "text-sm font-medium",
                billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-500'
              )}>
                Monthly
              </span>
              <button
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
                className="relative w-16 h-8 bg-gray-200 rounded-full transition-colors"
              >
                <motion.div
                  className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm"
                  animate={{ left: billingCycle === 'monthly' ? '4px' : '36px' }}
                  transition={{ type: 'spring', stiffness: 300 }}
                />
              </button>
              <span className={cn(
                "text-sm font-medium",
                billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-500'
              )}>
                Annual
                <Badge variant="secondary" className="ml-2">Save 20%</Badge>
              </span>
            </div>
          </div>
        </section>

        {/* Pricing Cards - Board Style */}
        <section className="pb-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              {pricingTiers.map((tier) => {
                const Icon = tier.icon
                const isPopular = tier.popular

                return (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="relative"
                  >
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <Badge className="bg-gradient-to-r from-pink-500 to-yellow-500 text-white border-pink-500">
                          Most Popular
                        </Badge>
                      </div>
                    )}

                    <Card className={cn(
                      "h-full overflow-hidden transition-all duration-200 hover:shadow-xl",
                      isPopular && "border-pink-500 shadow-lg shadow-pink-200/50",
                      tier.color === 'purple' && 'border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50',
                      tier.color === 'pink' && 'border-pink-200 bg-gradient-to-br from-pink-50 to-pink-100/50',
                      tier.color === 'cyan' && 'border-cyan-200 bg-gradient-to-br from-cyan-50 to-cyan-100/50',
                      tier.color === 'gray' && 'border-gray-200 bg-gray-50/50',
                      tier.color === 'blue' && 'border-blue-200 bg-blue-50/50'
                    )}>
                      <CardHeader className="text-center pb-8">
                        <div className={cn(
                          "w-12 h-12 rounded-lg mx-auto mb-4 flex items-center justify-center",
                          tier.color === 'purple' && 'bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600',
                          tier.color === 'pink' && 'bg-gradient-to-br from-pink-100 to-pink-200 text-pink-600',
                          tier.color === 'cyan' && 'bg-gradient-to-br from-cyan-100 to-cyan-200 text-cyan-600',
                          tier.color === 'gray' && 'bg-gray-100 text-gray-600',
                          tier.color === 'blue' && 'bg-blue-100 text-blue-600'
                        )}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-2xl font-bold">{tier.name}</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          {tier.description}
                        </p>
                        <div className="mt-6">
                          <div className="flex items-baseline justify-center gap-1">
                            <span className="text-4xl font-bold">{tier.price}</span>
                            {tier.id !== 'enterprise' && (
                              <span className="text-muted-foreground">/month</span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {tier.billing}
                          </p>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-6">
                        {/* Features List */}
                        <div className="space-y-3">
                          {tier.features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              {feature.included ? (
                                <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                              )}
                              <span className={cn(
                                "text-sm",
                                !feature.included && "text-gray-400"
                              )}>
                                {feature.text}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* CTA Button */}
                        <Button
                          className={cn(
                            "w-full",
                            isPopular && "bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 hover:from-cyan-500 hover:via-pink-500 hover:to-yellow-500 text-white border-0 animate-retro-gradient bg-300"
                          )}
                          variant={isPopular ? "default" : "outline"}
                        >
                          {tier.cta}
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Features Comparison */}
        <section className="py-20 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Compare Plans</h2>
              <p className="text-muted-foreground">
                See what's included in each plan
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-4 px-4">Features</th>
                    <th className="text-center py-4 px-4">Free</th>
                    <th className="text-center py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        Pro
                        <Badge size="sm" className="bg-blue-100 text-blue-800">
                          Popular
                        </Badge>
                      </div>
                    </th>
                    <th className="text-center py-4 px-4">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Projects', free: '1', pro: 'Unlimited', enterprise: 'Unlimited' },
                    { feature: 'Claude Sessions', free: 'Unlimited', pro: 'Unlimited', enterprise: 'Unlimited' },
                    { feature: 'Team Members', free: '1', pro: 'Up to 5', enterprise: 'Unlimited' },
                    { feature: 'Context Persistence', free: 'Basic', pro: 'Advanced', enterprise: 'Enterprise' },
                    { feature: 'GitHub Integration', free: false, pro: true, enterprise: true },
                    { feature: 'Analytics', free: false, pro: 'Basic', enterprise: 'Advanced' },
                    { feature: 'Priority Support', free: false, pro: true, enterprise: 'Dedicated' },
                    { feature: 'SSO', free: false, pro: false, enterprise: true },
                    { feature: 'Custom Integrations', free: false, pro: false, enterprise: true },
                    { feature: 'SLA', free: false, pro: false, enterprise: true },
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-4 px-4 font-medium">{row.feature}</td>
                      <td className="text-center py-4 px-4">
                        {typeof row.free === 'boolean' ? (
                          row.free ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm">{row.free}</span>
                        )}
                      </td>
                      <td className="text-center py-4 px-4 bg-blue-50/30">
                        {typeof row.pro === 'boolean' ? (
                          row.pro ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm">{row.pro}</span>
                        )}
                      </td>
                      <td className="text-center py-4 px-4">
                        {typeof row.enterprise === 'boolean' ? (
                          row.enterprise ? (
                            <Check className="w-5 h-5 text-green-600 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )
                        ) : (
                          <span className="text-sm">{row.enterprise}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">
                Everything you need to know about our pricing
              </p>
            </div>

            <div className="grid gap-6">
              {[
                {
                  q: 'Can I change plans anytime?',
                  a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect at the next billing cycle.'
                },
                {
                  q: 'What happens when I hit my project limit?',
                  a: 'On the free plan, you\'ll need to upgrade to create more projects. We\'ll notify you when you\'re close to the limit.'
                },
                {
                  q: 'Do you offer student discounts?',
                  a: 'Yes! Students get 50% off our Pro plan with a valid .edu email address.'
                },
                {
                  q: 'Is there a setup fee?',
                  a: 'No setup fees ever. Start for free and only pay when you\'re ready to upgrade.'
                },
                {
                  q: 'What payment methods do you accept?',
                  a: 'We accept all major credit cards, PayPal, and wire transfers for enterprise customers.'
                }
              ].map((faq, idx) => (
                <Card key={idx} className="text-left">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-3">
                      <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold mb-2">{faq.q}</h3>
                        <p className="text-sm text-muted-foreground">{faq.a}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-pink-500 via-yellow-500 to-cyan-500 text-white animate-retro-gradient bg-300">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
            <h2 className="text-4xl font-bold">
              Start building with AI that remembers
            </h2>
            <p className="text-xl text-blue-100">
              Join thousands of developers using Frizy to build faster
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-blue-50"
              >
                Start Free Forever
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-4 border-white text-white hover:bg-white/10"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Talk to Sales
              </Button>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  )
}