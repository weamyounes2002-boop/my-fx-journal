import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';
import {
  BarChart3,
  TrendingUp,
  Target,
  Shield,
  Zap,
  Users,
  CheckCircle2,
  ArrowRight,
  Star,
  Menu,
  X,
  ChevronRight,
  Activity,
  PieChart,
  Calendar,
  Wallet,
  BookOpen,
  Gift,
  Calculator
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: <BarChart3 className="h-6 w-6" aria-hidden="true" />,
      title: 'Advanced Analytics',
      description: 'Deep insights into your trading performance with comprehensive charts and metrics',
      ariaLabel: 'Advanced Analytics feature'
    },
    {
      icon: <TrendingUp className="h-6 w-6" aria-hidden="true" />,
      title: 'Real-time Tracking',
      description: 'Monitor your trades in real-time with automatic synchronization from MT4/MT5',
      ariaLabel: 'Real-time Tracking feature'
    },
    {
      icon: <Target className="h-6 w-6" aria-hidden="true" />,
      title: 'Goal Setting',
      description: 'Set and track your trading goals with automated progress monitoring',
      ariaLabel: 'Goal Setting feature'
    },
    {
      icon: <Shield className="h-6 w-6" aria-hidden="true" />,
      title: 'Risk Management',
      description: 'Built-in position calculator and risk management tools to protect your capital',
      ariaLabel: 'Risk Management feature'
    },
    {
      icon: <Zap className="h-6 w-6" aria-hidden="true" />,
      title: 'AI-Powered Insights',
      description: 'Get intelligent trading insights and pattern recognition powered by AI',
      ariaLabel: 'AI-Powered Insights feature'
    },
    {
      icon: <Users className="h-6 w-6" aria-hidden="true" />,
      title: 'Multi-Account Support',
      description: 'Manage multiple trading accounts from a single dashboard',
      ariaLabel: 'Multi-Account Support feature'
    },
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started',
      features: [
        'Up to 50 trades per month',
        'Basic analytics',
        'Manual trade entry',
        '1 trading account',
        'Community support'
      ],
      cta: 'Get Started',
      popular: false
    },
    {
      name: 'Pro',
      price: '$9.99',
      period: 'per month',
      description: 'For serious traders',
      features: [
        'Unlimited trades',
        'Advanced analytics & AI insights',
        'MT4/MT5 integration',
        'Up to 5 trading accounts',
        'Goal tracking & alerts',
        'Priority support',
        'Export reports'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact us',
      description: 'For trading firms',
      features: [
        'Everything in Pro',
        'Unlimited accounts',
        'Team collaboration',
        'Custom integrations',
        'Dedicated support',
        'White-label options',
        'API access'
      ],
      cta: 'Contact Sales',
      popular: false
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Professional Forex Trader',
      content: 'My FX Journal has transformed how I track and analyze my trades. The AI insights are incredibly valuable.',
      rating: 5,
      avatar: 'SJ'
    },
    {
      name: 'Michael Chen',
      role: 'Day Trader',
      content: 'The MT5 integration is seamless. I can finally see all my performance metrics in one place.',
      rating: 5,
      avatar: 'MC'
    },
    {
      name: 'Emma Williams',
      role: 'Swing Trader',
      content: 'Best trading journal I\'ve used. The goal tracking feature keeps me accountable and focused.',
      rating: 5,
      avatar: 'EW'
    },
  ];

  const stats = [
    { value: '10,000+', label: 'Active Traders', icon: <Users className="h-5 w-5" aria-hidden="true" /> },
    { value: '1M+', label: 'Trades Tracked', icon: <Activity className="h-5 w-5" aria-hidden="true" /> },
    { value: '4.9/5', label: 'User Rating', icon: <Star className="h-5 w-5" aria-hidden="true" /> },
    { value: '95%', label: 'Satisfaction Rate', icon: <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> },
  ];

  return (
    <>
      <SEO
        title="My FX Journal - Trading Analytics & Performance Tracking Platform"
        description="Professional trading journal and analytics platform. Connect MT4/MT5 accounts, track performance, and get AI-powered insights. 14-day free trial available."
        keywords="trading journal, forex analytics, MT4, MT5, trading performance, trade tracking, forex journal, trading diary, forex trading tools, trade analysis, position calculator, trading goals, risk management"
      />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50" role="navigation" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg" aria-hidden="true">M</span>
                </div>
                <span className="text-xl font-bold text-gray-900">My FX Journal</span>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-8">
                <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
                <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
                <a href="#testimonials" className="text-gray-600 hover:text-gray-900 transition-colors">Testimonials</a>
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Log In
                </Button>
                <Button onClick={() => navigate('/signup')} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Start Free Trial
                </Button>
              </div>

              {/* Mobile Menu Button */}
              <button
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
              </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden py-4 space-y-4 border-t border-gray-200" role="menu">
                <a href="#features" className="block text-gray-600 hover:text-gray-900 transition-colors" role="menuitem">Features</a>
                <a href="#pricing" className="block text-gray-600 hover:text-gray-900 transition-colors" role="menuitem">Pricing</a>
                <a href="#testimonials" className="block text-gray-600 hover:text-gray-900 transition-colors" role="menuitem">Testimonials</a>
                <Button variant="ghost" onClick={() => navigate('/login')} className="w-full">
                  Log In
                </Button>
                <Button onClick={() => navigate('/signup')} className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                  Start Free Trial
                </Button>
              </div>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8" aria-labelledby="hero-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-4xl mx-auto">
              <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100" aria-label="New feature announcement">
                <Zap className="h-3 w-3 mr-1" aria-hidden="true" />
                Now with AI-Powered Trading Insights
              </Badge>
              <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Transform Your Trading with
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Professional Analytics</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                The most advanced trading journal and analytics platform. Track performance, analyze patterns, and improve your trading with AI-powered insights.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => navigate('/signup')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8"
                  aria-label="Start your 14-day free trial"
                >
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-lg px-8"
                  aria-label="Learn more about features"
                >
                  Learn More
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                14-day free trial • No credit card required • Cancel anytime
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
              {stats.map((stat, index) => (
                <Card key={index} className="text-center">
                  <CardContent className="pt-6">
                    <div className="flex justify-center mb-2 text-blue-600">
                      {stat.icon}
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                    <div className="text-sm text-gray-600">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white" aria-labelledby="features-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-4" aria-label="Features section">
                <Star className="h-3 w-3 mr-1" aria-hidden="true" />
                Features
              </Badge>
              <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Everything You Need to Excel
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Powerful tools designed to help you track, analyze, and improve your trading performance
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="border-2 hover:border-blue-500 transition-all hover:shadow-lg" aria-label={feature.ariaLabel}>
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Additional Features Grid */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { icon: <BookOpen className="h-5 w-5" aria-hidden="true" />, label: 'Trade Journal', description: 'Detailed trade logging' },
                { icon: <PieChart className="h-5 w-5" aria-hidden="true" />, label: 'Analytics', description: 'Performance metrics' },
                { icon: <Calendar className="h-5 w-5" aria-hidden="true" />, label: 'Calendar', description: 'Trading calendar' },
                { icon: <Wallet className="h-5 w-5" aria-hidden="true" />, label: 'Accounts', description: 'Multi-account support' },
                { icon: <Target className="h-5 w-5" aria-hidden="true" />, label: 'Goals', description: 'Goal tracking' },
                { icon: <Calculator className="h-5 w-5" aria-hidden="true" />, label: 'Calculator', description: 'Position sizing' },
                { icon: <Gift className="h-5 w-5" aria-hidden="true" />, label: 'Referrals', description: 'Earn rewards' },
                { icon: <Shield className="h-5 w-5" aria-hidden="true" />, label: 'Security', description: 'Bank-level encryption' },
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center text-center p-4" aria-label={`${item.label} - ${item.description}`}>
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-2">
                    {item.icon}
                  </div>
                  <div className="font-semibold text-sm text-gray-900">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8" aria-labelledby="pricing-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-4" aria-label="Pricing section">
                <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
                Pricing
              </Badge>
              <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Choose Your Plan
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Start free and upgrade as you grow. All plans include 14-day free trial.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {pricingPlans.map((plan, index) => (
                <Card
                  key={index}
                  className={`relative ${plan.popular ? 'border-2 border-blue-500 shadow-xl scale-105' : 'border-2'}`}
                  aria-label={`${plan.name} plan - ${plan.price} ${plan.period}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardContent className="pt-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-600 ml-2">{plan.period}</span>
                    </div>
                    <p className="text-gray-600 mb-6">{plan.description}</p>
                    <Button
                      className={`w-full mb-6 ${plan.popular ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => navigate('/signup')}
                      aria-label={`${plan.cta} for ${plan.name} plan`}
                    >
                      {plan.cta}
                      <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                    <ul className="space-y-3" role="list" aria-label={`${plan.name} plan features`}>
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <span className="text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white" aria-labelledby="testimonials-heading">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="mb-4" aria-label="Testimonials section">
                <Users className="h-3 w-3 mr-1" aria-hidden="true" />
                Testimonials
              </Badge>
              <h2 id="testimonials-heading" className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                Loved by Traders Worldwide
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                See what our users have to say about My FX Journal
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="border-2" aria-label={`Testimonial from ${testimonial.name}, ${testimonial.role}`}>
                  <CardContent className="pt-6">
                    <div className="flex gap-1 mb-4" role="img" aria-label={`${testimonial.rating} out of 5 stars`}>
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                      ))}
                    </div>
                    <p className="text-gray-600 mb-4 italic">"{testimonial.content}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold" aria-hidden="true">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{testimonial.name}</div>
                        <div className="text-sm text-gray-600">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8" aria-labelledby="cta-heading">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-gradient-to-br from-blue-600 to-purple-600 border-0 text-white">
              <CardContent className="pt-12 pb-12 text-center">
                <h2 id="cta-heading" className="text-3xl sm:text-4xl font-bold mb-4">
                  Ready to Transform Your Trading?
                </h2>
                <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                  Join thousands of traders who are already using My FX Journal to improve their performance
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => navigate('/signup')}
                    className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8"
                    aria-label="Start your free trial now"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/login')}
                    className="border-white text-white hover:bg-white/10 text-lg px-8"
                    aria-label="Sign in to your account"
                  >
                    Sign In
                  </Button>
                </div>
                <p className="text-sm text-blue-100 mt-6">
                  No credit card required • 14-day free trial • Cancel anytime
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8" role="contentinfo">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-white mb-4">Product</h3>
                <ul className="space-y-2" role="list">
                  <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#testimonials" className="hover:text-white transition-colors">Testimonials</a></li>
                  <li><a href="/signup" className="hover:text-white transition-colors">Sign Up</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-4">Company</h3>
                <ul className="space-y-2" role="list">
                  <li><a href="/about" className="hover:text-white transition-colors">About</a></li>
                  <li><a href="/blog" className="hover:text-white transition-colors">Blog</a></li>
                  <li><a href="/careers" className="hover:text-white transition-colors">Careers</a></li>
                  <li><a href="/contact" className="hover:text-white transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-4">Support</h3>
                <ul className="space-y-2" role="list">
                  <li><a href="/help" className="hover:text-white transition-colors">Help Center</a></li>
                  <li><a href="/docs" className="hover:text-white transition-colors">Documentation</a></li>
                  <li><a href="/api" className="hover:text-white transition-colors">API</a></li>
                  <li><a href="/status" className="hover:text-white transition-colors">Status</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-4">Legal</h3>
                <ul className="space-y-2" role="list">
                  <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                  <li><a href="/cookies" className="hover:text-white transition-colors">Cookie Policy</a></li>
                  <li><a href="/security" className="hover:text-white transition-colors">Security</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center gap-2 mb-4 md:mb-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg" aria-hidden="true">M</span>
                </div>
                <span className="text-white font-semibold">My FX Journal</span>
              </div>
              <p className="text-sm">© 2025 My FX Journal. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}