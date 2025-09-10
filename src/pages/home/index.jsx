import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Icon from '../../components/AppIcon';

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    // If user is already authenticated, redirect to the main app
    if (isAuthenticated) {
      navigate('/today');
    }
  }, [isAuthenticated, navigate]);

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleSignUp = () => {
    navigate('/sign-up');
  };

  const handleRequestDemo = () => {
    // Demo functionality can be implemented later
    console.log('Demo requested');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon name="Target" size={32} className="text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Pipeline Activity Tracker</h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" onClick={handleSignIn}>
                Sign In
              </Button>
              <Button onClick={handleSignUp}>
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-5xl font-bold text-foreground mb-6">
              Transform Your Sales Pipeline with 
              <span className="text-primary"> Activity Tracking</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Empower your commercial roofing teams with comprehensive CRM functionality, 
              activity logging, and performance tracking designed for sales professionals who demand results.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={handleSignUp} className="text-lg px-8 py-3">
                Get Started Free
                <Icon name="ArrowRight" size={20} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleRequestDemo} className="text-lg px-8 py-3">
                Request Demo
                <Icon name="Play" size={20} className="ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Everything You Need to Drive Sales Success
            </h3>
            <p className="text-lg text-muted-foreground">
              Built specifically for commercial roofing teams who need to track every interaction and close more deals
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-background p-6 rounded-lg border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Icon name="Activity" size={24} className="text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-3">Activity Logging</h4>
              <p className="text-muted-foreground">
                Track every call, meeting, and interaction with prospects. Never miss a follow-up again with intelligent activity tracking and reminders.
              </p>
            </div>

            <div className="bg-background p-6 rounded-lg border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Icon name="Users" size={24} className="text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-3">Team Performance</h4>
              <p className="text-muted-foreground">
                Monitor team performance with detailed metrics, goal tracking, and performance insights that help managers coach for success.
              </p>
            </div>

            <div className="bg-background p-6 rounded-lg border border-border">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Icon name="Target" size={24} className="text-primary" />
              </div>
              <h4 className="text-xl font-semibold text-foreground mb-3">CRM Functionality</h4>
              <p className="text-muted-foreground">
                Complete customer relationship management with contact organization, deal tracking, and pipeline visualization for commercial roofing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Trusted by Commercial Roofing Teams
            </h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-primary mb-2">150+</div>
              <p className="text-muted-foreground">Sales Representatives Using Daily</p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-primary mb-2">25%</div>
              <p className="text-muted-foreground">Average Increase in Close Rate</p>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
              <p className="text-muted-foreground">Uptime & Data Security</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-4xl font-bold text-primary-foreground mb-6">
              Ready to Transform Your Sales Process?
            </h3>
            <p className="text-xl text-primary-foreground/90 mb-8">
              Join commercial roofing teams who are already closing more deals with Pipeline Activity Tracker.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" onClick={handleSignUp} className="text-lg px-8 py-3">
                Start Free Trial
                <Icon name="ArrowRight" size={20} className="ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={handleRequestDemo} className="text-lg px-8 py-3 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary">
                Schedule Demo
                <Icon name="Calendar" size={20} className="ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-muted/30">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Icon name="Target" size={24} className="text-primary" />
                <span className="font-bold text-foreground">Pipeline Activity Tracker</span>
              </div>
              <p className="text-muted-foreground text-sm">
                Empowering commercial roofing teams with intelligent sales tracking and CRM functionality.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Features</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Integrations</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Contact Us</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Training</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Privacy Policy</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Terms of Service</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-foreground">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground text-sm">
              © 2025 Pipeline Activity Tracker. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;